/**
 * Connexion Preparateur par code OTP (remplace le mot de passe)
 * POST /api/auth/preparateur/request-code
 * POST /api/auth/preparateur/verify-code
 */
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { hashOtpCode } from '../../core/otp.util';
import { EmailService } from '../email/email.service';
import { PreparateurOtpService } from './preparateur-otp.service';

// --- Mocks -------------------------------------------------------------------
jest.mock('../../database/client', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    userOtp: {
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: {
    user: { findUnique: jest.Mock };
    userOtp: {
      count: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
};

const preparateur = {
  user_id: 'user-1',
  email: 'prep@pharmacie.fr',
  pharmacy_id: 'pharm-1',
  role: 'PREPARATEUR',
  status: 'ACTIVE',
  password: null,
};

describe('PreparateurOtpService', () => {
  let service: PreparateurOtpService;
  let email: { sendOtpCodeEmail: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    const jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    } as unknown as JwtService;
    email = { sendOtpCodeEmail: jest.fn().mockResolvedValue(undefined) };
    service = new PreparateurOtpService(jwt, email as unknown as EmailService);
  });

  describe('requestCode', () => {
    it('génère un code, invalide les anciens et envoie un email', async () => {
      prisma.user.findUnique.mockResolvedValue(preparateur);
      prisma.userOtp.count.mockResolvedValue(0);
      prisma.userOtp.updateMany.mockResolvedValue({ count: 0 });
      prisma.userOtp.create.mockResolvedValue({});

      await service.requestCode('  Prep@Pharmacie.fr ');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'prep@pharmacie.fr' },
      });
      expect(prisma.userOtp.updateMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1', consumed_at: null },
        data: expect.objectContaining({ consumed_at: expect.any(Date) }),
      });
      const sentCode = email.sendOtpCodeEmail.mock.calls[0][1] as string;
      expect(sentCode).toMatch(/^\d{6}$/);
      expect(prisma.userOtp.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: 'user-1',
          code_hash: hashOtpCode(sentCode),
        }),
      });
    });

    it("n'envoie rien pour un titulaire et ne révèle pas le rôle", async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...preparateur,
        role: 'TITULAIRE',
      });

      const res = await service.requestCode('titulaire@pharmacie.fr');

      expect(prisma.userOtp.create).not.toHaveBeenCalled();
      expect(email.sendOtpCodeEmail).not.toHaveBeenCalled();
      expect(res.message).toMatch(/Si ce compte existe/);
    });

    it("n'envoie rien pour un email inconnu, avec la même réponse", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const res = await service.requestCode('inconnu@nulle-part.fr');

      expect(email.sendOtpCodeEmail).not.toHaveBeenCalled();
      expect(res.message).toMatch(/Si ce compte existe/);
    });

    it("n'envoie rien à un préparateur encore PENDING", async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...preparateur,
        status: 'PENDING',
      });

      await service.requestCode('prep@pharmacie.fr');

      expect(email.sendOtpCodeEmail).not.toHaveBeenCalled();
    });

    it('respecte la limite de débit', async () => {
      prisma.user.findUnique.mockResolvedValue(preparateur);
      prisma.userOtp.count.mockResolvedValue(3);

      await service.requestCode('prep@pharmacie.fr');

      expect(prisma.userOtp.create).not.toHaveBeenCalled();
      expect(email.sendOtpCodeEmail).not.toHaveBeenCalled();
    });
  });

  describe('verifyCode', () => {
    const future = () => new Date(Date.now() + 60_000);

    it('consomme le code et retourne les tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(preparateur);
      prisma.userOtp.findFirst.mockResolvedValue({
        otp_id: 'otp-1',
        user_id: 'user-1',
        code_hash: hashOtpCode('123456'),
        expires_at: future(),
        attempts: 0,
      });
      prisma.userOtp.update.mockResolvedValue({});

      const res = await service.verifyCode('Prep@Pharmacie.fr', '123456');

      expect(prisma.userOtp.update).toHaveBeenCalledWith({
        where: { otp_id: 'otp-1' },
        data: expect.objectContaining({ consumed_at: expect.any(Date) }),
      });
      expect(res).toEqual({
        access_token: 'signed-token',
        refresh_token: 'signed-token',
      });
    });

    it('rejette un code erroné et incrémente les tentatives', async () => {
      prisma.user.findUnique.mockResolvedValue(preparateur);
      prisma.userOtp.findFirst.mockResolvedValue({
        otp_id: 'otp-1',
        user_id: 'user-1',
        code_hash: hashOtpCode('111111'),
        expires_at: future(),
        attempts: 0,
      });

      await expect(
        service.verifyCode('prep@pharmacie.fr', '000000')
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.userOtp.update).toHaveBeenCalledWith({
        where: { otp_id: 'otp-1' },
        data: { attempts: { increment: 1 } },
      });
    });

    it('rejette un code expiré', async () => {
      prisma.user.findUnique.mockResolvedValue(preparateur);
      prisma.userOtp.findFirst.mockResolvedValue({
        otp_id: 'otp-1',
        user_id: 'user-1',
        code_hash: hashOtpCode('123456'),
        expires_at: new Date(Date.now() - 1000),
        attempts: 0,
      });

      await expect(
        service.verifyCode('prep@pharmacie.fr', '123456')
      ).rejects.toThrow('Code invalide');
    });

    it('brûle le code après trop de tentatives', async () => {
      prisma.user.findUnique.mockResolvedValue(preparateur);
      prisma.userOtp.findFirst.mockResolvedValue({
        otp_id: 'otp-1',
        user_id: 'user-1',
        code_hash: hashOtpCode('123456'),
        expires_at: future(),
        attempts: 5,
      });
      prisma.userOtp.update.mockResolvedValue({});

      await expect(
        service.verifyCode('prep@pharmacie.fr', '123456')
      ).rejects.toThrow('Code invalide');
      expect(prisma.userOtp.update).toHaveBeenCalledWith({
        where: { otp_id: 'otp-1' },
        data: expect.objectContaining({ consumed_at: expect.any(Date) }),
      });
    });

    it("rejette quand aucun code n'existe", async () => {
      prisma.user.findUnique.mockResolvedValue(preparateur);
      prisma.userOtp.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyCode('prep@pharmacie.fr', '123456')
      ).rejects.toThrow('Code invalide');
    });

    it("refuse un compte qui n'est pas préparateur, sans consommer de code", async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...preparateur,
        role: 'TITULAIRE',
      });

      await expect(
        service.verifyCode('titulaire@pharmacie.fr', '123456')
      ).rejects.toThrow('Code invalide');
      expect(prisma.userOtp.findFirst).not.toHaveBeenCalled();
    });
  });
});
