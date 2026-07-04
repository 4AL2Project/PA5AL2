import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { prisma } from '../../database/client';
import { UserRole } from '../auth/roles.enum';

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

  /** Cree un preparateur ACTIVE sans mot de passe : connexion via magic link. */
  async addPreparateur(
    pharmacyId: string,
    dto: PreparateurInput
  ): Promise<PreparateurItem> {
    const existing = await prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Un compte existe deja pour cet email');
    }

    return prisma.user.create({
      data: {
        pharmacy_id: pharmacyId,
        email: dto.email,
        first_name: dto.first_name,
        last_name: dto.last_name,
        phone: dto.phone,
        role: UserRole.PREPARATEUR,
        status: 'ACTIVE',
        password: null,
      },
      select: PREPARATEUR_SELECT,
    });
  }

  async updatePreparateur(
    pharmacyId: string,
    userId: string,
    dto: Partial<PreparateurInput>
  ): Promise<PreparateurItem> {
    const user = await prisma.user.findUnique({ where: { user_id: userId } });
    if (
      !user ||
      user.pharmacy_id !== pharmacyId ||
      user.role !== UserRole.PREPARATEUR
    ) {
      throw new NotFoundException('Preparateur introuvable');
    }

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

  async deletePreparateur(
    pharmacyId: string,
    userId: string
  ): Promise<{ deleted: true }> {
    const user = await prisma.user.findUnique({ where: { user_id: userId } });
    if (
      !user ||
      user.pharmacy_id !== pharmacyId ||
      user.role !== UserRole.PREPARATEUR
    ) {
      throw new NotFoundException('Preparateur introuvable');
    }

    await prisma.$transaction([
      prisma.authToken.deleteMany({ where: { user_id: userId } }),
      prisma.user.delete({ where: { user_id: userId } }),
    ]);
    return { deleted: true };
  }
}
