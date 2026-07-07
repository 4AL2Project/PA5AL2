-- AlterTable: pharmacy_id nullable sur User pour les comptes ADMIN_SAVELY (sans officine)
ALTER TABLE "User" ALTER COLUMN "pharmacy_id" DROP NOT NULL;
