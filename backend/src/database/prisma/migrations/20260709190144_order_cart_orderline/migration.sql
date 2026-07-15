/*
  Warnings:

  - You are about to drop the column `offer_id` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `Order` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_offer_id_fkey";

-- DropIndex
DROP INDEX "Order_offer_id_status_idx";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "offer_id",
DROP COLUMN "quantity";

-- CreateTable
CREATE TABLE "OrderLine" (
    "order_line_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_snapshot" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("order_line_id")
);

-- CreateIndex
CREATE INDEX "OrderLine_order_id_idx" ON "OrderLine"("order_id");

-- CreateIndex
CREATE INDEX "OrderLine_offer_id_idx" ON "OrderLine"("offer_id");

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("order_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "Offer"("offer_id") ON DELETE RESTRICT ON UPDATE CASCADE;
