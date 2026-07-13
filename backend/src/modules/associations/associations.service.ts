import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { haversineKm } from '../../core/geo.util';
import { prisma } from '../../database/client';
import { EmailService } from '../email/email.service';
import { GeocodingService } from '../geocoding/geocoding.service';

export interface CreateAssociationDto {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  lat?: number;
  lng?: number;
  action_radius_km?: number;
  categories?: string[];
  pickup_sla_days?: number;
  response_sla_hours?: number;
  rna_or_siren?: string;
  contact_email?: string;
  contact_phone?: string;
  logo_url?: string;
}

export interface FindAllOptions {
  category?: string;
  status?: string;
}

@Injectable()
export class AssociationsService {
  constructor(
    private readonly geocoding: GeocodingService,
    private readonly email: EmailService
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
    // Création manuelle par l'admin : l'asso est vérifiée d'office
    return prisma.association.create({
      data: {
        ...dto,
        lat,
        lng,
        status: 'ACTIVE',
        email_verified_at: new Date(),
      },
    });
  }

  async findAll(opts: FindAllOptions = {}) {
    const where: Record<string, unknown> = {
      status: opts.status ?? 'ACTIVE',
    };
    if (opts.category) where.categories = { hasSome: [opts.category] };
    return prisma.association.findMany({ where });
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusKm = 50,
    opts: FindAllOptions = {}
  ) {
    const where: Record<string, unknown> = { status: 'ACTIVE' };
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
      data: { status: 'SUSPENDUE' },
    });
  }

  async setLogo(id: string, logoUrl: string) {
    await this.findOne(id);
    return prisma.association.update({
      where: { association_id: id },
      data: { logo_url: logoUrl },
    });
  }

  // ── File de validation admin ────────────────────────────────────────────────

  async listPending() {
    return prisma.association.findMany({
      where: { status: 'EN_ATTENTE_VALIDATION' },
      orderBy: { created_at: 'asc' },
    });
  }

  async validate(id: string, fiscalReceiptVerified: boolean) {
    const asso = await this.findOne(id);
    if (asso.status !== 'EN_ATTENTE_VALIDATION') {
      throw new BadRequestException(
        `Seule une association en attente peut être validée (statut : ${asso.status})`
      );
    }
    if (!asso.email_verified_at) {
      throw new BadRequestException(
        "L'association n'a pas encore confirmé son adresse email"
      );
    }
    const updated = await prisma.association.update({
      where: { association_id: id },
      data: {
        status: 'ACTIVE',
        fiscal_receipt_verified: fiscalReceiptVerified,
      },
    });
    if (asso.contact_email) {
      await this.email.sendAssociationValidatedEmail(
        asso.contact_email,
        asso.name
      );
    }
    return updated;
  }

  async reject(id: string, reason: string) {
    const asso = await this.findOne(id);
    if (asso.status !== 'EN_ATTENTE_VALIDATION') {
      throw new BadRequestException(
        `Seule une association en attente peut être rejetée (statut : ${asso.status})`
      );
    }
    const updated = await prisma.association.update({
      where: { association_id: id },
      data: { status: 'REJETEE', rejection_reason: reason },
    });
    if (asso.contact_email) {
      await this.email.sendAssociationRejectedEmail(
        asso.contact_email,
        asso.name,
        reason
      );
    }
    return updated;
  }

  /** Historique des allocations pour la fiche admin. */
  async allocationHistory(id: string) {
    await this.findOne(id);
    return prisma.donationAllocation.findMany({
      where: { association_id: id },
      include: {
        donation: {
          include: { pharmacy: { select: { name: true, address: true } } },
        },
      },
      orderBy: { pickup_slot_start: 'desc' },
      take: 50,
    });
  }
}
