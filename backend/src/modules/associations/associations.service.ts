import { Injectable, NotFoundException } from '@nestjs/common';

import { prisma } from '../../database/client';

export interface CreateAssociationDto {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  lat?: number;
  lng?: number;
  categories?: string[];
  contact_email?: string;
  contact_phone?: string;
}

@Injectable()
export class AssociationsService {
  async create(dto: CreateAssociationDto) {
    return prisma.association.create({ data: dto });
  }

  async findAll() {
    return prisma.association.findMany({ where: { active: true } });
  }

  async findNearby(lat: number, lng: number, radiusKm = 50) {
    const all = await prisma.association.findMany({ where: { active: true } });
    return all.filter((a) => {
      if (a.lat == null || a.lng == null) return false;
      return haversineKm(lat, lng, a.lat, a.lng) <= radiusKm;
    });
  }

  async findOne(id: string) {
    const asso = await prisma.association.findUnique({
      where: { association_id: id },
    });
    if (!asso) throw new NotFoundException('Association introuvable');
    return asso;
  }

  async update(id: string, dto: Partial<CreateAssociationDto>) {
    await this.findOne(id);
    return prisma.association.update({
      where: { association_id: id },
      data: dto,
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return prisma.association.update({
      where: { association_id: id },
      data: { active: false },
    });
  }
}

// Formule de Haversine — distance en km entre deux points GPS
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
