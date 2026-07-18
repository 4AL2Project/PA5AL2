import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { prisma } from '../../database/client';
import {
  DONATION_TAX_REDUCTION_RATE,
  DonationLineSnapshot,
} from '../donations/donation.types';
import { AssociationStatsService } from './association-stats.service';
import {
  CreateAdminAssociationDto,
  UpdateAdminAssociationDto,
} from './dto/admin-association.dto';

export interface AdminListFilters {
  statut?: string;
  agrement?: string;
  onboarding?: string;
  fiabilite?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const SORTABLE_FIELDS = new Set(['created_at', 'name', 'status', 'city']);

@Injectable()
export class AdminAssociationsService {
  constructor(private readonly stats: AssociationStatsService) {}

  // ── Liste filtrée + paginée + triée ────────────────────────────────────────
  async list(filters: AdminListFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const sortBy = SORTABLE_FIELDS.has(filters.sortBy ?? '')
      ? filters.sortBy!
      : 'created_at';
    const sortOrder: 'asc' | 'desc' =
      filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const where: Prisma.AssociationWhereInput = {};

    if (filters.statut && filters.statut !== 'TOUS') {
      where.status = filters.statut;
    }
    if (filters.agrement === 'VALIDE') where.agrement_valide = true;
    else if (filters.agrement === 'MANQUANT') where.agrement_valide = false;

    if (filters.onboarding === 'ONBOARDEE') {
      where.is_onboarded = true;
    } else if (filters.onboarding === 'EN_ATTENTE') {
      where.is_onboarded = false;
      where.magic_link_token_hash = { not: null };
    } else if (filters.onboarding === 'JAMAIS_INVITEE') {
      where.is_onboarded = false;
      where.magic_link_token_hash = null;
    }

    if (filters.search) {
      const q = filters.search;
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { contact_email: { contains: q, mode: 'insensitive' } },
      ];
    }

    // On récupère toutes les assos matchant les filtres SQL, on calcule la
    // fiabilité (agrégat) puis on filtre par tranche de fiabilité en mémoire.
    const matching = await prisma.association.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
    });

    const ids = matching.map((a) => a.association_id);
    const reliability = await this.stats.getReliability(ids);
    const activity = await this.aggregateActivity(ids);

    let rows = matching.map((a) => {
      const score = Math.round((reliability.get(a.association_id) ?? 0) * 100);
      const act = activity.get(a.association_id) ?? {
        total_dons: 0,
        dons_en_cours: 0,
        last_activity_at: null,
      };
      return {
        ...a,
        fiabilite_score: score,
        stats: act,
      };
    });

    if (filters.fiabilite && filters.fiabilite !== 'TOUS') {
      rows = rows.filter((r) => {
        if (filters.fiabilite === 'CRITIQUE') return r.fiabilite_score < 50;
        if (filters.fiabilite === 'FAIBLE')
          return r.fiabilite_score >= 50 && r.fiabilite_score < 75;
        if (filters.fiabilite === 'BONNE') return r.fiabilite_score >= 75;
        return true;
      });
    }

    const total = rows.length;
    const paged = rows.slice((page - 1) * limit, page * limit);

    // Stats d'en-tête : calculées sur l'ensemble (sans filtre statut/agrément)
    const [totalAll, actives, agrementManquant] = await Promise.all([
      prisma.association.count(),
      prisma.association.count({ where: { status: 'ACTIVE' } }),
      prisma.association.count({ where: { agrement_valide: false } }),
    ]);

    return {
      data: paged,
      total,
      page,
      limit,
      stats: {
        total: totalAll,
        actives,
        agrement_manquant: agrementManquant,
      },
    };
  }

  // Agrège nb de dons total / en cours / dernière activité par association.
  private async aggregateActivity(ids: string[]) {
    const result = new Map<
      string,
      {
        total_dons: number;
        dons_en_cours: number;
        last_activity_at: Date | null;
      }
    >();
    if (ids.length === 0) return result;

    const grouped = await prisma.donationAllocation.groupBy({
      by: ['association_id', 'status'],
      where: { association_id: { in: ids } },
      _count: { _all: true },
    });
    const lastByAsso = await prisma.donationAllocation.groupBy({
      by: ['association_id'],
      where: { association_id: { in: ids } },
      _max: { pickup_slot_start: true },
    });

    for (const id of ids) {
      result.set(id, {
        total_dons: 0,
        dons_en_cours: 0,
        last_activity_at: null,
      });
    }
    for (const g of grouped) {
      const entry = result.get(g.association_id)!;
      entry.total_dons += g._count._all;
      if (g.status === 'PLANIFIEE') entry.dons_en_cours += g._count._all;
    }
    for (const l of lastByAsso) {
      const entry = result.get(l.association_id);
      if (entry) entry.last_activity_at = l._max.pickup_slot_start ?? null;
    }
    return result;
  }

  // ── Détail complet pour la fiche admin ─────────────────────────────────────
  async detail(id: string) {
    const asso = await prisma.association.findUnique({
      where: { association_id: id },
    });
    if (!asso) throw new NotFoundException('Association introuvable');

    const [stats, reliability, allocations, logs, notes] = await Promise.all([
      this.stats.getStats(id),
      this.stats.getReliability([id]),
      prisma.donationAllocation.findMany({
        where: { association_id: id, status: 'PLANIFIEE' },
        include: {
          donation: {
            include: {
              pharmacy: { select: { name: true, address: true } },
            },
          },
        },
        orderBy: { pickup_slot_start: 'asc' },
      }),
      prisma.associationLog.findMany({
        where: { association_id: id },
        orderBy: { created_at: 'desc' },
        take: 20,
      }),
      prisma.associationNote.findMany({
        where: { association_id: id },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    // Partenaires distincts + valeur totale HT reçue (allocations RETIREE)
    const retirees = await prisma.donationAllocation.findMany({
      where: { association_id: id, status: 'RETIREE' },
      include: { donation: { select: { pharmacy_id: true } } },
    });
    const partenaires = new Set(retirees.map((r) => r.donation.pharmacy_id));
    const valeurTotale = retirees.reduce((sum, r) => {
      const lines = r.lines as unknown as DonationLineSnapshot[];
      return sum + lines.reduce((s, l) => s + l.quantity * l.unit_value, 0);
    }, 0);

    const refus = await prisma.donationProposal.count({
      where: { association_id: id, status: 'REFUSEE' },
    });
    const echecsPickup = await prisma.donationAllocation.count({
      where: { association_id: id, status: 'NON_RECUPEREE' },
    });

    const active_dons = allocations.map((a) => ({
      allocation_id: a.allocation_id,
      status: a.status,
      pickup_slot_start: a.pickup_slot_start,
      pickup_slot_end: a.pickup_slot_end,
      donation: {
        donation_id: a.donation_id,
        pharmacy: {
          name: a.donation.pharmacy?.name ?? null,
          address: a.donation.pharmacy?.address ?? null,
        },
      },
      lines: (a.lines as unknown as DonationLineSnapshot[]).map((l) => ({
        name: l.name,
        quantity: l.quantity,
        unit_value: l.unit_value,
      })),
    }));

    return {
      ...asso,
      fiabilite: {
        score: Math.round((reliability.get(id) ?? 0) * 100),
        total_acceptes: stats.proposals_received,
        pickups_confirmes: retirees.length,
        echecs_pickup: echecsPickup,
        refus,
        avg_response_hours: stats.avg_response_hours,
        officines_partenaires: partenaires.size,
        valeur_totale_ht: valeurTotale,
        tax_savings: valeurTotale * DONATION_TAX_REDUCTION_RATE,
        last_donation_at: stats.last_donation_at,
      },
      active_dons,
      logs,
      notes,
    };
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  async create(dto: CreateAdminAssociationDto, adminEmail: string) {
    const asso = await prisma.association.create({
      data: {
        name: dto.name,
        contact_email: dto.email,
        contact_phone: dto.telephone ?? null,
        address: dto.address,
        city: dto.city,
        postal_code: dto.postal_code ?? '',
        agrement_numero: dto.agrement_numero ?? null,
        agrement_valide: dto.agrement_valide ?? false,
        categories: dto.categories ?? [],
        pickup_windows: dto.pickup_windows
          ? (dto.pickup_windows as unknown as Prisma.InputJsonValue)
          : undefined,
        status: 'ACTIVE',
        email_verified_at: new Date(),
      },
    });
    await this.log(asso.association_id, adminEmail, 'CREATED', dto.name);
    return asso;
  }

  async update(id: string, dto: UpdateAdminAssociationDto, adminEmail: string) {
    await this.ensureExists(id);
    const data: Prisma.AssociationUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.contact_email = dto.email;
    if (dto.telephone !== undefined) data.contact_phone = dto.telephone;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.postal_code !== undefined) data.postal_code = dto.postal_code;
    if (dto.agrement_numero !== undefined)
      data.agrement_numero = dto.agrement_numero;
    if (dto.agrement_valide !== undefined)
      data.agrement_valide = dto.agrement_valide;
    if (dto.categories !== undefined) data.categories = dto.categories;
    if (dto.pickup_windows !== undefined) {
      data.pickup_windows =
        dto.pickup_windows as unknown as Prisma.InputJsonValue;
    }

    const updated = await prisma.association.update({
      where: { association_id: id },
      data,
    });
    await this.log(id, adminEmail, 'UPDATED', null);
    return updated;
  }

  // ── Changement de statut ────────────────────────────────────────────────────
  async patchStatut(
    id: string,
    statut: 'ACTIVE' | 'SUSPENDUE' | 'BLACKLISTEE',
    raison: string | undefined,
    adminEmail: string
  ) {
    const asso = await this.ensureExists(id);

    if (statut === 'BLACKLISTEE' && asso.status !== 'SUSPENDUE') {
      throw new BadRequestException(
        'Une association ne peut être blacklistée que depuis le statut SUSPENDUE'
      );
    }

    const data: Prisma.AssociationUpdateInput = { status: statut };
    if (statut === 'BLACKLISTEE') data.blacklisted_at = new Date();
    if (statut === 'ACTIVE') data.blacklisted_at = null;

    const updated = await prisma.association.update({
      where: { association_id: id },
      data,
    });
    await this.log(
      id,
      adminEmail,
      'STATUS_CHANGED',
      raison
        ? `${asso.status} → ${statut} : ${raison}`
        : `${asso.status} → ${statut}`
    );
    return updated;
  }

  // ── Notes ────────────────────────────────────────────────────────────────────
  async listNotes(id: string) {
    await this.ensureExists(id);
    return prisma.associationNote.findMany({
      where: { association_id: id },
      orderBy: { created_at: 'desc' },
    });
  }

  async addNote(id: string, contenu: string, adminEmail: string) {
    await this.ensureExists(id);
    const note = await prisma.associationNote.create({
      data: { association_id: id, admin_email: adminEmail, contenu },
    });
    await this.log(id, adminEmail, 'NOTE_ADDED', null);
    return note;
  }

  // ── Logs ─────────────────────────────────────────────────────────────────────
  async listLogs(id: string, page = 1, limit = 20) {
    await this.ensureExists(id);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [items, total] = await Promise.all([
      prisma.associationLog.findMany({
        where: { association_id: id },
        orderBy: { created_at: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      prisma.associationLog.count({ where: { association_id: id } }),
    ]);
    return { data: items, total, page: safePage, limit: safeLimit };
  }

  // ── Export CSV ───────────────────────────────────────────────────────────────
  async exportCsv(): Promise<string> {
    const assos = await prisma.association.findMany({
      orderBy: { name: 'asc' },
    });
    const ids = assos.map((a) => a.association_id);
    const reliability = await this.stats.getReliability(ids);

    const grouped = await prisma.donationAllocation.groupBy({
      by: ['association_id', 'status'],
      where: { association_id: { in: ids } },
      _count: { _all: true },
    });
    const counts = new Map<
      string,
      { total: number; retirees: number; echecs: number; last: Date | null }
    >();
    for (const id of ids) {
      counts.set(id, { total: 0, retirees: 0, echecs: 0, last: null });
    }
    for (const g of grouped) {
      const c = counts.get(g.association_id)!;
      c.total += g._count._all;
      if (g.status === 'RETIREE') c.retirees += g._count._all;
      if (g.status === 'NON_RECUPEREE') c.echecs += g._count._all;
    }
    const lasts = await prisma.donationAllocation.groupBy({
      by: ['association_id'],
      where: { association_id: { in: ids } },
      _max: { pickup_slot_start: true },
    });
    for (const l of lasts) {
      const c = counts.get(l.association_id);
      if (c) c.last = l._max.pickup_slot_start ?? null;
    }

    const header = [
      'Nom',
      'Email',
      'Téléphone',
      'Adresse',
      'Ville',
      'Statut',
      'Agrément',
      'Onboardée',
      'Score fiabilité',
      'Nb dons total',
      'Nb dons complétés',
      'Nb échecs',
      'Dernière activité',
    ];

    const rows = assos.map((a) => {
      const c = counts.get(a.association_id)!;
      const score = Math.round((reliability.get(a.association_id) ?? 0) * 100);
      return [
        a.name,
        a.contact_email ?? '',
        a.contact_phone ?? '',
        a.address,
        a.city,
        a.status,
        a.agrement_valide ? 'Validé' : 'Manquant',
        a.is_onboarded ? 'Oui' : 'Non',
        String(score),
        String(c.total),
        String(c.retirees),
        String(c.echecs),
        c.last ? c.last.toISOString().slice(0, 10) : '',
      ];
    });

    const escape = (v: string) =>
      /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    return [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  private async ensureExists(id: string) {
    const asso = await prisma.association.findUnique({
      where: { association_id: id },
    });
    if (!asso) throw new NotFoundException('Association introuvable');
    return asso;
  }

  async log(
    associationId: string,
    adminEmail: string | null,
    action: string,
    details: string | null
  ) {
    await prisma.associationLog.create({
      data: {
        association_id: associationId,
        admin_email: adminEmail,
        action,
        details,
      },
    });
  }
}
