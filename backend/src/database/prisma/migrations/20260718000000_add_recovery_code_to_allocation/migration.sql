-- AlterTable : recovery_code alphanumérique court (SAV-XXXX) pour DonationAllocation
-- Backfill des lignes existantes avec un UUID tronqué pour ne pas bloquer la migration
ALTER TABLE "DonationAllocation" ADD COLUMN     "recovery_code" TEXT;
UPDATE "DonationAllocation" SET "recovery_code" = 'SAV-' || upper(substring(gen_random_uuid()::text, 1, 4)) WHERE "recovery_code" IS NULL;
ALTER TABLE "DonationAllocation" ALTER COLUMN "recovery_code" SET NOT NULL;
ALTER TABLE "DonationAllocation" ALTER COLUMN "recovery_code" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "DonationAllocation_recovery_code_key" ON "DonationAllocation"("recovery_code");
