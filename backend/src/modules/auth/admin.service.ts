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

export interface PharmacyListItem {
  pharmacy_id: string;
  name: string;
  address: string | null;
  siret: string | null;
  created_at: Date;
  titulaire: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
    status: string;
  } | null;
}

@Injectable()
export class AdminService {
  constructor(private readonly emailService: EmailService) {}

  async listPharmacies(actorRole: UserRole, actorPharmacyId: string) {
    if (actorRole !== UserRole.ADMIN_SAVELY) {
      throw new ForbiddenException('Reserve aux administrateurs Savely');
    }
    const rows = await prisma.pharmacy.findMany({
      where: { NOT: { pharmacy_id: actorPharmacyId } },
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          where: { role: UserRole.TITULAIRE },
          orderBy: { created_at: 'asc' },
          take: 1,
          select: {
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
    });
    const items: PharmacyListItem[] = rows.map((p) => ({
      pharmacy_id: p.pharmacy_id,
      name: p.name,
      address: p.address,
      siret: p.siret,
      created_at: p.created_at,
      titulaire: p.users[0]
        ? {
            first_name: p.users[0].first_name,
            last_name: p.users[0].last_name,
            email: p.users[0].email,
            phone: p.users[0].phone,
            status: p.users[0].status,
          }
        : null,
    }));
    return { pharmacies: items };
  }

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
