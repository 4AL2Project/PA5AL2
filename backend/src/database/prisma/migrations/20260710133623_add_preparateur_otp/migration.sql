-- CreateTable
CREATE TABLE "UserOtp" (
    "otp_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserOtp_pkey" PRIMARY KEY ("otp_id")
);

-- CreateIndex
CREATE INDEX "UserOtp_user_id_created_at_idx" ON "UserOtp"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "UserOtp" ADD CONSTRAINT "UserOtp_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Les préparateurs se connectent désormais par code OTP. Les hash de mot de passe
-- existants ne sont plus lus au login : on les supprime plutôt que de les laisser
-- traîner en base comme credentials dormants.
UPDATE "User" SET "password" = NULL WHERE "role" = 'PREPARATEUR';
