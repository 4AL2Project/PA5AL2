import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { prisma } from '../database/client';
import { AnalysisService } from '../modules/analysis/analysis.service';

@Injectable()
export class AnalysisJob {
  private readonly logger = new Logger(AnalysisJob.name);

  constructor(private readonly analysisService: AnalysisService) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
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
