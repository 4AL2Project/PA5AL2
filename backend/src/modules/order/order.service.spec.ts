// Cahier de tests : historique OrderActivity (qui a traité une commande et quand)
// Couvre : startPreparation, markReady, withdraw, cancel, expireOverdueOrders

import { EventEmitter2 } from '@nestjs/event-emitter';

import { OrderService } from './order.service';

jest.mock('../../database/client', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    orderLine: {
      findMany: jest.fn(),
    },
    orderActivity: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    product: { update: jest.fn() },
    customer: { findUniqueOrThrow: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: {
    order: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    orderLine: { findMany: jest.Mock };
    orderActivity: { create: jest.Mock; createMany: jest.Mock };
    product: { update: jest.Mock };
    customer: { findUniqueOrThrow: jest.Mock };
  };
};

const PHARMACY_ID = 'pharma-uuid-1';
const ORDER_ID = 'order-uuid-1';
const CUSTOMER_ID = 'customer-uuid-1';
const PREPARATEUR_ID = 'user-uuid-1';

function makeOrder(status: string, overrides: Record<string, unknown> = {}) {
  return {
    order_id: ORDER_ID,
    pharmacy_id: PHARMACY_ID,
    customer_id: CUSTOMER_ID,
    status,
    ...overrides,
  };
}

const LINE_FIXTURE = {
  quantity: 2,
  offer: { product: { name: 'Crème' } },
};

function makeEventEmitter(): jest.Mocked<Pick<EventEmitter2, 'emit'>> {
  return { emit: jest.fn() };
}

describe('OrderService — historique OrderActivity', () => {
  let service: OrderService;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  beforeEach(() => {
    jest.clearAllMocks();
    eventEmitter = makeEventEmitter();
    service = new OrderService(eventEmitter as unknown as EventEmitter2);
  });

  it('startPreparation enregistre une activité EN_PREPARATION avec l’acteur', async () => {
    prisma.order.findUnique.mockResolvedValue(makeOrder('RESERVEE'));
    prisma.order.update.mockResolvedValue(makeOrder('EN_PREPARATION'));

    await service.startPreparation(PHARMACY_ID, ORDER_ID, PREPARATEUR_ID);

    expect(prisma.orderActivity.create).toHaveBeenCalledWith({
      data: {
        order_id: ORDER_ID,
        action: 'EN_PREPARATION',
        actor_id: PREPARATEUR_ID,
      },
    });
  });

  it('markReady enregistre une activité PRETE avec l’acteur', async () => {
    prisma.order.findUnique.mockResolvedValue(makeOrder('EN_PREPARATION'));
    prisma.order.update.mockResolvedValue(makeOrder('PRETE'));
    prisma.customer.findUniqueOrThrow.mockResolvedValue({
      email: 'client@test.fr',
      first_name: 'Jean',
      last_name: 'Dupont',
    });
    prisma.order.findUniqueOrThrow.mockResolvedValue({
      order_id: ORDER_ID,
      qr_code: 'qr-uuid-1',
      pharmacy: { name: 'Pharmacie Test' },
      lines: [LINE_FIXTURE],
    });

    await service.markReady(PHARMACY_ID, ORDER_ID, PREPARATEUR_ID);

    expect(prisma.orderActivity.create).toHaveBeenCalledWith({
      data: { order_id: ORDER_ID, action: 'PRETE', actor_id: PREPARATEUR_ID },
    });
  });

  it('withdraw enregistre une activité RETIREE avec l’acteur', async () => {
    prisma.order.findUnique.mockResolvedValue(makeOrder('PRETE'));
    prisma.order.update.mockResolvedValue(makeOrder('RETIREE'));
    prisma.orderLine.findMany.mockResolvedValue([
      { quantity: 2, offer: { product_id: 'product-uuid-1' } },
    ]);
    prisma.product.update.mockResolvedValue({});

    await service.withdraw(PHARMACY_ID, ORDER_ID, PREPARATEUR_ID);

    expect(prisma.orderActivity.create).toHaveBeenCalledWith({
      data: { order_id: ORDER_ID, action: 'RETIREE', actor_id: PREPARATEUR_ID },
    });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { product_id: 'product-uuid-1' },
      data: { stock_quantity: { decrement: 2 } },
    });
  });

  it('cancel (pharmacie) enregistre une activité ANNULEE avec l’acteur', async () => {
    prisma.order.findUnique.mockResolvedValue({
      ...makeOrder('RESERVEE'),
      customer: { email: 'a@b.fr', first_name: 'A', last_name: 'B' },
      pharmacy: { name: 'Pharmacie Test' },
      lines: [LINE_FIXTURE],
    });
    prisma.order.update.mockResolvedValue(makeOrder('ANNULEE'));

    await service.cancel(
      ORDER_ID,
      PHARMACY_ID,
      'pharmacy',
      PHARMACY_ID,
      PREPARATEUR_ID
    );

    expect(prisma.orderActivity.create).toHaveBeenCalledWith({
      data: { order_id: ORDER_ID, action: 'ANNULEE', actor_id: PREPARATEUR_ID },
    });
  });

  it('cancel (customer) enregistre une activité ANNULEE sans acteur (actor_id null)', async () => {
    prisma.order.findUnique.mockResolvedValue({
      ...makeOrder('RESERVEE'),
      customer: { email: 'a@b.fr', first_name: 'A', last_name: 'B' },
      pharmacy: { name: 'Pharmacie Test' },
      lines: [LINE_FIXTURE],
    });
    prisma.order.update.mockResolvedValue(makeOrder('ANNULEE'));

    await service.cancel(ORDER_ID, CUSTOMER_ID, 'customer');

    expect(prisma.orderActivity.create).toHaveBeenCalledWith({
      data: { order_id: ORDER_ID, action: 'ANNULEE', actor_id: null },
    });
  });

  it('expireOverdueOrders enregistre une activité EXPIREE sans acteur (action système)', async () => {
    prisma.order.findMany.mockResolvedValue([
      {
        ...makeOrder('RESERVEE'),
        customer: { email: 'a@b.fr', first_name: 'A', last_name: 'B' },
        pharmacy: { name: 'Pharmacie Test' },
        lines: [LINE_FIXTURE],
      },
    ]);
    prisma.order.updateMany.mockResolvedValue({ count: 1 });

    await service.expireOverdueOrders();

    expect(prisma.orderActivity.createMany).toHaveBeenCalledWith({
      data: [{ order_id: ORDER_ID, action: 'EXPIREE', actor_id: null }],
    });
  });
});
