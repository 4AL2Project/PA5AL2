import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { prisma } from '../../database/client';
import { EmailService } from '../email/email.service';
import {
  INotificationService,
  OrderNotificationPayload,
} from './notification.interface';

/**
 * Implémentation de INotificationService : pour chaque évènement, persiste une
 * notification in-app (centre/cloche) ET envoie un email au rôle concerné.
 * Les évènements commande ciblent le Customer ; `newOrderForPrep` cible le staff
 * (préparateurs/titulaires) de l'officine.
 */
@Injectable()
export class NotificationDispatchService implements INotificationService {
  private readonly logger = new Logger('Notification');

  constructor(private readonly email: EmailService) {}

  private formatLines(p: OrderNotificationPayload): string {
    return p.lines.map((l) => `${l.quantity}× ${l.product_name}`).join(', ');
  }

  async orderConfirmed(p: OrderNotificationPayload): Promise<void> {
    const lines = this.formatLines(p);
    await this.notifyCustomer(p, {
      type: 'ORDER_CONFIRMED',
      title: 'Commande confirmée',
      body: `Votre commande chez ${p.pharmacy_name} est confirmée : ${lines}.`,
    });
    await this.safeEmail(() =>
      this.email.sendOrderConfirmedEmail(
        p.customer_email,
        p.pharmacy_name,
        lines
      )
    );
  }

  async orderReady(p: OrderNotificationPayload): Promise<void> {
    await this.notifyCustomer(p, {
      type: 'ORDER_READY',
      title: 'Commande prête à retirer',
      body: `Votre commande chez ${p.pharmacy_name} est prête. Présentez votre QR code au comptoir.`,
    });
    await this.safeEmail(() =>
      this.email.sendOrderReadyEmail(p.customer_email, p.pharmacy_name)
    );
  }

  async orderCancelled(
    p: OrderNotificationPayload,
    reason?: string
  ): Promise<void> {
    await this.notifyCustomer(p, {
      type: 'ORDER_CANCELLED',
      title: 'Commande annulée',
      body: reason
        ? `Votre commande chez ${p.pharmacy_name} a été annulée : ${reason}.`
        : `Votre commande chez ${p.pharmacy_name} a été annulée.`,
    });
    await this.safeEmail(() =>
      this.email.sendOrderCancelledEmail(
        p.customer_email,
        p.pharmacy_name,
        reason
      )
    );
  }

  async newOrderForPrep(p: OrderNotificationPayload): Promise<void> {
    const lines = this.formatLines(p);
    const staff = await prisma.user.findMany({
      where: {
        pharmacy_id: p.pharmacy_id,
        role: { in: ['PREPARATEUR', 'TITULAIRE'] },
        status: 'ACTIVE',
      },
      select: { user_id: true, email: true },
    });
    if (staff.length === 0) return;

    await prisma.notification.createMany({
      data: staff.map((u) => ({
        user_id: u.user_id,
        type: 'NEW_ORDER_FOR_PREP',
        title: 'Nouvelle commande à préparer',
        body: `Nouvelle commande à préparer : ${lines}.`,
        data: { orderId: p.order_id } as Prisma.InputJsonValue,
      })),
    });

    await Promise.all(
      staff.map((u) =>
        this.safeEmail(() =>
          this.email.sendNewOrderForPrepEmail(u.email, p.pharmacy_name, lines)
        )
      )
    );
  }

  /** Persiste la notification in-app du Customer propriétaire de la commande. */
  private async notifyCustomer(
    p: OrderNotificationPayload,
    n: { type: string; title: string; body: string }
  ): Promise<void> {
    await prisma.notification.create({
      data: {
        customer_id: p.customer_id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: { orderId: p.order_id } as Prisma.InputJsonValue,
      },
    });
  }

  /** Un échec d'email ne doit jamais casser la transition métier. */
  private async safeEmail(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (e) {
      this.logger.error(
        `Email de notification échoué: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}
