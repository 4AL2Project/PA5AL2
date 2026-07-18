// Service génération reçu Cerfa PDF — un reçu par allocation retirée
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { prisma } from '../../database/client';
import { generateCerfaPdf } from './cerfa.generator';
import { DonationLineSnapshot } from './donation.types';

@Injectable()
export class CerfaService {
  /**
   * Génère le PDF du reçu Cerfa pour une allocation.
   * Seule une allocation RETIREE peut produire un reçu (invariant métier) et
   * les valeurs sont celles des lignes de CETTE allocation uniquement.
   * Isolé par pharmacy_id (multi-tenant).
   */
  async generateCerfa(
    allocationId: string,
    pharmacyId: string
  ): Promise<Buffer> {
    const allocation = await prisma.donationAllocation.findFirst({
      where: {
        allocation_id: allocationId,
        donation: { pharmacy_id: pharmacyId },
      },
      include: {
        association: {
          select: { name: true, address: true, city: true, postal_code: true },
        },
        donation: {
          include: {
            pharmacy: { select: { name: true, address: true, siret: true } },
          },
        },
      },
    });

    if (!allocation) throw new NotFoundException('Allocation introuvable');

    if (allocation.status !== 'RETIREE') {
      throw new BadRequestException(
        `Le reçu Cerfa ne peut être généré que pour un retrait confirmé (statut actuel : "${allocation.status}")`
      );
    }

    const lines = allocation.lines as unknown as DonationLineSnapshot[];
    const products = await prisma.product.findMany({
      where: { product_id: { in: lines.map((l) => l.product_id) } },
      select: { product_id: true, lot_number: true },
    });
    const lotByProduct = new Map(
      products.map((p) => [p.product_id, p.lot_number])
    );

    return generateCerfaPdf({
      cerfa_number: allocation.cerfa_number!,
      pharmacy_name: allocation.donation.pharmacy.name,
      pharmacy_address: allocation.donation.pharmacy.address ?? '',
      pharmacy_siret: allocation.donation.pharmacy.siret,
      association_name: allocation.association.name,
      association_address: allocation.association.address,
      association_city: allocation.association.city,
      association_postal_code: allocation.association.postal_code,
      lines: lines.map((l) => ({
        product_name: l.name,
        lot_number: lotByProduct.get(l.product_id) ?? null,
        quantity: l.quantity,
        unit_value: l.unit_value,
      })),
      withdrawn_at: allocation.picked_up_at!,
    });
  }
}
