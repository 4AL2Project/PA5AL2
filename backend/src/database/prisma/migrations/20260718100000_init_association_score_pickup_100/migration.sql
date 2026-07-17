-- AlterTable : ajout du score de fiabilité des associations.
-- Démarre à 100 (valeur neutre) pour toutes les assos existantes.
ALTER TABLE "Association" ADD COLUMN "score_pickup" INTEGER NOT NULL DEFAULT 100;
UPDATE "Association" SET "score_pickup" = 100 WHERE "score_pickup" = 0;
