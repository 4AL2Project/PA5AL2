/*
  Warnings:

  - You are about to drop the column `suggested_discount` on the `RiskAnalysis` table. All the data in the column will be lost.
  - Added the required column `suggested_action` to the `RiskAnalysis` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RiskAnalysis" DROP COLUMN "suggested_discount",
ADD COLUMN     "suggested_action" TEXT NOT NULL;
