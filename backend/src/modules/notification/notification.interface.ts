export interface OrderLineSummary {
  product_name: string;
  quantity: number;
}

export interface OrderNotificationPayload {
  order_id: string;
  customer_id: string;
  pharmacy_id: string;
  customer_email: string;
  customer_name?: string;
  pharmacy_name: string;
  lines: OrderLineSummary[];
  qr_code?: string;
}

export const NOTIFICATION_SERVICE = Symbol('NOTIFICATION_SERVICE');

export interface INotificationService {
  orderConfirmed(payload: OrderNotificationPayload): Promise<void>;
  orderReady(payload: OrderNotificationPayload): Promise<void>;
  orderCancelled(
    payload: OrderNotificationPayload,
    reason?: string
  ): Promise<void>;
  newOrderForPrep(payload: OrderNotificationPayload): Promise<void>;
}
