import { Injectable } from '@nestjs/common';

import { prisma } from '../../database/client';

/**
 * Service applicatif du centre de notifications in-app : lecture et marquage de
 * l'historique. L'émission (persistance + email) est faite par
 * NotificationDispatchService, découplée de la lecture.
 */
@Injectable()
export class NotificationService {

  async listForCustomer(customerId: string) {
    return this.list({ customer_id: customerId });
  }

  async listForStaff(userId: string) {
    return this.list({ user_id: userId });
  }

  private async list(where: { customer_id?: string; user_id?: string }) {
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      prisma.notification.count({ where: { ...where, read_at: null } }),
    ]);
    return { items, unreadCount };
  }

  async markCustomerRead(customerId: string, notificationId: string) {
    return this.markRead({ customer_id: customerId }, notificationId);
  }

  async markStaffRead(userId: string, notificationId: string) {
    return this.markRead({ user_id: userId }, notificationId);
  }

  private async markRead(
    owner: { customer_id?: string; user_id?: string },
    notificationId: string
  ) {
    // updateMany avec le filtre owner : un destinataire ne peut marquer que les
    // siennes (renvoie count=0 si l'id n'appartient pas à l'appelant).
    const res = await prisma.notification.updateMany({
      where: { ...owner, notification_id: notificationId, read_at: null },
      data: { read_at: new Date() },
    });
    return { updated: res.count };
  }

  async markAllCustomerRead(customerId: string) {
    return this.markAllRead({ customer_id: customerId });
  }

  async markAllStaffRead(userId: string) {
    return this.markAllRead({ user_id: userId });
  }

  private async markAllRead(owner: { customer_id?: string; user_id?: string }) {
    const res = await prisma.notification.updateMany({
      where: { ...owner, read_at: null },
      data: { read_at: new Date() },
    });
    return { updated: res.count };
  }
}
