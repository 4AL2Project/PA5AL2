-- US-11: Add unique constraint on Sale to prevent duplicate imports
-- Dedup key: product_id + sale_date + quantity_sold

-- Remove existing duplicate rows before applying constraint (keep the oldest)
DELETE FROM "Sale" s1
USING "Sale" s2
WHERE s1.sale_id > s2.sale_id
  AND s1.product_id = s2.product_id
  AND s1.sale_date = s2.sale_date
  AND s1.quantity_sold = s2.quantity_sold;

-- Add unique constraint
CREATE UNIQUE INDEX "Sale_product_id_sale_date_quantity_sold_key"
  ON "Sale"("product_id", "sale_date", "quantity_sold");

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_product_id_sale_date_quantity_sold_key"
  UNIQUE USING INDEX "Sale_product_id_sale_date_quantity_sold_key";
