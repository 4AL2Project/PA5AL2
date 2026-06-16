import { RawRow } from './csv.parser';

export interface ProductRow {
  external_sku: string;
  lot_number?: string;
  name: string;
  category?: string;
  brand?: string;
  expiry_date?: string;
  stock_quantity: number;
  unit_price: number;
  cost_price?: number;
}

export interface SaleRow {
  external_sku: string;
  sale_date: string;
  quantity_sold: number;
  unit_price_sold?: number;
}

export interface UploadPayload {
  products: ProductRow[];
  sales: SaleRow[];
}

function isValidDate(value: string): boolean {
  const d = new Date(value);
  return !isNaN(d.getTime());
}

export function validateProductRow(row: RawRow, index: number): ProductRow {
  const errors: string[] = [];

  if (!row.external_sku) errors.push(`Row ${index}: missing external_sku`);
  if (!row.name) errors.push(`Row ${index}: missing product name`);
  if (row.expiry_date && !isValidDate(String(row.expiry_date)))
    errors.push(`Row ${index}: invalid expiry_date format`);

  const stock = parseInt(String(row.stock_quantity ?? ''), 10);
  if (isNaN(stock) || stock < 0)
    errors.push(`Row ${index}: invalid stock_quantity`);

  const price = parseFloat(String(row.unit_price ?? ''));
  if (isNaN(price) || price < 0)
    errors.push(`Row ${index}: invalid unit_price`);

  if (errors.length > 0) throw new Error(errors.join('; '));

  return {
    external_sku: String(row.external_sku),
    lot_number: row.lot_number ? String(row.lot_number) : undefined,
    name: String(row.name),
    category: row.category ? String(row.category) : undefined,
    brand: row.brand ? String(row.brand) : undefined,
    expiry_date: row.expiry_date ? String(row.expiry_date) : undefined,
    stock_quantity: stock,
    unit_price: price,
    cost_price: row.cost_price ? parseFloat(String(row.cost_price)) : undefined,
  };
}

export function validateSaleRow(row: RawRow, index: number): SaleRow {
  const errors: string[] = [];

  if (!row.external_sku) errors.push(`Row ${index}: missing external_sku`);
  if (!row.sale_date || !isValidDate(String(row.sale_date)))
    errors.push(`Row ${index}: invalid or missing sale_date`);

  const qty = parseInt(String(row.quantity_sold ?? ''), 10);
  if (isNaN(qty) || qty <= 0)
    errors.push(`Row ${index}: invalid quantity_sold`);

  if (errors.length > 0) throw new Error(errors.join('; '));

  return {
    external_sku: String(row.external_sku),
    sale_date: String(row.sale_date),
    quantity_sold: qty,
    unit_price_sold: row.unit_price_sold
      ? parseFloat(String(row.unit_price_sold))
      : undefined,
  };
}
