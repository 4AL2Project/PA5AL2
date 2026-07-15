-- AlterTable
ALTER TABLE "Association" ADD COLUMN     "pickup_windows" JSONB;

-- AlterTable : qr_code ajouté avec backfill pour les allocations existantes
-- (le défaut applicatif est généré par Prisma, pas par la base)
ALTER TABLE "DonationAllocation" ADD COLUMN     "qr_code" TEXT;
UPDATE "DonationAllocation" SET "qr_code" = gen_random_uuid()::text WHERE "qr_code" IS NULL;
ALTER TABLE "DonationAllocation" ALTER COLUMN "qr_code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DonationAllocation_qr_code_key" ON "DonationAllocation"("qr_code");
