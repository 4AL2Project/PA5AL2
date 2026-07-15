import {
  BadRequestException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { config } from '../../core/config';
import { prisma } from '../../database/client';
import { generateToken, hashToken } from '../auth/token.util';
import { EmailService } from '../email/email.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { RegisterAssociationDto } from './dto/association.dto';

const VERIFY_TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48h

// Auto-inscription des assos depuis la landing publique :
// soumission → email de vérification (48h) → email_verified_at
// → EN_ATTENTE_VALIDATION → examen admin (valider / rejeter).
@Injectable()
export class AssociationRegistrationService {
  private readonly logger = new Logger(AssociationRegistrationService.name);

  constructor(
    private readonly geocoding: GeocodingService,
    private readonly email: EmailService
  ) {}

  async register(dto: RegisterAssociationDto, logoUrl?: string) {
    // Honeypot : un bot a rempli le champ caché → on répond comme si de rien
    // n'était, sans rien créer
    if (dto.website && dto.website.trim() !== '') {
      this.logger.warn(`Honeypot déclenché pour "${dto.name}"`);
      return { status: 'EN_ATTENTE_VALIDATION' };
    }

    // Géocodage serveur (API Adresse) : on ne demande jamais de coordonnées
    // GPS à un humain, et on ne fait pas confiance au géocodage frontend
    const coords = await this.geocoding.geocode(
      dto.address,
      dto.postal_code,
      dto.city
    );
    if (!coords) {
      throw new BadRequestException(
        'Adresse introuvable — précisez le numéro, la voie et la commune'
      );
    }

    const existing = await prisma.association.findFirst({
      where: { contact_email: dto.contact_email },
    });
    if (existing) {
      throw new BadRequestException(
        'Une association est déjà inscrite avec cet email'
      );
    }

    const rawToken = generateToken();
    const association = await prisma.association.create({
      data: {
        name: dto.name,
        rna_or_siren: dto.rna_or_siren,
        contact_email: dto.contact_email,
        contact_phone: dto.contact_phone,
        address: dto.address,
        postal_code: dto.postal_code,
        city: dto.city,
        lat: coords.lat,
        lng: coords.lng,
        action_radius_km: dto.action_radius_km,
        categories: dto.categories,
        pickup_sla_days: dto.pickup_sla_days ?? 7,
        logo_url: logoUrl ?? null,
        status: 'EN_ATTENTE_VALIDATION',
        verify_token_hash: hashToken(rawToken),
        verify_token_expires_at: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
      },
    });

    await this.email.sendAssociationVerificationEmail(
      dto.contact_email,
      dto.name,
      `${config.frontUrl}/associations/verifier/${rawToken}`
    );
    this.logger.log(
      `Association "${dto.name}" inscrite (en attente vérif email)`
    );
    return {
      association_id: association.association_id,
      status: association.status,
    };
  }

  async verifyEmail(rawToken: string) {
    const association = await prisma.association.findUnique({
      where: { verify_token_hash: hashToken(rawToken) },
    });
    if (!association) throw new NotFoundException('Lien invalide');
    if (
      !association.verify_token_expires_at ||
      association.verify_token_expires_at < new Date()
    ) {
      throw new GoneException('Lien expiré — recommencez votre inscription');
    }

    const updated = await prisma.association.update({
      where: { association_id: association.association_id },
      data: {
        email_verified_at: new Date(),
        verify_token_hash: null,
        verify_token_expires_at: null,
      },
    });
    if (association.contact_email) {
      await this.email.sendAssociationUnderReviewEmail(
        association.contact_email,
        association.name
      );
    }
    return { association_id: updated.association_id, status: updated.status };
  }
}
