/**
 * Connexion Customer B2C par code OTP (app mobile)
 * POST /api/customers/auth/request-code
 * POST /api/customers/auth/verify-code
 */
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { EmailService } from '../email/email.service';
import { CustomerService } from './customer.service';
import { hashOtpCode } from './customer-otp.util';

// --- Mocks -------------------------------------------------------------------
jest.mock('../../database/client', () => ({
  prisma: {
    customer: { findUnique: jest.fn(), create: jest.fn() },
    customerOtp: {
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
    customer: { findUnique: jest.Mock; create: jest.Mock };
    customerOtp: {
      count: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
};

describe('CustomerService — OTP login', () => {
  let service: CustomerService;
  let email: { sendOtpCodeEmail: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    const jwt = {
      sign: jest.fn().mockReturnValue('signed-token'),
    } as unknown as JwtService;
    email = { sendOtpCodeEmail: jest.fn().mockResolvedValue(undefined) };
    service = new CustomerService(jwt, email as unknown as EmailService);
  });

  describe('requestCode', () => {
    it('génère un code, invalide les anciens et envoie un email', async () => {
      prisma.customerOtp.count.mockResolvedValue(0);
      prisma.customerOtp.updateMany.mockResolvedValue({ count: 0 });
      prisma.customerOtp.create.mockResolvedValue({});

      const res = await service.requestCode('  User@Example.com ');

      expect(prisma.customerOtp.updateMany).toHaveBeenCalledWith({
        where: { email: 'user@example.com', consumed_at: null },
        data: expect.objectContaining({ consumed_at: expect.any(Date) }),
      });
      expect(prisma.customerOtp.create).toHaveBeenCalledTimes(1);
      const sentCode = email.sendOtpCodeEmail.mock.calls[0][1] as string;
      expect(sentCode).toMatch(/^\d{6}$/);
      expect(email.sendOtpCodeEmail).toHaveBeenCalledWith(
        'user@example.com',
        sentCode
      );
      expect(res).toEqual({ message: 'Code envoyé' });
    });

    it("n'envoie pas de code au-delà de la limite de débit", async () => {
      prisma.customerOtp.count.mockResolvedValue(3);

      await service.requestCode('user@example.com');

      expect(prisma.customerOtp.create).not.toHaveBeenCalled();
      expect(email.sendOtpCodeEmail).not.toHaveBeenCalled();
    });
  });

  describe('verifyCode', () => {
    const future = () => new Date(Date.now() + 60_000);

    it('crée le compte si nouveau et retourne les tokens', async () => {
      prisma.customerOtp.findFirst.mockResolvedValue({
        otp_id: 'otp-1',
        email: 'new@example.com',
        code_hash: hashOtpCode('123456'),
        expires_at: future(),
        attempts: 0,
      });
      prisma.customerOtp.update.mockResolvedValue({});
      prisma.customer.findUnique.mockResolvedValue(null);
      prisma.customer.create.mockResolvedValue({
        customer_id: 'cust-1',
        email: 'new@example.com',
        first_name: null,
        last_name: null,
        phone: null,
        created_at: new Date(),
      });

      const res = await service.verifyCode('New@Example.com', '123456');

      expect(prisma.customer.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { email: 'new@example.com' } })
      );
      expect(res.access_token).toBe('signed-token');
      expect(res.refresh_token).toBe('signed-token');
      expect(res.customer.customer_id).toBe('cust-1');
    });

    it('réutilise le compte existant', async () => {
      prisma.customerOtp.findFirst.mockResolvedValue({
        otp_id: 'otp-1',
        email: 'known@example.com',
        code_hash: hashOtpCode('654321'),
        expires_at: future(),
        attempts: 0,
      });
      prisma.customerOtp.update.mockResolvedValue({});
      prisma.customer.findUnique.mockResolvedValue({
        customer_id: 'cust-9',
        email: 'known@example.com',
        first_name: 'Jean',
        last_name: null,
        phone: null,
        created_at: new Date(),
      });

      const res = await service.verifyCode('known@example.com', '654321');

      expect(prisma.customer.create).not.toHaveBeenCalled();
      expect(res.customer.customer_id).toBe('cust-9');
    });

    it('rejette un code erroné et incrémente les tentatives', async () => {
      prisma.customerOtp.findFirst.mockResolvedValue({
        otp_id: 'otp-1',
        email: 'user@example.com',
        code_hash: hashOtpCode('111111'),
        expires_at: future(),
        attempts: 0,
      });

      await expect(
        service.verifyCode('user@example.com', '000000')
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.customerOtp.update).toHaveBeenCalledWith({
        where: { otp_id: 'otp-1' },
        data: { attempts: { increment: 1 } },
      });
    });

    it("rejette quand aucun code n'existe", async () => {
      prisma.customerOtp.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyCode('user@example.com', '123456')
      ).rejects.toThrow('Code invalide');
    });

    it('rejette un code expiré', async () => {
      prisma.customerOtp.findFirst.mockResolvedValue({
        otp_id: 'otp-1',
        email: 'user@example.com',
        code_hash: hashOtpCode('123456'),
        expires_at: new Date(Date.now() - 1000),
        attempts: 0,
      });

      await expect(
        service.verifyCode('user@example.com', '123456')
      ).rejects.toThrow('Code invalide');
    });

    it('invalide le code après trop de tentatives', async () => {
      prisma.customerOtp.findFirst.mockResolvedValue({
        otp_id: 'otp-1',
        email: 'user@example.com',
        code_hash: hashOtpCode('123456'),
        expires_at: future(),
        attempts: 5,
      });
      prisma.customerOtp.update.mockResolvedValue({});

      await expect(
        service.verifyCode('user@example.com', '123456')
      ).rejects.toThrow('Code invalide');
      expect(prisma.customerOtp.update).toHaveBeenCalledWith({
        where: { otp_id: 'otp-1' },
        data: expect.objectContaining({ consumed_at: expect.any(Date) }),
      });
    });
  });
});
