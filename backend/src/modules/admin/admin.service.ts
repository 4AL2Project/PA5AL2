import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { config } from '../../core/config';
import { prisma } from '../../database/client';
import { UserRole } from '../auth/roles.enum';
import { generateToken, hashToken } from '../auth/token.util';
import { EmailService } from '../email/email.service';

export interface TitulaireSummary {
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  status: string;
}

export interface PharmacyListItem {
  pharmacy_id: string;
  name: string;
  address: string | null;
  siret: string | null;
  status: string;
  created_at: Date;
  titulaire: TitulaireSummary | null;
}

export interface PreparateurItem {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  status: string;
}

export interface PharmacyDetail extends PharmacyListItem {
  preparateurs: PreparateurItem[];
}

export interface UpdatePharmacyInput {
  pharmacy?: { name?: string; address?: string; siret?: string };
  titulaire?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
}

export interface PreparateurInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

const PREPARATEUR_ADMIN_SELECT = {
  user_id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
  status: true,
} as const;

/** Charge le titulaire (1er utilisateur TITULAIRE) avec chaque officine. */
const WITH_TITULAIRE = {
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
} satisfies Prisma.PharmacyInclude;

type PharmacyWithTitulaire = Prisma.PharmacyGetPayload<{
  include: typeof WITH_TITULAIRE;
}>;

@Injectable()
export class AdminService {
  constructor(private readonly emailService: EmailService) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private assertAdmin(actorRole: UserRole): void {
    if (actorRole !== UserRole.ADMIN_SAVELY) {
      throw new ForbiddenException('Reserve aux administrateurs Savely');
    }
  }

  private async ensureExists(pharmacyId: string): Promise<void> {
    const found = await prisma.pharmacy.findUnique({
      where: { pharmacy_id: pharmacyId },
      select: { pharmacy_id: true },
    });
    if (!found) {
      throw new NotFoundException('Officine introuvable');
    }
  }

  private toListItem(p: PharmacyWithTitulaire): PharmacyListItem {
    return {
      pharmacy_id: p.pharmacy_id,
      name: p.name,
      address: p.address,
      siret: p.siret,
      status: p.status,
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
    };
  }

  /** Cree un token d'invitation (48h) et envoie le mail d'onboarding. */
  private async issueInvitation(
    userId: string,
    email: string,
    role: UserRole = UserRole.TITULAIRE
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

    const path =
      role === UserRole.PREPARATEUR ? '/preparateur/onboarding' : '/onboarding';
    const link = `${config.frontUrl}${path}?token=${rawToken}`;
    await this.emailService.sendInvitationEmail(email, link);
  }

  // ─── Lecture ────────────────────────────────────────────────────────────────

  async listPharmacies(actorRole: UserRole, actorPharmacyId: string) {
    this.assertAdmin(actorRole);
    const rows = await prisma.pharmacy.findMany({
      where: { NOT: { pharmacy_id: actorPharmacyId } },
      orderBy: { created_at: 'desc' },
      include: WITH_TITULAIRE,
    });
    return { pharmacies: rows.map((p) => this.toListItem(p)) };
  }

  async getPharmacy(
    pharmacyId: string,
    actorRole: UserRole
  ): Promise<PharmacyDetail> {
    this.assertAdmin(actorRole);
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { pharmacy_id: pharmacyId },
      include: {
        users: {
          orderBy: { created_at: 'asc' },
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            status: true,
            role: true,
          },
        },
      },
    });
    if (!pharmacy) {
      throw new NotFoundException('Officine introuvable');
    }

    const titulaire =
      pharmacy.users.find((u) => u.role === UserRole.TITULAIRE) ?? null;
    const preparateurs = pharmacy.users
      .filter((u) => u.role === UserRole.PREPARATEUR)
      .map((u) => ({
        user_id: u.user_id,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        phone: u.phone,
        status: u.status,
      }));

    return {
      pharmacy_id: pharmacy.pharmacy_id,
      name: pharmacy.name,
      address: pharmacy.address,
      siret: pharmacy.siret,
      status: pharmacy.status,
      created_at: pharmacy.created_at,
      titulaire: titulaire
        ? {
            first_name: titulaire.first_name,
            last_name: titulaire.last_name,
            email: titulaire.email,
            phone: titulaire.phone,
            status: titulaire.status,
          }
        : null,
      preparateurs,
    };
  }

  // ─── Officine ────────────────────────────────────────────────────────────────

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
    this.assertAdmin(actorRole);

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

    await this.issueInvitation(user.user_id, user.email);

    return {
      pharmacy_id: pharmacy.pharmacy_id,
      pharmacy_name: pharmacy.name,
      titulaire_email: user.email,
      titulaire_status: user.status,
    };
  }

  async updatePharmacy(
    pharmacyId: string,
    actorRole: UserRole,
    dto: UpdatePharmacyInput
  ): Promise<PharmacyDetail> {
    this.assertAdmin(actorRole);
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { pharmacy_id: pharmacyId },
      include: {
        users: {
          where: { role: UserRole.TITULAIRE },
          orderBy: { created_at: 'asc' },
          take: 1,
          select: { user_id: true, email: true },
        },
      },
    });
    if (!pharmacy) {
      throw new NotFoundException('Officine introuvable');
    }
    const titulaire = pharmacy.users[0] ?? null;

    if (
      dto.titulaire?.email &&
      titulaire &&
      dto.titulaire.email !== titulaire.email
    ) {
      const existing = await prisma.user.findUnique({
        where: { email: dto.titulaire.email },
      });
      if (existing) {
        throw new ConflictException('Un compte existe deja pour cet email');
      }
    }

    await prisma.$transaction(async (tx) => {
      if (dto.pharmacy) {
        await tx.pharmacy.update({
          where: { pharmacy_id: pharmacyId },
          data: {
            name: dto.pharmacy.name,
            address: dto.pharmacy.address,
            siret: dto.pharmacy.siret,
          },
        });
      }
      if (dto.titulaire && titulaire) {
        await tx.user.update({
          where: { user_id: titulaire.user_id },
          data: {
            first_name: dto.titulaire.first_name,
            last_name: dto.titulaire.last_name,
            email: dto.titulaire.email,
            phone: dto.titulaire.phone,
          },
        });
      }
    });

    return this.getPharmacy(pharmacyId, actorRole);
  }

  async setPharmacyStatus(
    pharmacyId: string,
    actorRole: UserRole,
    status: 'ACTIVE' | 'INACTIVE'
  ): Promise<PharmacyDetail> {
    this.assertAdmin(actorRole);
    await this.ensureExists(pharmacyId);
    await prisma.pharmacy.update({
      where: { pharmacy_id: pharmacyId },
      data: { status },
    });
    return this.getPharmacy(pharmacyId, actorRole);
  }

  async resendInvitation(pharmacyId: string, actorRole: UserRole) {
    this.assertAdmin(actorRole);
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { pharmacy_id: pharmacyId },
      include: {
        users: {
          where: { role: UserRole.TITULAIRE },
          orderBy: { created_at: 'asc' },
          take: 1,
          select: { user_id: true, email: true, status: true },
        },
      },
    });
    if (!pharmacy) {
      throw new NotFoundException('Officine introuvable');
    }
    const titulaire = pharmacy.users[0];
    if (!titulaire) {
      throw new BadRequestException(
        'Aucun gerant a inviter pour cette officine'
      );
    }
    if (titulaire.status === 'ACTIVE') {
      throw new BadRequestException('Le gerant a deja active son compte');
    }

    await this.issueInvitation(titulaire.user_id, titulaire.email);
    return {
      titulaire_email: titulaire.email,
      titulaire_status: titulaire.status,
    };
  }

  // ─── Preparateurs ────────────────────────────────────────────────────────────

  async addPreparateur(
    pharmacyId: string,
    actorRole: UserRole,
    dto: { email: string }
  ): Promise<PreparateurItem> {
    this.assertAdmin(actorRole);
    await this.ensureExists(pharmacyId);

    const existing = await prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Un compte existe deja pour cet email');
    }

    // Cree en attente (PENDING) a partir du seul email : le preparateur
    // renseigne son profil et choisit un mot de passe via l'invitation.
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
      select: PREPARATEUR_ADMIN_SELECT,
    });

    await this.issueInvitation(user.user_id, user.email, UserRole.PREPARATEUR);

    return user;
  }

  async updatePreparateur(
    pharmacyId: string,
    actorRole: UserRole,
    userId: string,
    dto: Partial<PreparateurInput>
  ): Promise<PreparateurItem> {
    this.assertAdmin(actorRole);
    const user = await this.assertPreparateur(pharmacyId, userId);

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
      select: PREPARATEUR_ADMIN_SELECT,
    });
  }

  /** Active ou desactive le compte d'un preparateur d'une officine. */
  async setPreparateurStatus(
    pharmacyId: string,
    actorRole: UserRole,
    userId: string,
    status: 'ACTIVE' | 'INACTIVE'
  ): Promise<PreparateurItem> {
    this.assertAdmin(actorRole);
    const user = await this.assertPreparateur(pharmacyId, userId);

    if (status === 'ACTIVE' && !user.password) {
      throw new ConflictException(
        "Ce preparateur n'a pas encore finalise son compte"
      );
    }

    return prisma.user.update({
      where: { user_id: userId },
      data: { status },
      select: PREPARATEUR_ADMIN_SELECT,
    });
  }

  async deletePharmacy(
    pharmacyId: string,
    actorRole: UserRole
  ): Promise<{ deleted: true }> {
    this.assertAdmin(actorRole);
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { pharmacy_id: pharmacyId },
      select: { pharmacy_id: true, status: true },
    });
    if (!pharmacy) {
      throw new NotFoundException('Officine introuvable');
    }
    if (pharmacy.status !== 'INACTIVE') {
      throw new BadRequestException(
        "L'officine doit \u00eatre d\u00e9sactiv\u00e9e avant d'\u00eatre supprim\u00e9e"
      );
    }

    await prisma.$transaction([
      prisma.donation.deleteMany({ where: { pharmacy_id: pharmacyId } }),
      prisma.action.deleteMany({ where: { pharmacy_id: pharmacyId } }),
      prisma.riskAnalysis.deleteMany({ where: { pharmacy_id: pharmacyId } }),
      prisma.sale.deleteMany({ where: { pharmacy_id: pharmacyId } }),
      prisma.authToken.deleteMany({
        where: { user: { pharmacy_id: pharmacyId } },
      }),
      prisma.user.deleteMany({ where: { pharmacy_id: pharmacyId } }),
      prisma.product.deleteMany({ where: { pharmacy_id: pharmacyId } }),
      prisma.pharmacy.delete({ where: { pharmacy_id: pharmacyId } }),
    ]);

    return { deleted: true };
  }

  async deletePreparateur(
    pharmacyId: string,
    actorRole: UserRole,
    userId: string
  ): Promise<{ deleted: true }> {
    this.assertAdmin(actorRole);
    await this.assertPreparateur(pharmacyId, userId);

    await prisma.$transaction([
      prisma.authToken.deleteMany({ where: { user_id: userId } }),
      prisma.user.delete({ where: { user_id: userId } }),
    ]);
    return { deleted: true };
  }

  /** Garantit que le preparateur appartient bien a l'officine ciblee. */
  private async assertPreparateur(pharmacyId: string, userId: string) {
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
