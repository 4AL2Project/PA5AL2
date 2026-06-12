-- US-21 : rendre expiry_date optionnel sur Product
-- Les exports LGO réels ne contiennent pas de date de péremption
ALTER TABLE "Product" ALTER COLUMN "expiry_date" DROP NOT NULL;
