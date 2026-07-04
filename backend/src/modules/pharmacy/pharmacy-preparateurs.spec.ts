/**
 * [Titulaire] Gestion des preparateurs de commande de mon officine.
 */
import { ConflictException, NotFoundException } from '@nestjs/common';

import { UserRole } from '../auth/roles.enum';
import { PharmacyService } from './pharmacy.service';

// --- Mocks -------------------------------------------------------------------
jest.mock('../../database/client', () => {
  const client = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    authToken: { deleteMany: jest.fn() },
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
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    authToken: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };
};

const prepa = {
  first_name: 'Jean',
  last_name: 'Martin',
  email: 'jean@a.fr',
  phone: '0612345678',
};

describe('PharmacyService preparateurs', () => {
  let service: PharmacyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PharmacyService();
  });

  describe('listPreparateurs', () => {
    it('ne renvoie que les preparateurs de mon officine', async () => {
      prisma.user.findMany.mockResolvedValue([
        { user_id: 'u-prepa', ...prepa, status: 'ACTIVE' },
      ]);

      const result = await service.listPreparateurs('p1');

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { pharmacy_id: 'p1', role: UserRole.PREPARATEUR },
        })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('addPreparateur', () => {
    it('cree un preparateur ACTIVE sans mot de passe dans mon officine', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ user_id: 'u-prepa', ...prepa });

      await service.addPreparateur('p1', prepa);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pharmacy_id: 'p1',
            role: UserRole.PREPARATEUR,
            status: 'ACTIVE',
            password: null,
          }),
        })
      );
    });

    it('leve ConflictException si l email existe deja', async () => {
      prisma.user.findUnique.mockResolvedValue({ user_id: 'autre' });
      await expect(service.addPreparateur('p1', prepa)).rejects.toThrow(
        ConflictException
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('updatePreparateur', () => {
    it('refuse de modifier un preparateur d une autre officine', async () => {
      prisma.user.findUnique.mockResolvedValue({
        user_id: 'u1',
        pharmacy_id: 'autre-officine',
        role: UserRole.PREPARATEUR,
      });
      await expect(
        service.updatePreparateur('p1', 'u1', { phone: '0600000000' })
      ).rejects.toThrow(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuse de modifier un utilisateur qui n est pas un preparateur', async () => {
      prisma.user.findUnique.mockResolvedValue({
        user_id: 'u1',
        pharmacy_id: 'p1',
        role: UserRole.TITULAIRE,
      });
      await expect(
        service.updatePreparateur('p1', 'u1', { phone: '0600000000' })
      ).rejects.toThrow(NotFoundException);
    });

    it('met a jour un preparateur de mon officine', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({
          user_id: 'u-prepa',
          pharmacy_id: 'p1',
          role: UserRole.PREPARATEUR,
          email: 'jean@a.fr',
        })
        .mockResolvedValueOnce(null);
      prisma.user.update.mockResolvedValue({ user_id: 'u-prepa', ...prepa });

      await service.updatePreparateur('p1', 'u-prepa', { phone: '0600000000' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: 'u-prepa' },
          data: expect.objectContaining({ phone: '0600000000' }),
        })
      );
    });
  });

  describe('deletePreparateur', () => {
    it('refuse de supprimer un preparateur d une autre officine', async () => {
      prisma.user.findUnique.mockResolvedValue({
        user_id: 'u-prepa',
        pharmacy_id: 'autre-officine',
        role: UserRole.PREPARATEUR,
      });
      await expect(service.deletePreparateur('p1', 'u-prepa')).rejects.toThrow(
        NotFoundException
      );
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });

    it('supprime les tokens puis le preparateur', async () => {
      prisma.user.findUnique.mockResolvedValue({
        user_id: 'u-prepa',
        pharmacy_id: 'p1',
        role: UserRole.PREPARATEUR,
      });

      const result = await service.deletePreparateur('p1', 'u-prepa');

      expect(prisma.authToken.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'u-prepa' },
      });
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { user_id: 'u-prepa' },
      });
      expect(result).toEqual({ deleted: true });
    });
  });
});
