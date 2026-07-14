import { Injectable, Logger } from '@nestjs/common';

import { prisma } from '../database/client';
import { AnalysisService } from '../modules/analysis/analysis.service';

// Recalcul quotidien du risque pour toutes les pharmacies. Le déclenchement n'est
// plus porté par un @Cron in-process : c'est le service `scheduler` qui enfile le
// job `daily-analysis`, exécuté ici par le `MaintenanceWorker`.
@Injectable()
export class AnalysisJob {
  private readonly logger = new Logger(AnalysisJob.name);

  constructor(private readonly analysisService: AnalysisService) {}

  async runDailyAnalysis() {
    this.logger.log('Starting daily risk analysis job');

    const pharmacies = await prisma.pharmacy.findMany({
      select: { pharmacy_id: true, name: true },
    });

    this.logger.log(`Processing ${pharmacies.length} pharmacies`);

    for (const pharmacy of pharmacies) {
      try {
        const result = await this.analysisService.analyzeAllForPharmacy(
          pharmacy.pharmacy_id
        );
        this.logger.log(
          `[${pharmacy.name}] Analysis done: ${result.succeeded}/${result.total} products`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`[${pharmacy.name}] Analysis failed: ${message}`);
      }
    }

    this.logger.log('Daily analysis job complete');
  }
}
