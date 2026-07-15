import { Injectable, Logger } from '@nestjs/common';

import {
  INotificationService,
  OrderNotificationPayload,
} from './notification.interface';

@Injectable()
export class ConsoleNotificationService implements INotificationService {
  private readonly logger = new Logger('Notification');

  private formatLines(payload: OrderNotificationPayload): string {
    return payload.lines
      .map((l) => `${l.quantity}× ${l.product_name}`)
      .join(', ');
  }

  async orderConfirmed(payload: OrderNotificationPayload): Promise<void> {
    this.logger.log(
      `[ORDER_CONFIRMED] → ${payload.customer_email} | order=${payload.order_id} | ${this.formatLines(payload)} | qr=${payload.qr_code}`
    );
  }

  async orderReady(payload: OrderNotificationPayload): Promise<void> {
    this.logger.log(
      `[ORDER_READY] → ${payload.customer_email} | order=${payload.order_id} | ${this.formatLines(payload)} @ ${payload.pharmacy_name}`
    );
  }

  async orderCancelled(
    payload: OrderNotificationPayload,
    reason?: string
  ): Promise<void> {
    this.logger.warn(
      `[ORDER_CANCELLED] → ${payload.customer_email} | order=${payload.order_id} | reason=${reason ?? 'n/a'}`
    );
  }

  async newOrderForPrep(payload: OrderNotificationPayload): Promise<void> {
    this.logger.log(
      `[NEW_ORDER_FOR_PREP] pharmacy=${payload.pharmacy_name} | order=${payload.order_id} | ${this.formatLines(payload)}`
    );
  }
}
