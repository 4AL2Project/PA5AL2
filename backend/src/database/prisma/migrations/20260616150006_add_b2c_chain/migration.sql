-- CreateTable
CREATE TABLE "Customer" (
    "customer_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "offer_id" TEXT NOT NULL,
    "pharmacy_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "action_id" TEXT,
    "discounted_price" DOUBLE PRECISION NOT NULL,
    "quantity_offered" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("offer_id")
);

-- CreateTable
CREATE TABLE "Order" (
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "pharmacy_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVEE',
    "qr_code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prepared_at" TIMESTAMP(3),
    "ready_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("order_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_product_id_key" ON "Offer"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_action_id_key" ON "Offer"("action_id");

-- CreateIndex
CREATE INDEX "Offer_pharmacy_id_status_idx" ON "Offer"("pharmacy_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_qr_code_key" ON "Order"("qr_code");

-- CreateIndex
CREATE INDEX "Order_pharmacy_id_status_idx" ON "Order"("pharmacy_id", "status");

-- CreateIndex
CREATE INDEX "Order_offer_id_status_idx" ON "Order"("offer_id", "status");

-- CreateIndex
CREATE INDEX "Order_expires_at_status_idx" ON "Order"("expires_at", "status");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "Pharmacy"("pharmacy_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "Action"("action_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "Offer"("offer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "Pharmacy"("pharmacy_id") ON DELETE RESTRICT ON UPDATE CASCADE;
