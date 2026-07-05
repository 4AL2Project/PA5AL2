-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "password" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CustomerOtp" (
    "otp_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerOtp_pkey" PRIMARY KEY ("otp_id")
);

-- CreateIndex
CREATE INDEX "CustomerOtp_email_created_at_idx" ON "CustomerOtp"("email", "created_at");
