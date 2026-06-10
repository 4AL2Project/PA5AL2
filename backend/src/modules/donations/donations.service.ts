import {
  BadRequestException,
  Injectable,
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

    return prisma.donation.create({
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
    return prisma.donation.update({
      where: { donation_id: donationId },
      data: { status: 'ACCEPTEE', accepted_at: new Date() },
    });
  }

  async refuse(donationId: string, pharmacyId: string) {
    await this.assertOwner(donationId, pharmacyId, 'PROPOSEE');
    return prisma.donation.update({
      where: { donation_id: donationId },
      data: { status: 'REFUSEE' },
    });
  }

  async withdraw(donationId: string, pharmacyId: string) {
    await this.assertOwner(donationId, pharmacyId, 'ACCEPTEE');
    const cerfa_number = `CERFA-DON-${Date.now()}`;
    return prisma.donation.update({
      where: { donation_id: donationId },
      data: {
        status: 'RETIREE',
        withdrawn_at: new Date(),
        cerfa_number,
      },
    });
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
