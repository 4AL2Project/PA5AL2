import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { config } from '../../core/config';
import { prisma } from '../../database/client';
import { EmailService } from './email.service';
import { UserRole } from './roles.enum';
import { generateToken, hashToken } from './token.util';

@Injectable()
export class AdminService {
  constructor(private readonly emailService: EmailService) {}

  async createPharmacyWithTitulaire(
    pharmacyData: { name: string; address: string; siret: string },
    titulaireData: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    },
    actorRole: UserRole
  ) {
    if (actorRole !== UserRole.ADMIN_SAVELY) {
      throw new ForbiddenException('Reserve aux administrateurs Savely');
    }

    const existing = await prisma.user.findUnique({
      where: { email: titulaireData.email },
    });
    if (existing) {
      throw new ConflictException('Un compte existe deja pour cet email');
    }

    const pharmacy = await prisma.pharmacy.create({
      data: {
        name: pharmacyData.name,
        address: pharmacyData.address,
        siret: pharmacyData.siret,
        email: titulaireData.email,
      },
    });

    const user = await prisma.user.create({
      data: {
        pharmacy_id: pharmacy.pharmacy_id,
        email: titulaireData.email,
        first_name: titulaireData.first_name,
        last_name: titulaireData.last_name,
        phone: titulaireData.phone,
        role: UserRole.TITULAIRE,
        status: 'PENDING',
        password: null,
      },
      select: {
        user_id: true,
        email: true,
        first_name: true,
        last_name: true,
        status: true,
        role: true,
      },
    });

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + config.auth.invitationTtlMs);

    await prisma.authToken.create({
      data: {
        user_id: user.user_id,
        token_hash: tokenHash,
        type: 'INVITATION',
        expires_at: expiresAt,
      },
    });

    const link = `${config.frontUrl}/onboarding?token=${rawToken}`;
    await this.emailService.sendInvitationEmail(titulaireData.email, link);

    return {
      pharmacy_id: pharmacy.pharmacy_id,
      pharmacy_name: pharmacy.name,
      titulaire_email: user.email,
      titulaire_status: user.status,
    };
  }
}
