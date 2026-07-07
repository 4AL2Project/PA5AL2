-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "category_id" TEXT NOT NULL,
    "pharmacy_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "_OfferCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Category_pharmacy_id_idx" ON "Category"("pharmacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "Category_pharmacy_id_slug_key" ON "Category"("pharmacy_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "_OfferCategories_AB_unique" ON "_OfferCategories"("A", "B");

-- CreateIndex
CREATE INDEX "_OfferCategories_B_index" ON "_OfferCategories"("B");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "Pharmacy"("pharmacy_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OfferCategories" ADD CONSTRAINT "_OfferCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("category_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OfferCategories" ADD CONSTRAINT "_OfferCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Offer"("offer_id") ON DELETE CASCADE ON UPDATE CASCADE;
