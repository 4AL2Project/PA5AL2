-- US-20 : Pivot moteur dormance — days_of_cover remplace days_to_expiry
-- Les données RiskAnalysis sont recalculées à chaque analyse : DROP sans perte.

ALTER TABLE "RiskAnalysis" DROP COLUMN "days_to_expiry";
ALTER TABLE "RiskAnalysis" DROP COLUMN "expected_sales";
ALTER TABLE "RiskAnalysis" DROP COLUMN "excess_stock";
ALTER TABLE "RiskAnalysis" DROP COLUMN "risk_score";

ALTER TABLE "RiskAnalysis" ADD COLUMN "days_of_cover" DOUBLE PRECISION NOT NULL DEFAULT 9999;
ALTER TABLE "RiskAnalysis" ADD COLUMN "capital_locked" DOUBLE PRECISION NOT NULL DEFAULT 0;
