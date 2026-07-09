// Cahier de tests : historique OrderActivity (qui a traité une commande et quand)
// Couvre : startPreparation, markReady, withdraw, cancel, expireOverdueOrders

import { INotificationService } from '../notification/notification.interface';
import { OrderService } from './order.service';

jest.mock('../../database/client', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    },
    orderActivity: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    offer: { findUniqueOrThrow: jest.fn() },
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
      update: jest.Mock;
      updateMany: jest.Mock;
      aggregate: jest.Mock;
    };
    orderActivity: { create: jest.Mock; createMany: jest.Mock };
    offer: { findUniqueOrThrow: jest.Mock };
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
    offer_id: 'offer-uuid-1',
    quantity: 2,
    status,
    ...overrides,
  };
}

function makeNotifications(): jest.Mocked<INotificationService> {
  return {
    orderConfirmed: jest.fn().mockResolvedValue(undefined),
    orderReady: jest.fn().mockResolvedValue(undefined),
    orderCancelled: jest.fn().mockResolvedValue(undefined),
    newOrderForPrep: jest.fn().mockResolvedValue(undefined),
  };
}

describe('OrderService — historique OrderActivity', () => {
  let service: OrderService;
  let notifications: jest.Mocked<INotificationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    notifications = makeNotifications();
    service = new OrderService(notifications);
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
    prisma.offer.findUniqueOrThrow.mockResolvedValue({
      offer_id: 'offer-uuid-1',
      product: { name: 'Crème' },
      pharmacy: { name: 'Pharmacie Test' },
    });

    await service.markReady(PHARMACY_ID, ORDER_ID, PREPARATEUR_ID);

    expect(prisma.orderActivity.create).toHaveBeenCalledWith({
      data: { order_id: ORDER_ID, action: 'PRETE', actor_id: PREPARATEUR_ID },
    });
  });

  it('withdraw enregistre une activité RETIREE avec l’acteur', async () => {
    prisma.order.findUnique.mockResolvedValue(makeOrder('PRETE'));
    prisma.order.update.mockResolvedValue(makeOrder('RETIREE'));
    prisma.offer.findUniqueOrThrow.mockResolvedValue({
      offer_id: 'offer-uuid-1',
      product_id: 'product-uuid-1',
    });
    prisma.product.update.mockResolvedValue({});

    await service.withdraw(PHARMACY_ID, ORDER_ID, PREPARATEUR_ID);

    expect(prisma.orderActivity.create).toHaveBeenCalledWith({
      data: { order_id: ORDER_ID, action: 'RETIREE', actor_id: PREPARATEUR_ID },
    });
  });

  it('cancel (pharmacie) enregistre une activité ANNULEE avec l’acteur', async () => {
    prisma.order.findUnique.mockResolvedValue({
      ...makeOrder('RESERVEE'),
      customer: { email: 'a@b.fr', first_name: 'A', last_name: 'B' },
      offer: {
        product: { name: 'Crème' },
        pharmacy: { name: 'Pharmacie Test' },
      },
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
      offer: {
        product: { name: 'Crème' },
        pharmacy: { name: 'Pharmacie Test' },
      },
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
        offer: {
          product: { name: 'Crème' },
          pharmacy: { name: 'Pharmacie Test' },
        },
      },
    ]);
    prisma.order.updateMany.mockResolvedValue({ count: 1 });

    await service.expireOverdueOrders();

    expect(prisma.orderActivity.createMany).toHaveBeenCalledWith({
      data: [{ order_id: ORDER_ID, action: 'EXPIREE', actor_id: null }],
    });
  });
});
