-- US-64: Auth — Invitation & Magic Link
--  - User: first_name, last_name, phone, status (PENDING|ACTIVE), accepted_terms_at
--  - User.password devient nullable (les titulaires invités n'ont pas de mot de passe)
--  - Pharmacy.siret ajouté
--  - Nouvelle table AuthToken (tokens d'invitation et magic-link hashés SHA-256)

-- AlterTable User
ALTER TABLE "User"
  ALTER COLUMN "password" DROP NOT NULL,
  ADD COLUMN "status"            TEXT      NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "first_name"        TEXT,
  ADD COLUMN "last_name"         TEXT,
  ADD COLUMN "phone"             TEXT,
  ADD COLUMN "accepted_terms_at" TIMESTAMP(3);

-- AlterTable Pharmacy
ALTER TABLE "Pharmacy"
  ADD COLUMN "siret" TEXT;

-- CreateTable AuthToken
CREATE TABLE "AuthToken" (
  "id"          TEXT      NOT NULL,
  "user_id"     TEXT      NOT NULL,
  "token_hash"  TEXT      NOT NULL,
  "type"        TEXT      NOT NULL,
  "expires_at"  TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_token_hash_key" ON "AuthToken"("token_hash");
CREATE INDEX "AuthToken_token_hash_idx" ON "AuthToken"("token_hash");

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("user_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
