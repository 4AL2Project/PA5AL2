export interface CustomerJwtPayload {
  sub: string; // customer_id
  email: string;
  type: 'customer';
}
