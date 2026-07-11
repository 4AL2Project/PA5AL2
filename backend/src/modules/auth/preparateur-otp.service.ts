import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { config } from '../../core/config';
import { generateOtpCode, hashOtpCode } from '../../core/otp.util';
import { prisma } from '../../database/client';
import { EmailService } from '../email/email.service';
import { AuthTokens, JwtPayload } from './jwt-payload';
import { UserRole } from './roles.enum';

/** Réponse volontairement identique que l'email existe ou non (anti-énumération). */
const GENERIC_SENT_MESSAGE = 'Si ce compte existe, un code a été envoyé.';

/**
 * Connexion des préparateurs par code OTP à 6 chiffres, en remplacement du
 * mot de passe. Contrairement au flux Customer B2C, aucun compte n'est créé à
 * la volée : le préparateur est toujours invité en amont par son titulaire.
 */
@Injectable()
export class PreparateurOtpService {
  private readonly logger = new Logger(PreparateurOtpService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService
  ) {}

  async requestCode(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Compte inconnu, non-préparateur ou pas encore actif : on ne le révèle pas.
    if (
      !user ||
      user.role !== UserRole.PREPARATEUR ||
      user.status !== 'ACTIVE'
    ) {
      this.logger.warn(
        `OTP requested for ineligible account: ${normalizedEmail}`
      );
      return { message: GENERIC_SENT_MESSAGE };
    }

    const windowStart = new Date(
      Date.now() - config.auth.preparateurOtpRateLimitWindowMs
    );
    const recentCount = await prisma.userOtp.count({
      where: { user_id: user.user_id, created_at: { gte: windowStart } },
    });
    if (recentCount >= config.auth.preparateurOtpRateLimit) {
      this.logger.warn(`OTP rate limit reached for ${normalizedEmail}`);
      return { message: GENERIC_SENT_MESSAGE };
    }

    // Un seul code valide à la fois : les précédents sont consommés.
    await prisma.userOtp.updateMany({
      where: { user_id: user.user_id, consumed_at: null },
      data: { consumed_at: new Date() },
    });

    const code = generateOtpCode(config.auth.preparateurOtpLength);
    await prisma.userOtp.create({
      data: {
        user_id: user.user_id,
        code_hash: hashOtpCode(code),
        expires_at: new Date(Date.now() + config.auth.preparateurOtpTtlMs),
      },
    });

    await this.emailService.sendOtpCodeEmail(
      normalizedEmail,
      code,
      config.auth.preparateurOtpTtlMs
    );
    this.logger.log(`OTP code sent to preparateur ${normalizedEmail}`);

    return { message: GENERIC_SENT_MESSAGE };
  }

  async verifyCode(email: string, code: string): Promise<AuthTokens> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (
      !user ||
      user.role !== UserRole.PREPARATEUR ||
      user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Code invalide');
    }

    const otp = await prisma.userOtp.findFirst({
      where: { user_id: user.user_id, consumed_at: null },
      orderBy: { created_at: 'desc' },
    });

    if (!otp || otp.expires_at < new Date()) {
      throw new UnauthorizedException('Code invalide');
    }

    // Trop d'essais : le code est brûlé, il faut en redemander un.
    if (otp.attempts >= config.auth.preparateurOtpMaxAttempts) {
      await prisma.userOtp.update({
        where: { otp_id: otp.otp_id },
        data: { consumed_at: new Date() },
      });
      throw new UnauthorizedException('Code invalide');
    }

    if (otp.code_hash !== hashOtpCode(code.trim())) {
      await prisma.userOtp.update({
        where: { otp_id: otp.otp_id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Code invalide');
    }

    await prisma.userOtp.update({
      where: { otp_id: otp.otp_id },
      data: { consumed_at: new Date() },
    });

    this.logger.log(
      `Preparateur logged in via OTP: ${normalizedEmail} [pharmacy=${user.pharmacy_id}]`
    );

    return this.issueTokens({
      sub: user.user_id,
      email: user.email,
      pharmacy_id: user.pharmacy_id,
      role: user.role as UserRole,
    });
  }

  private async issueTokens(payload: JwtPayload): Promise<AuthTokens> {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: config.auth.accessSecret,
        expiresIn: config.auth.accessTtl,
      }),
      this.jwtService.signAsync(payload, {
        secret: config.auth.refreshSecret,
        expiresIn: config.auth.refreshTtl,
      }),
    ]);
    return { access_token, refresh_token };
  }
}
