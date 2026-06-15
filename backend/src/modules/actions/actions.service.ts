import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { prisma } from '../../database/client';

export type ActionStatus = 'EN_ATTENTE' | 'VALIDEE' | 'IGNOREE' | 'SNOOZEE';
export type ActionType = 'B2C' | 'DON';

const SNOOZE_HOURS = 48;

@Injectable()
export class ActionsService {
  /**
   * Appelé par AnalysisService après analyse d'un produit high/critical.
   * Crée si absent, rafraîchit le snapshot sinon sans écraser le statut user.
   */
  async upsertFromAnalysis(
    productId: string,
    pharmacyId: string,
    type: ActionType,
    snapshot: {
      days_of_cover: number;
      capital_locked: number;
      recoverable_value: number;
    }
  ) {
    return prisma.action.upsert({
      where: { product_id: productId },
      update: snapshot,
      create: {
        product_id: productId,
        pharmacy_id: pharmacyId,
        type,
        status: 'EN_ATTENTE',
        ...snapshot,
      },
    });
  }

  /**
   * Supprime l'action d'un produit redevenu safe (plus de stock dormant).
   */
  async removeIfExists(productId: string) {
    await prisma.action.deleteMany({ where: { product_id: productId } });
  }

  async listPending(pharmacyId: string) {
    const now = new Date();
    return prisma.action.findMany({
      where: {
        pharmacy_id: pharmacyId,
        OR: [
          { status: 'EN_ATTENTE' },
          { status: 'SNOOZEE', snooze_until: { lte: now } },
        ],
      },
      include: {
        product: {
          select: {
            name: true,
            external_sku: true,
            category: true,
            brand: true,
            stock_quantity: true,
            unit_price: true,
          },
        },
      },
      orderBy: { capital_locked: 'desc' },
    });
  }

  async listAll(pharmacyId: string) {
    return prisma.action.findMany({
      where: { pharmacy_id: pharmacyId },
      include: {
        product: {
          select: {
            name: true,
            external_sku: true,
            category: true,
            stock_quantity: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { capital_locked: 'desc' }],
    });
  }

  async validate(actionId: string, pharmacyId: string, type?: ActionType) {
    return this.transition(actionId, pharmacyId, 'VALIDEE', undefined, type);
  }

  async ignore(actionId: string, pharmacyId: string) {
    return this.transition(actionId, pharmacyId, 'IGNOREE');
  }

  async snooze(actionId: string, pharmacyId: string) {
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + SNOOZE_HOURS);
    return this.transition(actionId, pharmacyId, 'SNOOZEE', snoozeUntil);
  }

  async resetToEnAttente(actionId: string, pharmacyId: string) {
    return this.transition(actionId, pharmacyId, 'EN_ATTENTE');
  }

  private async transition(
    actionId: string,
    pharmacyId: string,
    status: ActionStatus,
    snoozeUntil?: Date,
    type?: ActionType
  ) {
    const action = await prisma.action.findFirst({
      where: { action_id: actionId, pharmacy_id: pharmacyId },
    });
    if (!action) throw new NotFoundException('Action introuvable');

    const validTransitions: Record<ActionStatus, ActionStatus[]> = {
      EN_ATTENTE: ['VALIDEE', 'IGNOREE', 'SNOOZEE'],
      SNOOZEE: ['VALIDEE', 'IGNOREE', 'EN_ATTENTE'],
      VALIDEE: ['EN_ATTENTE'],
      IGNOREE: ['EN_ATTENTE'],
    };

    const current = action.status as ActionStatus;
    if (!validTransitions[current].includes(status)) {
      throw new BadRequestException(
        `Transition ${current} → ${status} non autorisée`
      );
    }

    return prisma.action.update({
      where: { action_id: actionId },
      data: {
        status,
        snooze_until: snoozeUntil ?? null,
        ...(type ? { type } : {}),
      },
    });
  }
}
