-- CreateTable
CREATE TABLE "DonParametres" (
    "id" TEXT NOT NULL,
    "pharmacy_id" TEXT NOT NULL,
    "seuil_dormance_jours" INTEGER NOT NULL DEFAULT 90,
    "rayon_matching_km" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DonParametres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DonParametres_pharmacy_id_key" ON "DonParametres"("pharmacy_id");

-- AddForeignKey
ALTER TABLE "DonParametres" ADD CONSTRAINT "DonParametres_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "Pharmacy"("pharmacy_id") ON DELETE RESTRICT ON UPDATE CASCADE;
