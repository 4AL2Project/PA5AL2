import { GoneException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { config } from '../../core/config';
import { prisma } from '../../database/client';
import { EmailService } from '../email/email.service';
import { generateToken, hashToken } from '../auth/token.util';

/** Payload JWT pour un token d'espace association. */
export interface AssoJwtPayload {
  sub: string;           // association_id
  type: 'association';
  email: string | null;  // contact_email
}

const MAGIC_LINK_TTL_MS = 24 * 60 * 60 * 1000; // 24h

@Injectable()
export class AssoAuthService {
  private readonly logger = new Logger(AssoAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService
  ) {}

  /**
   * Génère un magic link pour l'espace association et l'envoie par email.
   * Seul un admin Savely peut déclencher cet envoi.
   */
  async sendMagicLink(associationId: string): Promise<void> {
    const asso = await prisma.association.findUnique({
      where: { association_id: associationId },
    });
    if (!asso) throw new NotFoundException('Association introuvable');
    if (!asso.contact_email) {
      throw new NotFoundException(
        "Cette association n'a pas d'email de contact"
      );
    }

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

    await prisma.association.update({
      where: { association_id: associationId },
      data: {
        magic_link_token_hash: tokenHash,
        magic_link_expires_at: expiresAt,
      },
    });

    const link = `${config.assoAppUrl}/auth/verify?token=${rawToken}`;
    await this.emailService.sendAssoMagicLinkEmail(
      asso.contact_email,
      asso.name,
      link
    );
    this.logger.log(
      `Asso magic link sent to ${asso.contact_email} (asso=${associationId})`
    );
  }

  /**
   * Vérifie le token brut, consomme le magic link et émet un JWT association.
   */
  async verifyToken(rawToken: string): Promise<{ access_token: string; is_onboarded: boolean }> {
    const tokenHash = hashToken(rawToken);
    const asso = await prisma.association.findUnique({
      where: { magic_link_token_hash: tokenHash },
    });

    if (
      !asso ||
      !asso.magic_link_expires_at ||
      asso.magic_link_expires_at < new Date()
    ) {
      this.logger.warn('Asso magic link token expired or invalid');
      throw new GoneException('Ce lien est expiré ou déjà utilisé');
    }

    // Consommer le token (one-shot)
    await prisma.association.update({
      where: { association_id: asso.association_id },
      data: {
        magic_link_token_hash: null,
        magic_link_expires_at: null,
      },
    });

    this.logger.log(`Asso magic link verified for asso=${asso.association_id}`);
    const access_token = await this.issueJwt({
      sub: asso.association_id,
      type: 'association',
      email: asso.contact_email,
    });
    return { access_token, is_onboarded: asso.is_onboarded };
  }

  async issueJwt(payload: AssoJwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: config.auth.accessSecret,
      expiresIn: config.auth.accessTtl,
    });
  }
}
