export type RiskLevel = 'critical' | 'high' | 'safe';
export type ActionStatus = 'EN_ATTENTE' | 'VALIDEE' | 'IGNOREE' | 'SNOOZEE';
export type ActionType = 'B2C' | 'DON';

export type ImportStatus = 'EN_ATTENTE' | 'EN_COURS' | 'TERMINÉ' | 'ÉCHOUÉ';
export type ImportFileType = 'products' | 'sales';

export interface ImportRecord {
  import_id: string;
  pharmacy_id: string;
  file_name: string;
  file_type: ImportFileType;
  uploaded_at: string;
  status: ImportStatus;
  rows_total: number | null;
  rows_ok: number | null;
  rows_failed: number | null;
  errors: string[] | null;
}

export interface DormantAction {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  brand: string;
  stock: number;
  unitPrice: number;
  type: ActionType;
  status: ActionStatus;
  snoozeUntil: string | null;
  daysOfCover: number;
  capitalLocked: number | null; // null si masqué (PREPARATEUR)
  recoverableValue: number | null;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  riskLevel: RiskLevel;
  daysOfCover: number;
  capitalLocked: number;
  stock: number;
  recoveryValue: number;
  salesVelocity30d: number;
  action: string;
  lastUpdated: string;
}

export interface AnalysisStats {
  totalProducts: number;
  criticalProducts: number;
  highProducts: number;
  safeProducts: number;
  totalCapitalLocked: number;
  totalRecoveryValue: number;
  lastAnalysisDate: string;
}

export interface RiskDistribution {
  level: RiskLevel;
  count: number;
  percentage: number;
}

// ─── B2C chain ──────────────────────────────────────────────────────────────

export type OfferStatus = 'ACTIVE' | 'SUSPENDUE' | 'TERMINEE';
export type OrderStatus =
  | 'RESERVEE'
  | 'EN_PREPARATION'
  | 'PRETE'
  | 'RETIREE'
  | 'ANNULEE'
  | 'EXPIREE';

export interface OfferImage {
  image_id: string;
  offer_id: string;
  url: string;
  position: number;
  created_at: string;
}

export interface Offer {
  offer_id: string;
  pharmacy_id: string;
  product_id: string;
  action_id: string | null;
  discounted_price: number;
  quantity_offered: number;
  status: OfferStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  product: {
    name: string;
    external_sku: string;
    category?: string;
    brand?: string;
  };
  images?: OfferImage[];
  _count?: { orders: number };
}

export interface OfferDetail {
  offer_id: string;
  pharmacy_id: string;
  product_id: string;
  action_id: string | null;
  discounted_price: number;
  quantity_offered: number;
  status: OfferStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  reserved_quantity: number;
  product: {
    name: string;
    external_sku: string;
    category: string | null;
    brand: string | null;
    unit_price: number;
    stock_quantity: number;
  };
  images: OfferImage[];
  _count?: { orders: number };
}

export interface Order {
  order_id: string;
  customer_id: string;
  offer_id: string;
  pharmacy_id: string;
  quantity: number;
  status: OrderStatus;
  qr_code: string;
  expires_at: string;
  reserved_at: string;
  prepared_at: string | null;
  ready_at: string | null;
  withdrawn_at: string | null;
  cancelled_at: string | null;
  customer: {
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  };
  offer: {
    discounted_price: number;
    product: { name: string; external_sku: string };
  };
}
