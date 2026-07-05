import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { UserRole } from '../auth/roles.enum';
import { EmailService } from '../email/email.service';
import { AdminService } from './admin.service';

jest.mock('../../database/client', () => {
  const client = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    authToken: { create: jest.fn(), deleteMany: jest.fn() },
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
    user: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    authToken: { create: jest.Mock; deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };
};

const emailMock: Pick<EmailService, 'sendInvitationEmail'> = {
  sendInvitationEmail: jest.fn(),
};

const ACTOR_ID = 'actor-uuid';
const TARGET_ID = 'target-uuid';

const makeAdmin = (overrides: Record<string, unknown> = {}) => ({
  user_id: TARGET_ID,
  email: 'admin@savely.fr',
  first_name: 'Alice',
  last_name: 'Martin',
  role: UserRole.ADMIN_SAVELY,
  status: 'ACTIVE',
  pharmacy_id: null,
  password: null,
  phone: null,
  accepted_terms_at: null,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  ...overrides,
});

describe('AdminService — Admin Users', () => {
  let service: AdminService;

  beforeEach(() => {
    service = new AdminService(emailMock as EmailService);
    jest.clearAllMocks();
  });

  // ── createAdminUser ──────────────────────────────────────────────────────────

  describe('createAdminUser', () => {
    it('crée un admin PENDING et envoie une invitation', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const created = makeAdmin({ status: 'PENDING' });
      prisma.user.create.mockResolvedValue(created);
      prisma.authToken.create.mockResolvedValue({});
      (emailMock.sendInvitationEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.createAdminUser({
        email: 'admin@savely.fr',
        first_name: 'Alice',
        last_name: 'Martin',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.ADMIN_SAVELY,
            pharmacy_id: null,
            status: 'PENDING',
          }),
        })
      );
      expect(emailMock.sendInvitationEmail).toHaveBeenCalledWith(
        'admin@savely.fr',
        expect.stringContaining('/admin/onboarding')
      );
      expect(result.status).toBe('PENDING');
    });

    it('409 si un compte existe déjà pour cet email', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeAdmin({ role: UserRole.TITULAIRE })
      );

      await expect(
        service.createAdminUser({
          email: 'dup@pharmacy.fr',
          first_name: 'X',
          last_name: 'Y',
        })
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  // ── setAdminUserStatus ───────────────────────────────────────────────────────

  describe('setAdminUserStatus', () => {
    it('403 si un admin tente de désactiver son propre compte', async () => {
      prisma.user.findFirst.mockResolvedValue(makeAdmin({ user_id: ACTOR_ID }));

      await expect(
        service.setAdminUserStatus(ACTOR_ID, 'INACTIVE', ACTOR_ID)
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('403 si on tente de désactiver le dernier admin actif', async () => {
      prisma.user.findFirst.mockResolvedValue(makeAdmin());
      prisma.user.count.mockResolvedValue(1);

      await expect(
        service.setAdminUserStatus(TARGET_ID, 'INACTIVE', ACTOR_ID)
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('désactive un admin si plusieurs actifs existent', async () => {
      prisma.user.findFirst.mockResolvedValue(makeAdmin());
      prisma.user.count.mockResolvedValue(3);
      prisma.user.update.mockResolvedValue(makeAdmin({ status: 'INACTIVE' }));

      const result = await service.setAdminUserStatus(
        TARGET_ID,
        'INACTIVE',
        ACTOR_ID
      );
      expect(result.status).toBe('INACTIVE');
    });
  });

  // ── resendAdminUserInvitation ────────────────────────────────────────────────

  describe('resendAdminUserInvitation', () => {
    it('400 si le compte est déjà ACTIVE', async () => {
      prisma.user.findFirst.mockResolvedValue(makeAdmin({ status: 'ACTIVE' }));

      await expect(
        service.resendAdminUserInvitation(TARGET_ID)
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('renvoie l invitation si le compte est PENDING', async () => {
      prisma.user.findFirst.mockResolvedValue(makeAdmin({ status: 'PENDING' }));
      prisma.authToken.create.mockResolvedValue({});
      (emailMock.sendInvitationEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.resendAdminUserInvitation(TARGET_ID);
      expect(result.email).toBe('admin@savely.fr');
      expect(emailMock.sendInvitationEmail).toHaveBeenCalled();
    });
  });

  // ── findAdminUser (via deactivateAdminUser) ──────────────────────────────────

  describe('deactivateAdminUser', () => {
    it('404 si l admin cible n existe pas', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivateAdminUser(TARGET_ID, ACTOR_ID)
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
