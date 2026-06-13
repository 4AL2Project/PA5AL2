-- Centre d'actions dormantes
CREATE TABLE "Action" (
  "action_id"         TEXT NOT NULL,
  "product_id"        TEXT NOT NULL,
  "pharmacy_id"       TEXT NOT NULL,
  "type"              TEXT NOT NULL,
  "status"            TEXT NOT NULL DEFAULT 'EN_ATTENTE',
  "snooze_until"      TIMESTAMP(3),
  "days_of_cover"     DOUBLE PRECISION NOT NULL,
  "capital_locked"    DOUBLE PRECISION NOT NULL,
  "recoverable_value" DOUBLE PRECISION NOT NULL,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Action_pkey" PRIMARY KEY ("action_id")
);

CREATE UNIQUE INDEX "Action_product_id_key" ON "Action"("product_id");
CREATE INDEX "Action_pharmacy_id_status_idx" ON "Action"("pharmacy_id", "status");

ALTER TABLE "Action"
  ADD CONSTRAINT "Action_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "Product"("product_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Action"
  ADD CONSTRAINT "Action_pharmacy_id_fkey"
  FOREIGN KEY ("pharmacy_id") REFERENCES "Pharmacy"("pharmacy_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Associations bénéficiaires
CREATE TABLE "Association" (
  "association_id" TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "address"        TEXT NOT NULL,
  "city"           TEXT NOT NULL,
  "postal_code"    TEXT NOT NULL,
  "lat"            DOUBLE PRECISION,
  "lng"            DOUBLE PRECISION,
  "categories"     TEXT[],
  "contact_email"  TEXT,
  "contact_phone"  TEXT,
  "active"         BOOLEAN NOT NULL DEFAULT true,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Association_pkey" PRIMARY KEY ("association_id")
);

-- Dons médicamenteux
CREATE TABLE "Donation" (
  "donation_id"     TEXT NOT NULL,
  "product_id"      TEXT NOT NULL,
  "pharmacy_id"     TEXT NOT NULL,
  "association_id"  TEXT NOT NULL,
  "action_id"       TEXT,
  "quantity"        INTEGER NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'PROPOSEE',
  "estimated_value" DOUBLE PRECISION NOT NULL,
  "cerfa_number"    TEXT,
  "cerfa_pdf_url"   TEXT,
  "proposed_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "accepted_at"     TIMESTAMP(3),
  "withdrawn_at"    TIMESTAMP(3),
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Donation_pkey" PRIMARY KEY ("donation_id")
);

CREATE INDEX "Donation_pharmacy_id_status_idx" ON "Donation"("pharmacy_id", "status");

ALTER TABLE "Donation"
  ADD CONSTRAINT "Donation_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "Product"("product_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Donation"
  ADD CONSTRAINT "Donation_pharmacy_id_fkey"
  FOREIGN KEY ("pharmacy_id") REFERENCES "Pharmacy"("pharmacy_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Donation"
  ADD CONSTRAINT "Donation_association_id_fkey"
  FOREIGN KEY ("association_id") REFERENCES "Association"("association_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Donation"
  ADD CONSTRAINT "Donation_action_id_fkey"
  FOREIGN KEY ("action_id") REFERENCES "Action"("action_id")
  ON DELETE SET NULL ON UPDATE CASCADE;
