import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { prisma } from '../../database/client';

export interface CreateDonationDto {
  product_id: string;
  association_id: string;
  action_id?: string;
  quantity: number;
}

export type DonationStatus = 'PROPOSEE' | 'ACCEPTEE' | 'RETIREE' | 'REFUSEE';

@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);

  async create(pharmacyId: string, dto: CreateDonationDto) {
    const product = await prisma.product.findFirst({
      where: { product_id: dto.product_id, pharmacy_id: pharmacyId },
    });
    if (!product) throw new NotFoundException('Produit introuvable');

    if (dto.quantity <= 0 || dto.quantity > product.stock_quantity) {
      throw new BadRequestException(
        `Quantité invalide (stock disponible : ${product.stock_quantity})`
      );
    }

    const association = await prisma.association.findUnique({
      where: { association_id: dto.association_id, active: true },
    });
    if (!association) throw new NotFoundException('Association introuvable');

    const estimated_value = product.unit_price * dto.quantity;

    const donation = await prisma.donation.create({
      data: {
        product_id: dto.product_id,
        pharmacy_id: pharmacyId,
        association_id: dto.association_id,
        action_id: dto.action_id ?? null,
        quantity: dto.quantity,
        estimated_value,
        status: 'PROPOSEE',
      },
      include: { product: true, association: true },
    });
    this.logger.log(
      `[${pharmacyId}] Donation created: product=${dto.product_id}, qty=${dto.quantity}, assoc=${dto.association_id}, value=${estimated_value}`
    );
    return donation;
  }

  async listForPharmacy(pharmacyId: string, status?: DonationStatus) {
    return prisma.donation.findMany({
      where: {
        pharmacy_id: pharmacyId,
        ...(status ? { status } : {}),
      },
      include: {
        product: { select: { name: true, external_sku: true } },
        association: { select: { name: true, city: true } },
      },
      orderBy: { proposed_at: 'desc' },
    });
  }

  async accept(donationId: string, pharmacyId: string) {
    await this.assertOwner(donationId, pharmacyId, 'PROPOSEE');
    this.logger.log(`[${pharmacyId}] Donation accepted: ${donationId}`);
    return prisma.donation.update({
      where: { donation_id: donationId },
      data: { status: 'ACCEPTEE', accepted_at: new Date() },
    });
  }

  async refuse(donationId: string, pharmacyId: string) {
    await this.assertOwner(donationId, pharmacyId, 'PROPOSEE');
    this.logger.log(`[${pharmacyId}] Donation refused: ${donationId}`);
    return prisma.donation.update({
      where: { donation_id: donationId },
      data: { status: 'REFUSEE' },
    });
  }

  async withdraw(donationId: string, pharmacyId: string) {
    await this.assertOwner(donationId, pharmacyId, 'ACCEPTEE');
    const cerfa_number = `CERFA-DON-${Date.now()}`;
    this.logger.log(`[${pharmacyId}] Donation withdrawn: ${donationId} → cerfa=${cerfa_number}`);
    return prisma.donation.update({
      where: { donation_id: donationId },
      data: {
        status: 'RETIREE',
        withdrawn_at: new Date(),
        cerfa_number,
      },
    });
  }

  async getBilan(pharmacyId: string) {
    const donations = await prisma.donation.findMany({
      where: { pharmacy_id: pharmacyId },
      select: {
        status: true,
        estimated_value: true,
        association_id: true,
        product_id: true,
      },
    });

    const withdrawn = donations.filter((d) => d.status === 'RETIREE');

    const donations_by_status = {
      PROPOSEE: 0,
      ACCEPTEE: 0,
      RETIREE: 0,
      REFUSEE: 0,
    };
    for (const d of donations) {
      donations_by_status[d.status as DonationStatus]++;
    }

    return {
      total_donations: donations.length,
      total_withdrawn: withdrawn.length,
      total_value_donated: withdrawn.reduce(
        (sum, d) => sum + d.estimated_value,
        0
      ),
      total_associations: new Set(withdrawn.map((d) => d.association_id)).size,
      total_products_donated: new Set(withdrawn.map((d) => d.product_id)).size,
      donations_by_status,
    };
  }

  private async assertOwner(
    donationId: string,
    pharmacyId: string,
    requiredStatus: DonationStatus
  ) {
    const donation = await prisma.donation.findFirst({
      where: { donation_id: donationId, pharmacy_id: pharmacyId },
    });
    if (!donation) throw new NotFoundException('Don introuvable');
    if (donation.status !== requiredStatus) {
      throw new BadRequestException(
        `Statut actuel "${donation.status}" — transition requiert "${requiredStatus}"`
      );
    }
    return donation;
  }
}
