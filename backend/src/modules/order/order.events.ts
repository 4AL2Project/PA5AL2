import { OrderNotificationPayload } from '../notification/notification.interface';

export const ORDER_CREATED_EVENT = 'order.created';
export const ORDER_READY_EVENT = 'order.ready';
export const ORDER_CANCELLED_EVENT = 'order.cancelled';

export interface OrderCancelledEvent {
  payload: OrderNotificationPayload;
  reason?: string;
}
