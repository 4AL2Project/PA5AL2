import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import { Injectable, NotFoundException } from '@nestjs/common';

import { config } from '../../core/config';
import { StorageService } from '../../core/storage/storage.service';
import { prisma } from '../../database/client';
import { GeocodingService } from '../geocoding/geocoding.service';

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
  logo_url?: string;
}

export interface FindAllOptions {
  category?: string;
}

@Injectable()
export class AssociationsService {
  constructor(
    private readonly geocoding: GeocodingService,
    private readonly storage: StorageService
  ) {}

  async create(dto: CreateAssociationDto) {
    let { lat, lng } = dto;
    if (lat == null || lng == null) {
      const coords = await this.geocoding.geocode(
        dto.address,
        dto.postal_code,
        dto.city
      );
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }
    return prisma.association.create({ data: { ...dto, lat, lng } });
  }

  async findAll(opts: FindAllOptions = {}) {
    const where: Record<string, unknown> = { active: true };
    if (opts.category) where.categories = { hasSome: [opts.category] };
    return prisma.association.findMany({ where });
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm = 50,
    opts: FindAllOptions = {}
  ) {
    const where: Record<string, unknown> = { active: true };
    if (opts.category) where.categories = { hasSome: [opts.category] };
    const all = await prisma.association.findMany({ where });
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

  async setLogo(id: string, file: Express.Multer.File) {
    const asso = await this.findOne(id);

    const logoUrl = await this.storage.upload({
      key: `${config.storage.prefixes.associations}/${randomUUID()}${extname(
        file.originalname
      ).toLowerCase()}`,
      body: file.buffer,
      contentType: file.mimetype,
    });

    const updated = await prisma.association.update({
      where: { association_id: id },
      data: { logo_url: logoUrl },
    });

    // Supprime l'ancien logo (best-effort) une fois le nouveau enregistré.
    if (asso.logo_url && asso.logo_url !== logoUrl) {
      await this.storage.delete(asso.logo_url);
    }
    return updated;
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
