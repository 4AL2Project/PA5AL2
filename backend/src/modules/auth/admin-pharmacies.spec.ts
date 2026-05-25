/**
 * US-64-Auth -- POST /api/admin/pharmacies
 */
import { ConflictException, ForbiddenException } from '@nestjs/common';

import { AdminService } from './admin.service';
import { EmailService } from './email.service';
import { UserRole } from './roles.enum';

// --- Mocks -------------------------------------------------------------------
jest.mock('../../database/client', () => ({
  prisma: {
    pharmacy: { create: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn() },
    authToken: { create: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: {
    pharmacy: { create: jest.Mock; findMany: jest.Mock };
    user: { findUnique: jest.Mock; create: jest.Mock };
    authToken: { create: jest.Mock };
  };
};

const emailMock = { sendInvitationEmail: jest.fn() };

// --- Tests -------------------------------------------------------------------
describe('AdminService.createPharmacyWithTitulaire', () => {
  let service: AdminService;

  const validPharmacy = {
    name: 'Pharmacie du Centre',
    address: '12 rue de la Paix, 75001 Paris',
    siret: '12345678901234',
  };
  const validTitulaire = {
    first_name: 'Marie',
    last_name: 'Dupont',
    email: 'marie.dupont@pharma-centre.fr',
    phone: '0612345678',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(emailMock as unknown as EmailService);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.pharmacy.create.mockResolvedValue({
      pharmacy_id: 'pharma-uuid',
      ...validPharmacy,
      email: validTitulaire.email,
    });
    prisma.user.create.mockResolvedValue({
      user_id: 'user-uuid',
      email: validTitulaire.email,
      status: 'PENDING',
      role: UserRole.TITULAIRE,
    });
    prisma.authToken.create.mockResolvedValue({ id: 'token-uuid' });
    emailMock.sendInvitationEmail.mockResolvedValue(undefined);
  });

  it("cree pharmacie + titulaire PENDING et envoie l'email avec le lien onboarding", async () => {
    const result = (await service.createPharmacyWithTitulaire(
      validPharmacy,
      validTitulaire,
      UserRole.ADMIN_SAVELY
    )) as Record<string, unknown>;

    expect(prisma.pharmacy.create).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: validTitulaire.email,
          role: UserRole.TITULAIRE,
          status: 'PENDING',
          password: null,
        }),
      })
    );
    expect(emailMock.sendInvitationEmail).toHaveBeenCalledWith(
      validTitulaire.email,
      expect.stringContaining('onboarding?token=')
    );
    expect(result).not.toHaveProperty('token');
    expect(result).toHaveProperty('pharmacy_id');
  });

  it('stocke uniquement le hash SHA-256 du token, jamais le token en clair', async () => {
    await service.createPharmacyWithTitulaire(
      validPharmacy,
      validTitulaire,
      UserRole.ADMIN_SAVELY
    );
    const createCall = prisma.authToken.create.mock.calls[0][0];
    expect(createCall.data).toHaveProperty('token_hash');
    expect(createCall.data).not.toHaveProperty('token');
    expect(createCall.data.token_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('fixe une TTL de 48h pour le token invitation', async () => {
    const before = Date.now();
    await service.createPharmacyWithTitulaire(
      validPharmacy,
      validTitulaire,
      UserRole.ADMIN_SAVELY
    );
    const createCall = prisma.authToken.create.mock.calls[0][0];
    const expiresAt: Date = createCall.data.expires_at;
    const diffHours = (expiresAt.getTime() - before) / (1000 * 60 * 60);
    expect(diffHours).toBeGreaterThanOrEqual(47.9);
    expect(diffHours).toBeLessThanOrEqual(48.1);
  });

  it('leve ConflictException si un utilisateur existe deja avec cet email', async () => {
    prisma.user.findUnique.mockResolvedValue({ user_id: 'existing' });
    await expect(
      service.createPharmacyWithTitulaire(
        validPharmacy,
        validTitulaire,
        UserRole.ADMIN_SAVELY
      )
    ).rejects.toThrow(ConflictException);
    expect(emailMock.sendInvitationEmail).not.toHaveBeenCalled();
  });

  it('leve ForbiddenException si le role acteur nest pas ADMIN_SAVELY', async () => {
    await expect(
      service.createPharmacyWithTitulaire(
        validPharmacy,
        validTitulaire,
        UserRole.TITULAIRE
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it('force le role TITULAIRE quel que soit le payload recu', async () => {
    await service.createPharmacyWithTitulaire(
      validPharmacy,
      validTitulaire,
      UserRole.ADMIN_SAVELY
    );
    const createCall = prisma.user.create.mock.calls[0][0];
    expect(createCall.data.role).toBe(UserRole.TITULAIRE);
  });
});

describe('AdminService.listPharmacies', () => {
  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(emailMock as unknown as EmailService);
  });

  it('leve ForbiddenException si le role acteur nest pas ADMIN_SAVELY', async () => {
    await expect(
      service.listPharmacies(UserRole.TITULAIRE, 'any-id')
    ).rejects.toThrow(ForbiddenException);
  });

  it('exclut la pharmacie de l acteur et inclut le premier titulaire', async () => {
    prisma.pharmacy.findMany.mockResolvedValue([
      {
        pharmacy_id: 'p1',
        name: 'Pharma A',
        address: '1 rue X',
        siret: '111',
        created_at: new Date('2026-05-01'),
        users: [
          {
            first_name: 'Marie',
            last_name: 'Dupont',
            email: 'marie@a.fr',
            phone: '0600000001',
            status: 'PENDING',
          },
        ],
      },
      {
        pharmacy_id: 'p2',
        name: 'Pharma B',
        address: null,
        siret: null,
        created_at: new Date('2026-04-01'),
        users: [],
      },
    ]);

    const result = await service.listPharmacies(
      UserRole.ADMIN_SAVELY,
      'admin-pharmacy-id'
    );

    expect(prisma.pharmacy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { NOT: { pharmacy_id: 'admin-pharmacy-id' } },
        orderBy: { created_at: 'desc' },
      })
    );
    expect(result.pharmacies).toHaveLength(2);
    expect(result.pharmacies[0]).toMatchObject({
      pharmacy_id: 'p1',
      titulaire: { email: 'marie@a.fr', status: 'PENDING' },
    });
    expect(result.pharmacies[1].titulaire).toBeNull();
  });
});
