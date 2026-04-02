-- CreateTable
CREATE TABLE "Pharmacy" (
    "pharmacy_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_upload_at" TIMESTAMP(3),
    "subscription_tier" TEXT NOT NULL DEFAULT 'free',

    CONSTRAINT "Pharmacy_pkey" PRIMARY KEY ("pharmacy_id")
);

-- CreateTable
CREATE TABLE "Product" (
    "product_id" TEXT NOT NULL,
    "pharmacy_id" TEXT NOT NULL,
    "external_sku" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "brand" TEXT,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "stock_quantity" INTEGER NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "cost_price" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "sale_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "pharmacy_id" TEXT NOT NULL,
    "sale_date" TIMESTAMP(3) NOT NULL,
    "quantity_sold" INTEGER NOT NULL,
    "unit_price_sold" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("sale_id")
);

-- CreateTable
CREATE TABLE "RiskAnalysis" (
    "analysis_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "pharmacy_id" TEXT NOT NULL,
    "analysis_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "days_to_expiry" INTEGER NOT NULL,
    "sales_velocity_30d" DOUBLE PRECISION NOT NULL,
    "expected_sales" DOUBLE PRECISION NOT NULL,
    "excess_stock" INTEGER NOT NULL,
    "risk_score" DOUBLE PRECISION NOT NULL,
    "risk_level" TEXT NOT NULL,
    "suggested_discount" INTEGER NOT NULL,
    "recoverable_value" DOUBLE PRECISION NOT NULL,
    "potential_loss" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RiskAnalysis_pkey" PRIMARY KEY ("analysis_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pharmacy_email_key" ON "Pharmacy"("email");

-- CreateIndex
CREATE INDEX "Product_pharmacy_id_expiry_date_idx" ON "Product"("pharmacy_id", "expiry_date");

-- CreateIndex
CREATE INDEX "Product_pharmacy_id_external_sku_idx" ON "Product"("pharmacy_id", "external_sku");

-- CreateIndex
CREATE INDEX "Sale_product_id_sale_date_idx" ON "Sale"("product_id", "sale_date");

-- CreateIndex
CREATE UNIQUE INDEX "RiskAnalysis_product_id_analysis_date_key" ON "RiskAnalysis"("product_id", "analysis_date");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "Pharmacy"("pharmacy_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "Pharmacy"("pharmacy_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAnalysis" ADD CONSTRAINT "RiskAnalysis_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAnalysis" ADD CONSTRAINT "RiskAnalysis_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "Pharmacy"("pharmacy_id") ON DELETE RESTRICT ON UPDATE CASCADE;
