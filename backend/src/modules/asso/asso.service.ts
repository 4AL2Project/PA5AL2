import { Injectable, NotFoundException } from '@nestjs/common';

import { prisma } from '../../database/client';

export interface UpdateAssoProfileDto {
  name?: string;
  address?: string;
  contact_phone?: string;
  site_web?: string;
  description?: string;
  categories?: string[];
  pickup_windows?: unknown;
}

@Injectable()
export class AssoService {
  // ── Profil ────────────────────────────────────────────────────────────────

  async getProfile(associationId: string) {
    const asso = await prisma.association.findUnique({
      where: { association_id: associationId },
      select: {
        association_id: true,
        name: true,
        address: true,
        city: true,
        postal_code: true,
        contact_email: true,
        contact_phone: true,
        logo_url: true,
        description: true,
        site_web: true,
        categories: true,
        pickup_windows: true,
        rna_or_siren: true,
        fiscal_receipt_verified: true,
        is_onboarded: true,
        status: true,
        created_at: true,
      },
    });
    if (!asso) throw new NotFoundException('Association introuvable');
    return asso;
  }

  async updateProfile(associationId: string, dto: UpdateAssoProfileDto) {
    const asso = await prisma.association.findUnique({
      where: { association_id: associationId },
    });
    if (!asso) throw new NotFoundException('Association introuvable');

    const updated = await prisma.association.update({
      where: { association_id: associationId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.contact_phone !== undefined && {
          contact_phone: dto.contact_phone,
        }),
        ...(dto.site_web !== undefined && { site_web: dto.site_web }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.categories !== undefined && { categories: dto.categories }),
        ...(dto.pickup_windows !== undefined && {
          pickup_windows: dto.pickup_windows as object,
        }),
        // Marquer l'onboarding complété dès le premier PUT /asso/me
        ...(!asso.is_onboarded && { is_onboarded: true }),
      },
    });
    return updated;
  }

  // ── Offres (propositions) ─────────────────────────────────────────────────

  async getOffres(associationId: string) {
    return prisma.donationProposal.findMany({
      where: {
        association_id: associationId,
        status: 'ENVOYEE',
      },
      include: {
        donation: {
          include: {
            pharmacy: {
              select: {
                pharmacy_id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: { sent_at: 'desc' },
    });
  }

  async getOffre(associationId: string, proposalId: string) {
    const proposal = await prisma.donationProposal.findFirst({
      where: {
        proposal_id: proposalId,
        association_id: associationId,
      },
      include: {
        donation: {
          include: {
            pharmacy: {
              select: {
                pharmacy_id: true,
                name: true,
                address: true,
                donation_pickup_windows: true,
              },
            },
          },
        },
        association: {
          select: {
            association_id: true,
            name: true,
            pickup_windows: true,
            pickup_sla_days: true,
          },
        },
      },
    });
    if (!proposal) throw new NotFoundException('Proposition introuvable');
    return proposal;
  }

  // ── Dons (allocations) ────────────────────────────────────────────────────

  async getDons(associationId: string) {
    return prisma.donationAllocation.findMany({
      where: { association_id: associationId },
      include: {
        donation: {
          include: {
            pharmacy: {
              select: { pharmacy_id: true, name: true, address: true },
            },
          },
        },
      },
      orderBy: { pickup_slot_start: 'desc' },
    });
  }

  async getDon(associationId: string, allocationId: string) {
    const allocation = await prisma.donationAllocation.findFirst({
      where: {
        allocation_id: allocationId,
        association_id: associationId,
      },
      include: {
        donation: {
          include: {
            pharmacy: {
              select: { pharmacy_id: true, name: true, address: true },
            },
          },
        },
      },
    });
    if (!allocation) throw new NotFoundException('Allocation introuvable');
    return allocation;
  }
}
