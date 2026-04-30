/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Port Out — interface d'envoi de notifications (email, push, SMS)
 */

export interface NotificationPayload {
  pharmacyId: string;
  sujet: string;
  corps: string;
}

export interface NotificationPort {
  notifier(payload: NotificationPayload): Promise<void>;
}

export const NOTIFICATION_PORT_TOKEN = Symbol('NOTIFICATION_PORT_TOKEN');
