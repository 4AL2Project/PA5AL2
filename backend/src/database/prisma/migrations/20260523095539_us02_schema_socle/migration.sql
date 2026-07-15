-- US-02: socle du schéma de données
--  - external_sku obligatoire sur Product (anti-classification "critique" par erreur)
--  - unicité (pharmacy_id, external_sku) déplacée en base pour bloquer les doublons
--  - lot_number ajouté sur Product (prérequis Recall — obligation réglementaire)

-- Sécuriser la mise à jour des produits existants sans SKU avant la contrainte NOT NULL.
UPDATE "Product"
SET "external_sku" = 'LEGACY-' || "product_id"
WHERE "external_sku" IS NULL;

-- AlterTable: external_sku NOT NULL + lot_number nullable
ALTER TABLE "Product" ALTER COLUMN "external_sku" SET NOT NULL,
ADD COLUMN     "lot_number" TEXT;

-- DropIndex: l'index simple est remplacé par la contrainte d'unicité ci-dessous
DROP INDEX "Product_pharmacy_id_external_sku_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Product_pharmacy_id_external_sku_key" ON "Product"("pharmacy_id", "external_sku");
