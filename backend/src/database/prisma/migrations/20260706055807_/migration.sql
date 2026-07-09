-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_pharmacy_id_fkey";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "Pharmacy"("pharmacy_id") ON DELETE SET NULL ON UPDATE CASCADE;
