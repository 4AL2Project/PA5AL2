// Roger — v1.0
// Service génération reçu Cerfa PDF — US-32
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { prisma } from '../../database/client';
import { generateCerfaPdf } from './cerfa.generator';

@Injectable()
export class CerfaService {
  /**
   * Génère le PDF du reçu Cerfa pour un don.
   * Seul un don au statut RETIREE peut produire un reçu (invariant métier).
   * Isolé par pharmacy_id (multi-tenant).
   */
  async generateCerfa(donationId: string, pharmacyId: string): Promise<Buffer> {
    const donation = await prisma.donation.findFirst({
      where: { donation_id: donationId, pharmacy_id: pharmacyId },
      include: {
        product: { select: { name: true, lot_number: true } },
        association: {
          select: { name: true, address: true, city: true, postal_code: true },
        },
        pharmacy: {
          select: { name: true, address: true, siret: true },
        },
      },
    });

    if (!donation) throw new NotFoundException('Don introuvable');

    if (donation.status !== 'RETIREE') {
      throw new BadRequestException(
        `Le reçu Cerfa ne peut être généré que pour un don retiré (statut actuel : "${donation.status}")`
      );
    }

    return generateCerfaPdf({
      cerfa_number: donation.cerfa_number!,
      pharmacy_name: donation.pharmacy.name,
      pharmacy_address: donation.pharmacy.address ?? '',
      pharmacy_siret: donation.pharmacy.siret,
      association_name: donation.association.name,
      association_address: donation.association.address,
      association_city: donation.association.city,
      association_postal_code: donation.association.postal_code,
      product_name: donation.product.name,
      lot_number: donation.product.lot_number,
      quantity: donation.quantity,
      estimated_value: donation.estimated_value,
      withdrawn_at: donation.withdrawn_at!,
    });
  }
}
