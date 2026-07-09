import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  ORDER_CANCELLED_EVENT,
  ORDER_CREATED_EVENT,
  ORDER_READY_EVENT,
  OrderCancelledEvent,
} from '../order/order.events';
import {
  INotificationService,
  NOTIFICATION_SERVICE,
  OrderNotificationPayload,
} from './notification.interface';

// Écoute les événements émis par OrderService et déclenche les notifications
// de façon asynchrone — un échec d'envoi ne doit jamais faire échouer la
// requête HTTP d'origine (déjà commitée en base à ce stade).
@Injectable()
export class OrderNotificationListener {
  private readonly logger = new Logger(OrderNotificationListener.name);

  constructor(
    @Inject(NOTIFICATION_SERVICE)
    private readonly notifications: INotificationService
  ) {}

  @OnEvent(ORDER_CREATED_EVENT)
  async onOrderCreated(payload: OrderNotificationPayload) {
    await this.safely(ORDER_CREATED_EVENT, () =>
      Promise.all([
        this.notifications.orderConfirmed(payload),
        this.notifications.newOrderForPrep(payload),
      ])
    );
  }

  @OnEvent(ORDER_READY_EVENT)
  async onOrderReady(payload: OrderNotificationPayload) {
    await this.safely(ORDER_READY_EVENT, () =>
      this.notifications.orderReady(payload)
    );
  }

  @OnEvent(ORDER_CANCELLED_EVENT)
  async onOrderCancelled({ payload, reason }: OrderCancelledEvent) {
    await this.safely(ORDER_CANCELLED_EVENT, () =>
      this.notifications.orderCancelled(payload, reason)
    );
  }

  private async safely(event: string, fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (err) {
      this.logger.error(`Notification handler failed for ${event}: ${err}`);
    }
  }
}
