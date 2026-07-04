import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { config } from '../../core/config';
import { prisma } from '../../database/client';
import { UserRole } from '../auth/roles.enum';
import { generateToken, hashToken } from '../auth/token.util';
import { EmailService } from '../email/email.service';

export interface UpdatePharmacyMeInput {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface PreparateurItem {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  status: string;
}

export interface PreparateurInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface InvitePreparateurInput {
  email: string;
}

const PHARMACY_SELECT = {
  pharmacy_id: true,
  name: true,
  email: true,
  address: true,
  siret: true,
  lat: true,
  lng: true,
  status: true,
  subscription_tier: true,
  last_upload_at: true,
  created_at: true,
} as const;

const PREPARATEUR_SELECT = {
  user_id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
  status: true,
} as const;

@Injectable()
export class PharmacyService {
  constructor(private readonly emailService: EmailService) {}

  async getMyPharmacy(pharmacyId: string) {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { pharmacy_id: pharmacyId },
      select: PHARMACY_SELECT,
    });
    if (!pharmacy) throw new NotFoundException('Officine introuvable');
    return pharmacy;
  }

  async updateMyPharmacy(pharmacyId: string, dto: UpdatePharmacyMeInput) {
    try {
      return await prisma.pharmacy.update({
        where: { pharmacy_id: pharmacyId },
        data: dto,
        select: PHARMACY_SELECT,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Officine introuvable');
      }
      throw e;
    }
  }

  // ─── Preparateurs ──────────────────────────────────────────────────────────

  /** Liste les preparateurs de commande de mon officine. */
  async listPreparateurs(pharmacyId: string): Promise<PreparateurItem[]> {
    return prisma.user.findMany({
      where: { pharmacy_id: pharmacyId, role: UserRole.PREPARATEUR },
      orderBy: { created_at: 'asc' },
      select: PREPARATEUR_SELECT,
    });
  }

  /**
   * Cree un preparateur en attente (PENDING, sans mot de passe) a partir de son
   * seul email, puis lui envoie une invitation. Le preparateur renseigne son
   * profil (nom, telephone) et choisit un mot de passe depuis l'app mobile.
   */
  async addPreparateur(
    pharmacyId: string,
    dto: InvitePreparateurInput
  ): Promise<PreparateurItem> {
    const existing = await prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Un compte existe deja pour cet email');
    }

    const user = await prisma.user.create({
      data: {
        pharmacy_id: pharmacyId,
        email: dto.email,
        first_name: null,
        last_name: null,
        phone: null,
        role: UserRole.PREPARATEUR,
        status: 'PENDING',
        password: null,
      },
      select: PREPARATEUR_SELECT,
    });

    await this.sendPreparateurInvitation(user.user_id, user.email);

    return user;
  }

  /** Cree un token d'invitation (48h) et envoie le mail au preparateur. */
  private async sendPreparateurInvitation(
    userId: string,
    email: string
  ): Promise<void> {
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + config.auth.invitationTtlMs);

    await prisma.authToken.create({
      data: {
        user_id: userId,
        token_hash: tokenHash,
        type: 'INVITATION',
        expires_at: expiresAt,
      },
    });

    const link = `${config.frontUrl}/preparateur/onboarding?token=${rawToken}`;
    await this.emailService.sendInvitationEmail(email, link);
  }

  async updatePreparateur(
    pharmacyId: string,
    userId: string,
    dto: Partial<PreparateurInput>
  ): Promise<PreparateurItem> {
    const user = await this.assertMyPreparateur(pharmacyId, userId);

    if (dto.email && dto.email !== user.email) {
      const existing = await prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Un compte existe deja pour cet email');
      }
    }

    return prisma.user.update({
      where: { user_id: userId },
      data: {
        first_name: dto.first_name,
        last_name: dto.last_name,
        email: dto.email,
        phone: dto.phone,
      },
      select: PREPARATEUR_SELECT,
    });
  }

  /** Active ou desactive le compte d'un preparateur de mon officine. */
  async setPreparateurStatus(
    pharmacyId: string,
    userId: string,
    status: 'ACTIVE' | 'INACTIVE'
  ): Promise<PreparateurItem> {
    const user = await this.assertMyPreparateur(pharmacyId, userId);

    if (status === 'ACTIVE' && !user.password) {
      throw new ConflictException(
        "Ce preparateur n'a pas encore finalise son compte"
      );
    }

    return prisma.user.update({
      where: { user_id: userId },
      data: { status },
      select: PREPARATEUR_SELECT,
    });
  }

  async deletePreparateur(
    pharmacyId: string,
    userId: string
  ): Promise<{ deleted: true }> {
    await this.assertMyPreparateur(pharmacyId, userId);

    await prisma.$transaction([
      prisma.authToken.deleteMany({ where: { user_id: userId } }),
      prisma.user.delete({ where: { user_id: userId } }),
    ]);
    return { deleted: true };
  }

  /** Garantit que le preparateur appartient bien a mon officine. */
  private async assertMyPreparateur(pharmacyId: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { user_id: userId } });
    if (
      !user ||
      user.pharmacy_id !== pharmacyId ||
      user.role !== UserRole.PREPARATEUR
    ) {
      throw new NotFoundException('Preparateur introuvable');
    }
    return user;
  }
}
