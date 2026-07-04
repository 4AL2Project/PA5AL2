import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { prisma } from '../../database/client';

export interface UpdatePharmacyMeInput {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
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
}
