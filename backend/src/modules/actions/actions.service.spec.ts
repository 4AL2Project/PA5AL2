// Cahier de tests US-42 — Centre d'actions
// Couvre : listing, machine à états, isolation tenant, snooze 48 h

import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ActionsService } from './actions.service';

jest.mock('../../database/client', () => ({
  prisma: {
    action: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: {
    action: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
};

const PHARMACY_ID = 'pharma-uuid-1';
const OTHER_PHARMACY_ID = 'pharma-uuid-2';
const ACTION_ID = 'action-uuid-1';
const PRODUCT_ID = 'prod-uuid-1';

function makeAction(status: string, overrides: Record<string, unknown> = {}) {
  return {
    action_id: ACTION_ID,
    product_id: PRODUCT_ID,
    pharmacy_id: PHARMACY_ID,
    type: 'DON',
    status,
    snooze_until: null,
    days_of_cover: 250,
    capital_locked: 1200,
    recoverable_value: 900,
    ...overrides,
    product: {
      name: 'Crème anti-âge',
      external_sku: 'SKU-001',
      category: 'Soins visage',
      brand: 'Avène',
      stock_quantity: 40,
      unit_price: 30,
    },
  };
}

// ---------------------------------------------------------------------------
// BLOC 1 — Listing des actions en attente
// ---------------------------------------------------------------------------
describe('ActionsService — listPending (US-42)', () => {
  let service: ActionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActionsService();
  });

  it('retourne les actions EN_ATTENTE de la pharmacie triées par capital_locked décroissant', async () => {
    const actions = [
      makeAction('EN_ATTENTE', { capital_locked: 1500 }),
      makeAction('EN_ATTENTE', {
        action_id: 'action-uuid-2',
        capital_locked: 800,
      }),
    ];
    prisma.action.findMany.mockResolvedValue(actions);

    const result = await service.listPending(PHARMACY_ID);

    expect(prisma.action.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ pharmacy_id: PHARMACY_ID }),
        orderBy: { capital_locked: 'desc' },
      })
    );
    expect(result).toHaveLength(2);
  });

  it('inclut les actions SNOOZEE dont le snooze_until est expiré', async () => {
    const expiredSnooze = makeAction('SNOOZEE', {
      snooze_until: new Date(Date.now() - 1000),
    });
    prisma.action.findMany.mockResolvedValue([expiredSnooze]);

    const result = await service.listPending(PHARMACY_ID);

    expect(result).toHaveLength(1);
    expect(prisma.action.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ status: 'SNOOZEE' }),
          ]),
        }),
      })
    );
  });

  it('retourne une liste vide si aucun produit dormant', async () => {
    prisma.action.findMany.mockResolvedValue([]);

    const result = await service.listPending(PHARMACY_ID);
    expect(result).toHaveLength(0);
  });

  it("n'inclut pas les actions IGNOREE dans la liste principale", async () => {
    prisma.action.findMany.mockResolvedValue([]);

    await service.listPending(PHARMACY_ID);

    const whereArg = prisma.action.findMany.mock.calls[0][0].where;
    // IGNOREE ne doit pas figurer dans les statuts filtrés
    const orStatuses = (whereArg.OR as Array<{ status?: string }>).map(
      (c) => c.status
    );
    expect(orStatuses).not.toContain('IGNOREE');
  });
});

// ---------------------------------------------------------------------------
// BLOC 2 — Valider une action
// ---------------------------------------------------------------------------
describe('ActionsService — validate (US-42)', () => {
  let service: ActionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActionsService();
  });

  it('valide une action EN_ATTENTE → statut passe à VALIDEE', async () => {
    prisma.action.findFirst.mockResolvedValue(makeAction('EN_ATTENTE'));
    prisma.action.update.mockResolvedValue(makeAction('VALIDEE'));

    const result = await service.validate(ACTION_ID, PHARMACY_ID);
    expect(result.status).toBe('VALIDEE');
    expect(prisma.action.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'VALIDEE' }),
      })
    );
  });

  it("lève NotFoundException si l'action n'appartient pas à la pharmacie", async () => {
    prisma.action.findFirst.mockResolvedValue(null);

    await expect(
      service.validate(ACTION_ID, OTHER_PHARMACY_ID)
    ).rejects.toThrow(NotFoundException);
  });

  it('lève BadRequestException si la transition IGNOREE → VALIDEE est tentée directement', async () => {
    prisma.action.findFirst.mockResolvedValue(makeAction('IGNOREE'));

    await expect(service.validate(ACTION_ID, PHARMACY_ID)).rejects.toThrow(
      BadRequestException
    );
  });
});

// ---------------------------------------------------------------------------
// BLOC 3 — Ignorer une action
// ---------------------------------------------------------------------------
describe('ActionsService — ignore (US-42)', () => {
  let service: ActionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActionsService();
  });

  it('ignore une action EN_ATTENTE → statut passe à IGNOREE (produit sort de la liste principale)', async () => {
    prisma.action.findFirst.mockResolvedValue(makeAction('EN_ATTENTE'));
    prisma.action.update.mockResolvedValue(makeAction('IGNOREE'));

    const result = await service.ignore(ACTION_ID, PHARMACY_ID);
    expect(result.status).toBe('IGNOREE');
  });

  it("lève NotFoundException si l'action n'appartient pas à la pharmacie", async () => {
    prisma.action.findFirst.mockResolvedValue(null);

    await expect(service.ignore(ACTION_ID, OTHER_PHARMACY_ID)).rejects.toThrow(
      NotFoundException
    );
  });

  it('lève BadRequestException si la transition VALIDEE → IGNOREE est tentée directement', async () => {
    prisma.action.findFirst.mockResolvedValue(makeAction('VALIDEE'));

    await expect(service.ignore(ACTION_ID, PHARMACY_ID)).rejects.toThrow(
      BadRequestException
    );
  });
});

// ---------------------------------------------------------------------------
// BLOC 4 — Snooze 48 h
// ---------------------------------------------------------------------------
describe('ActionsService — snooze (US-42)', () => {
  let service: ActionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActionsService();
  });

  it('snoooze une action EN_ATTENTE → statut SNOOZEE avec snooze_until dans ~48 h', async () => {
    prisma.action.findFirst.mockResolvedValue(makeAction('EN_ATTENTE'));
    prisma.action.update.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(
          makeAction('SNOOZEE', { snooze_until: data['snooze_until'] })
        )
    );

    const before = new Date();
    const result = await service.snooze(ACTION_ID, PHARMACY_ID);
    const after = new Date();

    expect(result.status).toBe('SNOOZEE');
    const snoozeUntil = result.snooze_until as Date;
    const diffHours = (snoozeUntil.getTime() - before.getTime()) / 1000 / 3600;
    expect(diffHours).toBeGreaterThanOrEqual(47.9);
    expect(diffHours).toBeLessThanOrEqual(48.1);
    expect(snoozeUntil.getTime()).toBeLessThanOrEqual(
      after.getTime() + 48 * 3600 * 1000 + 1000
    );
  });

  it("lève NotFoundException si l'action n'appartient pas à la pharmacie", async () => {
    prisma.action.findFirst.mockResolvedValue(null);

    await expect(service.snooze(ACTION_ID, OTHER_PHARMACY_ID)).rejects.toThrow(
      NotFoundException
    );
  });

  it('lève BadRequestException si la transition VALIDEE → SNOOZEE est tentée', async () => {
    prisma.action.findFirst.mockResolvedValue(makeAction('VALIDEE'));

    await expect(service.snooze(ACTION_ID, PHARMACY_ID)).rejects.toThrow(
      BadRequestException
    );
  });
});

// ---------------------------------------------------------------------------
// BLOC 5 — Reset (annuler ignore / snooze)
// ---------------------------------------------------------------------------
describe('ActionsService — resetToEnAttente (US-42)', () => {
  let service: ActionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActionsService();
  });

  it('remet en attente une action IGNOREE', async () => {
    prisma.action.findFirst.mockResolvedValue(makeAction('IGNOREE'));
    prisma.action.update.mockResolvedValue(makeAction('EN_ATTENTE'));

    const result = await service.resetToEnAttente(ACTION_ID, PHARMACY_ID);
    expect(result.status).toBe('EN_ATTENTE');
  });

  it('remet en attente une action SNOOZEE (annuler le snooze)', async () => {
    prisma.action.findFirst.mockResolvedValue(
      makeAction('SNOOZEE', {
        snooze_until: new Date(Date.now() + 10 * 3600 * 1000),
      })
    );
    prisma.action.update.mockResolvedValue(makeAction('EN_ATTENTE'));

    const result = await service.resetToEnAttente(ACTION_ID, PHARMACY_ID);
    expect(result.status).toBe('EN_ATTENTE');
  });

  it('lève BadRequestException si la transition EN_ATTENTE → EN_ATTENTE est tentée', async () => {
    prisma.action.findFirst.mockResolvedValue(makeAction('EN_ATTENTE'));

    await expect(
      service.resetToEnAttente(ACTION_ID, PHARMACY_ID)
    ).rejects.toThrow(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// BLOC 6 — Machine à états complète (transitions autorisées / interdites)
// ---------------------------------------------------------------------------
describe('ActionsService — machine à états complète (US-42)', () => {
  let service: ActionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActionsService();
  });

  // EN_ATTENTE → [VALIDEE, IGNOREE, SNOOZEE] | SNOOZEE → [VALIDEE, IGNOREE, EN_ATTENTE]
  // VALIDEE → [EN_ATTENTE]                  | IGNOREE → [EN_ATTENTE]
  const forbiddenTransitions: Array<{
    from: string;
    action: (s: ActionsService) => Promise<unknown>;
    label: string;
  }> = [
    {
      from: 'VALIDEE',
      action: (s) => s.ignore(ACTION_ID, PHARMACY_ID),
      label: 'VALIDEE → IGNOREE',
    },
    {
      from: 'VALIDEE',
      action: (s) => s.snooze(ACTION_ID, PHARMACY_ID),
      label: 'VALIDEE → SNOOZEE',
    },
    {
      from: 'IGNOREE',
      action: (s) => s.validate(ACTION_ID, PHARMACY_ID),
      label: 'IGNOREE → VALIDEE',
    },
    {
      from: 'IGNOREE',
      action: (s) => s.snooze(ACTION_ID, PHARMACY_ID),
      label: 'IGNOREE → SNOOZEE',
    },
    {
      from: 'EN_ATTENTE',
      action: (s) => s.resetToEnAttente(ACTION_ID, PHARMACY_ID),
      label: 'EN_ATTENTE → EN_ATTENTE',
    },
  ];

  forbiddenTransitions.forEach(({ from, action, label }) => {
    it(`lève BadRequestException pour la transition interdite ${label}`, async () => {
      prisma.action.findFirst.mockResolvedValue(makeAction(from));
      await expect(action(service)).rejects.toThrow(BadRequestException);
    });
  });
});
