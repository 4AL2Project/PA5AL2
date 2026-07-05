/**
 * US-64-Auth -- POST /api/admin/pharmacies
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { UserRole } from '../auth/roles.enum';
import { EmailService } from '../email/email.service';
import { AdminService } from './admin.service';

// --- Mocks -------------------------------------------------------------------
jest.mock('../../database/client', () => {
  const client = {
    pharmacy: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    authToken: { create: jest.fn(), deleteMany: jest.fn() },
    // Supporte les deux formes: $transaction(cb) et $transaction([...])
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)(client)
        : Promise.all(arg as Promise<unknown>[])
    ),
  };
  return { prisma: client };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: {
    pharmacy: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    authToken: { create: jest.Mock; deleteMany: jest.Mock };
    $transaction: jest.Mock;
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

describe('AdminService.getPharmacy', () => {
  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(emailMock as unknown as EmailService);
  });

  it('leve ForbiddenException si le role acteur nest pas ADMIN_SAVELY', async () => {
    await expect(service.getPharmacy('p1', UserRole.TITULAIRE)).rejects.toThrow(
      ForbiddenException
    );
    expect(prisma.pharmacy.findUnique).not.toHaveBeenCalled();
  });

  it('leve NotFoundException si l officine n existe pas', async () => {
    prisma.pharmacy.findUnique.mockResolvedValue(null);
    await expect(
      service.getPharmacy('inconnue', UserRole.ADMIN_SAVELY)
    ).rejects.toThrow(NotFoundException);
  });

  it('separe le titulaire et les preparateurs par role', async () => {
    prisma.pharmacy.findUnique.mockResolvedValue({
      pharmacy_id: 'p1',
      name: 'Pharma A',
      address: '1 rue X',
      siret: '111',
      status: 'ACTIVE',
      created_at: new Date('2026-05-01'),
      users: [
        {
          user_id: 'u-titulaire',
          first_name: 'Marie',
          last_name: 'Dupont',
          email: 'marie@a.fr',
          phone: '0600000001',
          status: 'ACTIVE',
          role: UserRole.TITULAIRE,
        },
        {
          user_id: 'u-prepa',
          first_name: 'Jean',
          last_name: 'Martin',
          email: 'jean@a.fr',
          phone: '0600000002',
          status: 'ACTIVE',
          role: UserRole.PREPARATEUR,
        },
      ],
    });

    const result = await service.getPharmacy('p1', UserRole.ADMIN_SAVELY);

    expect(prisma.pharmacy.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { pharmacy_id: 'p1' } })
    );
    expect(result).toMatchObject({
      pharmacy_id: 'p1',
      status: 'ACTIVE',
      titulaire: { email: 'marie@a.fr', status: 'ACTIVE' },
    });
    expect(result.preparateurs).toEqual([
      expect.objectContaining({ user_id: 'u-prepa', email: 'jean@a.fr' }),
    ]);
  });

  it('retourne titulaire null et preparateurs vide quand aucun utilisateur', async () => {
    prisma.pharmacy.findUnique.mockResolvedValue({
      pharmacy_id: 'p2',
      name: 'Pharma B',
      address: null,
      siret: null,
      status: 'INACTIVE',
      created_at: new Date('2026-04-01'),
      users: [],
    });

    const result = await service.getPharmacy('p2', UserRole.ADMIN_SAVELY);
    expect(result.titulaire).toBeNull();
    expect(result.preparateurs).toEqual([]);
  });
});

describe('AdminService.updatePharmacy', () => {
  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(emailMock as unknown as EmailService);
    // Sert l'appel de updatePharmacy ET le getPharmacy final (meme objet).
    prisma.pharmacy.findUnique.mockResolvedValue({
      pharmacy_id: 'p1',
      name: 'Nouveau nom',
      address: '1 rue X',
      siret: '111',
      status: 'ACTIVE',
      created_at: new Date('2026-05-01'),
      users: [{ user_id: 'u-titulaire', email: 'marie@a.fr' }],
    });
  });

  it('met a jour officine + titulaire dans une transaction', async () => {
    await service.updatePharmacy('p1', UserRole.ADMIN_SAVELY, {
      pharmacy: { name: 'Nouveau nom' },
      titulaire: { phone: '0699999999' },
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.pharmacy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { pharmacy_id: 'p1' },
        data: expect.objectContaining({ name: 'Nouveau nom' }),
      })
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 'u-titulaire' },
        data: expect.objectContaining({ phone: '0699999999' }),
      })
    );
  });

  it('leve ConflictException si le nouvel email titulaire est deja pris', async () => {
    prisma.user.findUnique.mockResolvedValue({ user_id: 'autre' });
    await expect(
      service.updatePharmacy('p1', UserRole.ADMIN_SAVELY, {
        titulaire: { email: 'pris@a.fr' },
      })
    ).rejects.toThrow(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('AdminService.setPharmacyStatus', () => {
  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(emailMock as unknown as EmailService);
  });

  it('desactive une officine et renvoie le detail', async () => {
    // Sert ensureExists ET le getPharmacy final.
    prisma.pharmacy.findUnique.mockResolvedValue({
      pharmacy_id: 'p1',
      name: 'Pharma A',
      address: null,
      siret: null,
      status: 'INACTIVE',
      created_at: new Date('2026-05-01'),
      users: [],
    });

    const result = await service.setPharmacyStatus(
      'p1',
      UserRole.ADMIN_SAVELY,
      'INACTIVE'
    );

    expect(prisma.pharmacy.update).toHaveBeenCalledWith({
      where: { pharmacy_id: 'p1' },
      data: { status: 'INACTIVE' },
    });
    expect(result.status).toBe('INACTIVE');
  });

  it('leve NotFoundException si l officine n existe pas', async () => {
    prisma.pharmacy.findUnique.mockResolvedValue(null);
    await expect(
      service.setPharmacyStatus('x', UserRole.ADMIN_SAVELY, 'ACTIVE')
    ).rejects.toThrow(NotFoundException);
    expect(prisma.pharmacy.update).not.toHaveBeenCalled();
  });
});

describe('AdminService.resendInvitation', () => {
  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(emailMock as unknown as EmailService);
    emailMock.sendInvitationEmail.mockResolvedValue(undefined);
    prisma.authToken.create.mockResolvedValue({ id: 't' });
  });

  it('regenere un token et renvoie le mail pour un gerant PENDING', async () => {
    prisma.pharmacy.findUnique.mockResolvedValue({
      pharmacy_id: 'p1',
      users: [{ user_id: 'u1', email: 'marie@a.fr', status: 'PENDING' }],
    });

    await service.resendInvitation('p1', UserRole.ADMIN_SAVELY);

    expect(prisma.authToken.create).toHaveBeenCalledTimes(1);
    expect(emailMock.sendInvitationEmail).toHaveBeenCalledWith(
      'marie@a.fr',
      expect.stringContaining('onboarding?token=')
    );
  });

  it('refuse de renvoyer si le gerant est deja ACTIVE', async () => {
    prisma.pharmacy.findUnique.mockResolvedValue({
      pharmacy_id: 'p1',
      users: [{ user_id: 'u1', email: 'marie@a.fr', status: 'ACTIVE' }],
    });

    await expect(
      service.resendInvitation('p1', UserRole.ADMIN_SAVELY)
    ).rejects.toThrow(BadRequestException);
    expect(emailMock.sendInvitationEmail).not.toHaveBeenCalled();
  });
});

describe('AdminService preparateurs', () => {
  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(emailMock as unknown as EmailService);
  });

  const prepa = {
    first_name: 'Jean',
    last_name: 'Martin',
    email: 'jean@a.fr',
    phone: '0612345678',
  };

  it("cree un preparateur PENDING (email seul) et envoie l'invitation", async () => {
    prisma.pharmacy.findUnique.mockResolvedValue({ pharmacy_id: 'p1' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      user_id: 'u-prepa',
      email: prepa.email,
      first_name: null,
      last_name: null,
      phone: null,
      status: 'PENDING',
    });

    await service.addPreparateur('p1', UserRole.ADMIN_SAVELY, {
      email: prepa.email,
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pharmacy_id: 'p1',
          email: prepa.email,
          role: UserRole.PREPARATEUR,
          status: 'PENDING',
          password: null,
          first_name: null,
        }),
      })
    );
    expect(prisma.authToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'INVITATION' }),
      })
    );
    expect(emailMock.sendInvitationEmail).toHaveBeenCalledWith(
      prepa.email,
      expect.stringContaining('/preparateur/onboarding?token=')
    );
  });

  it('leve ConflictException si l email du preparateur existe deja', async () => {
    prisma.pharmacy.findUnique.mockResolvedValue({ pharmacy_id: 'p1' });
    prisma.user.findUnique.mockResolvedValue({ user_id: 'autre' });
    await expect(
      service.addPreparateur('p1', UserRole.ADMIN_SAVELY, {
        email: prepa.email,
      })
    ).rejects.toThrow(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('refuse de modifier un utilisateur qui n est pas un preparateur de l officine', async () => {
    prisma.user.findUnique.mockResolvedValue({
      user_id: 'u1',
      pharmacy_id: 'p1',
      role: UserRole.TITULAIRE,
    });
    await expect(
      service.updatePreparateur('p1', UserRole.ADMIN_SAVELY, 'u1', {
        phone: '0600000000',
      })
    ).rejects.toThrow(NotFoundException);
  });

  it('desactive le compte d un preparateur', async () => {
    prisma.user.findUnique.mockResolvedValue({
      user_id: 'u-prepa',
      pharmacy_id: 'p1',
      role: UserRole.PREPARATEUR,
      password: 'hash',
    });
    prisma.user.update.mockResolvedValue({
      user_id: 'u-prepa',
      status: 'INACTIVE',
    });

    await service.setPreparateurStatus(
      'p1',
      UserRole.ADMIN_SAVELY,
      'u-prepa',
      'INACTIVE'
    );

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'INACTIVE' } })
    );
  });

  it('refuse de reactiver un preparateur PENDING (sans mot de passe)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      user_id: 'u-prepa',
      pharmacy_id: 'p1',
      role: UserRole.PREPARATEUR,
      password: null,
    });
    await expect(
      service.setPreparateurStatus(
        'p1',
        UserRole.ADMIN_SAVELY,
        'u-prepa',
        'ACTIVE'
      )
    ).rejects.toThrow(ConflictException);
  });

  it('supprime les tokens puis le preparateur', async () => {
    prisma.user.findUnique.mockResolvedValue({
      user_id: 'u-prepa',
      pharmacy_id: 'p1',
      role: UserRole.PREPARATEUR,
    });

    const result = await service.deletePreparateur(
      'p1',
      UserRole.ADMIN_SAVELY,
      'u-prepa'
    );

    expect(prisma.authToken.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 'u-prepa' },
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { user_id: 'u-prepa' },
    });
    expect(result).toEqual({ deleted: true });
  });
});
