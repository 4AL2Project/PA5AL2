import { GoneException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { config } from '../../core/config';
import { prisma } from '../../database/client';
import { EmailService } from '../email/email.service';
import { JwtPayload } from './jwt-payload';
import { UserRole } from './roles.enum';
import { generateToken, hashToken } from './token.util';

@Injectable()
export class MagicLinkService {
  private readonly logger = new Logger(MagicLinkService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService
  ) {}

  async send(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });

    // Reponse silencieuse si email inconnu ou utilisateur PENDING
    if (!user || user.status !== 'ACTIVE') return;
    // Rate-limit : max 3 tokens actifs dans la fenetre de 15 min
    const windowStart = new Date(
      Date.now() - config.auth.magicLinkRateLimitWindowMs
    );
    const recentCount = await prisma.authToken.count({
      where: {
        user_id: user.user_id,
        type: 'MAGIC_LINK',
        created_at: { gte: windowStart },
        consumed_at: null,
      },
    });
    if (recentCount >= config.auth.magicLinkRateLimit) return;

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + config.auth.magicLinkTtlMs);

    await prisma.authToken.create({
      data: {
        user_id: user.user_id,
        token_hash: tokenHash,
        type: 'MAGIC_LINK',
        expires_at: expiresAt,
      },
    });

    const link = `${config.frontUrl}/auth/verify?token=${rawToken}`;
    await this.emailService.sendMagicLinkEmail(email, link);
    this.logger.log(`Magic link sent to ${email}`);
  }

  async verify(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const record = await prisma.authToken.findFirst({
      where: { token_hash: tokenHash, type: 'MAGIC_LINK' },
      include: { user: true },
    });

    if (!record || record.consumed_at || record.expires_at < new Date()) {
      this.logger.warn('Magic link token expired or already consumed');
      throw new GoneException('Ce lien est expire ou deja utilise');
    }

    await prisma.authToken.update({
      where: { id: record.id },
      data: { consumed_at: new Date() },
    });

    const user = record.user;
    this.logger.log(
      `Magic link verified for user ${user.user_id} [pharmacy=${user.pharmacy_id}]`
    );
    return this.issueTokens({
      sub: user.user_id,
      email: user.email,
      pharmacy_id: user.pharmacy_id,
      role: user.role as UserRole,
    });
  }

  private async issueTokens(payload: JwtPayload) {
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
