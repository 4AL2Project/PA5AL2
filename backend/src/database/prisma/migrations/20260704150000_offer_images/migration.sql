-- CreateTable
CREATE TABLE "OfferImage" (
    "image_id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferImage_pkey" PRIMARY KEY ("image_id")
);

-- CreateIndex
CREATE INDEX "OfferImage_offer_id_idx" ON "OfferImage"("offer_id");

-- AddForeignKey
ALTER TABLE "OfferImage" ADD CONSTRAINT "OfferImage_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "Offer"("offer_id") ON DELETE CASCADE ON UPDATE CASCADE;
