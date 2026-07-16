-- Migration: add_asso_auth_and_cerfa_urls
-- Ajoute les champs d'authentification magic link pour l'espace association
-- et les URLs de stockage S3 pour le Cerfa PDF et le QR code de l'allocation.

-- Association : magic link + onboarding + profil enrichi
ALTER TABLE "Association" ADD COLUMN IF NOT EXISTS "magic_link_token_hash" TEXT;
ALTER TABLE "Association" ADD COLUMN IF NOT EXISTS "magic_link_expires_at" TIMESTAMP(3);
ALTER TABLE "Association" ADD COLUMN IF NOT EXISTS "is_onboarded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Association" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Association" ADD COLUMN IF NOT EXISTS "site_web" TEXT;

-- Contrainte d'unicité sur le hash du magic link (un seul token actif par asso)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'Association'
      AND indexname = 'Association_magic_link_token_hash_key'
  ) THEN
    CREATE UNIQUE INDEX "Association_magic_link_token_hash_key" ON "Association"("magic_link_token_hash");
  END IF;
END $$;

-- DonationAllocation : URLs S3 du Cerfa PDF et du QR code
ALTER TABLE "DonationAllocation" ADD COLUMN IF NOT EXISTS "cerfa_url" TEXT;
ALTER TABLE "DonationAllocation" ADD COLUMN IF NOT EXISTS "qr_code_url" TEXT;
