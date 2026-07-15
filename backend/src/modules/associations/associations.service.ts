import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { config } from '../../core/config';
import { haversineKm } from '../../core/geo.util';
import { StorageService } from '../../core/storage/storage.service';
import { prisma } from '../../database/client';
import {
  DONATION_TAX_REDUCTION_RATE,
  DonationLineSnapshot,
} from '../donations/donation.types';
import { EmailService } from '../email/email.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { AssociationStatsService } from './association-stats.service';

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
  pickup_windows?: { day: string; start: string; end: string }[];
}

export interface FindAllOptions {
  category?: string;
  status?: string;
}

@Injectable()
export class AssociationsService {
  constructor(
    private readonly geocoding: GeocodingService,
    private readonly email: EmailService,
    private readonly storage: StorageService,
    private readonly stats: AssociationStatsService
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

  // ── Annuaire titulaire ──────────────────────────────────────────────────────

  /**
   * Annuaire des associations pour l'officine : distance, fiabilité (taux de
   * récupération lissé, celui du matching), créneaux déclarés. Triée par
   * distance croissante.
   */
  async annuaire(
    pharmacyId: string,
    opts: { category?: string; search?: string } = {}
  ) {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { pharmacy_id: pharmacyId },
    });
    if (!pharmacy) throw new NotFoundException('Officine introuvable');

    const assos = await this.findAll({ category: opts.category });
    const filtered = opts.search
      ? assos.filter((a) =>
          a.name.toLowerCase().includes(opts.search!.toLowerCase())
        )
      : assos;
    const reliability = await this.stats.getReliability(
      filtered.map((a) => a.association_id)
    );

    return filtered
      .map((a) => ({
        association_id: a.association_id,
        name: a.name,
        city: a.city,
        postal_code: a.postal_code,
        logo_url: a.logo_url,
        categories: a.categories,
        pickup_windows: a.pickup_windows,
        action_radius_km: a.action_radius_km,
        distance_km:
          pharmacy.lat != null && a.lat != null
            ? Math.round(
                haversineKm(pharmacy.lat, pharmacy.lng!, a.lat, a.lng!) * 10
              ) / 10
            : null,
        reliability: reliability.get(a.association_id) ?? null,
      }))
      .sort(
        (x, y) => (x.distance_km ?? Infinity) - (y.distance_km ?? Infinity)
      );
  }

  /**
   * Fiche détaillée pour le titulaire : profil, stats de fiabilité,
   * historique des dons de SON officine avec valeur (coût de revient HT)
   * et économie fiscale (60 %).
   */
  async fiche(id: string, pharmacyId: string) {
    const [asso, pharmacy] = await Promise.all([
      this.findOne(id),
      prisma.pharmacy.findUnique({ where: { pharmacy_id: pharmacyId } }),
    ]);
    const stats = await this.stats.getStats(id);
    const allocations = await prisma.donationAllocation.findMany({
      where: { association_id: id, donation: { pharmacy_id: pharmacyId } },
      orderBy: { pickup_slot_start: 'desc' },
      take: 50,
    });

    const history = allocations.map((a) => {
      const lines = a.lines as unknown as DonationLineSnapshot[];
      return {
        allocation_id: a.allocation_id,
        status: a.status,
        pickup_slot_start: a.pickup_slot_start,
        picked_up_at: a.picked_up_at,
        lines,
        value:
          a.status === 'RETIREE'
            ? lines.reduce((s, l) => s + l.quantity * l.unit_value, 0)
            : null,
        cerfa_available: a.cerfa_number != null,
      };
    });
    const totalValue = history.reduce((s, h) => s + (h.value ?? 0), 0);

    return {
      ...asso,
      distance_km:
        pharmacy?.lat != null && asso.lat != null
          ? Math.round(
              haversineKm(pharmacy.lat, pharmacy.lng!, asso.lat, asso.lng!) * 10
            ) / 10
          : null,
      stats,
      history,
      totals: {
        // Coût de revient HT + réduction d'impôt 60 % (art. 238 bis CGI)
        total_value: totalValue,
        tax_savings: totalValue * DONATION_TAX_REDUCTION_RATE,
      },
    };
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
