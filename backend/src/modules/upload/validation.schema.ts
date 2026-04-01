export interface ProductRow {
  external_sku?: string;
  name: string;
  category?: string;
  brand?: string;
  expiry_date: string;
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

export function validateProductRow(row: any, index: number): ProductRow {
  const errors: string[] = [];

  if (!row.name) errors.push(`Row ${index}: missing product name`);
  if (!row.expiry_date || !isValidDate(row.expiry_date))
    errors.push(`Row ${index}: invalid or missing expiry_date`);

  const stock = parseInt(row.stock_quantity, 10);
  if (isNaN(stock) || stock < 0) errors.push(`Row ${index}: invalid stock_quantity`);

  const price = parseFloat(row.unit_price);
  if (isNaN(price) || price < 0) errors.push(`Row ${index}: invalid unit_price`);

  if (errors.length > 0) throw new Error(errors.join('; '));

  return {
    external_sku: row.external_sku || undefined,
    name: String(row.name),
    category: row.category || undefined,
    brand: row.brand || undefined,
    expiry_date: row.expiry_date,
    stock_quantity: stock,
    unit_price: price,
    cost_price: row.cost_price ? parseFloat(row.cost_price) : undefined,
  };
}

export function validateSaleRow(row: any, index: number): SaleRow {
  const errors: string[] = [];

  if (!row.external_sku) errors.push(`Row ${index}: missing external_sku`);
  if (!row.sale_date || !isValidDate(row.sale_date))
    errors.push(`Row ${index}: invalid or missing sale_date`);

  const qty = parseInt(row.quantity_sold, 10);
  if (isNaN(qty) || qty <= 0) errors.push(`Row ${index}: invalid quantity_sold`);

  if (errors.length > 0) throw new Error(errors.join('; '));

  return {
    external_sku: String(row.external_sku),
    sale_date: row.sale_date,
    quantity_sold: qty,
    unit_price_sold: row.unit_price_sold ? parseFloat(row.unit_price_sold) : undefined,
  };
}
