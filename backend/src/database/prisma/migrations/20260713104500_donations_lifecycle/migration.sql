-- DropForeignKey
ALTER TABLE "Donation" DROP CONSTRAINT "Donation_association_id_fkey";

-- DropForeignKey
ALTER TABLE "Donation" DROP CONSTRAINT "Donation_product_id_fkey";

-- AlterTable
ALTER TABLE "Association" DROP COLUMN "active",
ADD COLUMN     "action_radius_km" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "fiscal_receipt_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_proposal_at" TIMESTAMP(3),
ADD COLUMN     "pickup_sla_days" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "response_sla_hours" INTEGER NOT NULL DEFAULT 72,
ADD COLUMN     "rna_or_siren" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "verify_token_expires_at" TIMESTAMP(3),
ADD COLUMN     "verify_token_hash" TEXT;

-- AlterTable
ALTER TABLE "Donation" DROP COLUMN "accepted_at",
DROP COLUMN "association_id",
DROP COLUMN "cerfa_number",
DROP COLUMN "cerfa_pdf_url",
DROP COLUMN "estimated_value",
DROP COLUMN "product_id",
DROP COLUMN "proposed_at",
DROP COLUMN "quantity",
DROP COLUMN "withdrawn_at",
ADD COLUMN     "attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'EN_COURS';

-- AlterTable
ALTER TABLE "Pharmacy" ADD COLUMN     "donation_pickup_windows" JSONB;

-- CreateTable
CREATE TABLE "DonationLine" (
    "line_id" TEXT NOT NULL,
    "donation_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity_total" INTEGER NOT NULL,
    "quantity_allocated" INTEGER NOT NULL DEFAULT 0,
    "unit_value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DonationLine_pkey" PRIMARY KEY ("line_id")
);

-- CreateTable
CREATE TABLE "DonationProposal" (
    "proposal_id" TEXT NOT NULL,
    "donation_id" TEXT NOT NULL,
    "association_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENVOYEE',
    "refusal_reason" TEXT,
    "proposed_lines" JSONB NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonationProposal_pkey" PRIMARY KEY ("proposal_id")
);

-- CreateTable
CREATE TABLE "DonationAllocation" (
    "allocation_id" TEXT NOT NULL,
    "donation_id" TEXT NOT NULL,
    "association_id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANIFIEE',
    "pickup_slot_start" TIMESTAMP(3) NOT NULL,
    "pickup_slot_end" TIMESTAMP(3) NOT NULL,
    "picked_up_by" TEXT,
    "picked_up_at" TIMESTAMP(3),
    "cerfa_number" TEXT,

    CONSTRAINT "DonationAllocation_pkey" PRIMARY KEY ("allocation_id")
);

-- CreateTable
CREATE TABLE "DonationEvent" (
    "event_id" TEXT NOT NULL,
    "donation_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationEvent_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "DonationEmailLog" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT,
    "allocation_id" TEXT,
    "email_type" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DonationLine_donation_id_product_id_key" ON "DonationLine"("donation_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "DonationProposal_token_key" ON "DonationProposal"("token");

-- CreateIndex
CREATE INDEX "DonationProposal_status_expires_at_idx" ON "DonationProposal"("status", "expires_at");

-- CreateIndex
CREATE INDEX "DonationProposal_donation_id_idx" ON "DonationProposal"("donation_id");

-- CreateIndex
CREATE UNIQUE INDEX "DonationAllocation_proposal_id_key" ON "DonationAllocation"("proposal_id");

-- CreateIndex
CREATE INDEX "DonationAllocation_association_id_status_idx" ON "DonationAllocation"("association_id", "status");

-- CreateIndex
CREATE INDEX "DonationAllocation_status_pickup_slot_end_idx" ON "DonationAllocation"("status", "pickup_slot_end");

-- CreateIndex
CREATE INDEX "DonationEvent_donation_id_created_at_idx" ON "DonationEvent"("donation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "DonationEmailLog_proposal_id_email_type_key" ON "DonationEmailLog"("proposal_id", "email_type");

-- CreateIndex
CREATE UNIQUE INDEX "DonationEmailLog_allocation_id_email_type_key" ON "DonationEmailLog"("allocation_id", "email_type");

-- CreateIndex
CREATE UNIQUE INDEX "Association_verify_token_hash_key" ON "Association"("verify_token_hash");

-- AddForeignKey
ALTER TABLE "DonationLine" ADD CONSTRAINT "DonationLine_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "Donation"("donation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationLine" ADD CONSTRAINT "DonationLine_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationProposal" ADD CONSTRAINT "DonationProposal_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "Donation"("donation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationProposal" ADD CONSTRAINT "DonationProposal_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "Association"("association_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationAllocation" ADD CONSTRAINT "DonationAllocation_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "Donation"("donation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationAllocation" ADD CONSTRAINT "DonationAllocation_association_id_fkey" FOREIGN KEY ("association_id") REFERENCES "Association"("association_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationAllocation" ADD CONSTRAINT "DonationAllocation_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "DonationProposal"("proposal_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonationEvent" ADD CONSTRAINT "DonationEvent_donation_id_fkey" FOREIGN KEY ("donation_id") REFERENCES "Donation"("donation_id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Invariant métier : on ne peut jamais allouer plus que le lot (cas limite n°3 —
-- acceptation partielle concurrente du reliquat, vérifié en base)
ALTER TABLE "DonationLine" ADD CONSTRAINT "DonationLine_allocated_lte_total" CHECK ("quantity_allocated" >= 0 AND "quantity_allocated" <= "quantity_total");
