-- US-80: ajout coordonnées GPS sur Pharmacy pour la recherche géolocalisée
ALTER TABLE "Pharmacy" ADD COLUMN "lat" DOUBLE PRECISION;
ALTER TABLE "Pharmacy" ADD COLUMN "lng" DOUBLE PRECISION;
