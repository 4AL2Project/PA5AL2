-- CreateTable
CREATE TABLE "Import" (
    "import_id" TEXT NOT NULL,
    "pharmacy_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "rows_total" INTEGER,
    "rows_ok" INTEGER,
    "rows_failed" INTEGER,
    "errors" JSONB,

    CONSTRAINT "Import_pkey" PRIMARY KEY ("import_id")
);

-- CreateIndex
CREATE INDEX "Import_pharmacy_id_uploaded_at_idx" ON "Import"("pharmacy_id", "uploaded_at");

-- AddForeignKey
ALTER TABLE "Import" ADD CONSTRAINT "Import_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "Pharmacy"("pharmacy_id") ON DELETE RESTRICT ON UPDATE CASCADE;
