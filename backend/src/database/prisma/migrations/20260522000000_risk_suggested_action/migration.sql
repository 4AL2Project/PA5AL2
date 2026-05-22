-- Align RiskAnalysis with the 3-level risk model:
-- replace the legacy `suggested_discount` column with `suggested_action`.
ALTER TABLE "RiskAnalysis" DROP COLUMN "suggested_discount",
ADD COLUMN     "suggested_action" TEXT NOT NULL;
