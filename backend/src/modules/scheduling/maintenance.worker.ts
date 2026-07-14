import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { AnalysisJob } from '../../jobs/analysis.job';
import { OrderService } from '../order/order.service';
import {
  DAILY_ANALYSIS_JOB,
  EXPIRE_ORDERS_JOB,
  MAINTENANCE_QUEUE,
} from './scheduling.events';

/**
 * Consomme la file `maintenance`. Instancié uniquement dans le service `worker`.
 * Chaque job planifié y exécute son travail réel (recalcul de risque, expiration
 * des commandes), découplé du déclencheur (`scheduler`).
 */
@Processor(MAINTENANCE_QUEUE)
export class MaintenanceWorker extends WorkerHost {
  private readonly logger = new Logger(MaintenanceWorker.name);

  constructor(
    private readonly analysisJob: AnalysisJob,
    private readonly orderService: OrderService
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case DAILY_ANALYSIS_JOB:
        await this.analysisJob.runDailyAnalysis();
        break;

      case EXPIRE_ORDERS_JOB: {
        const count = await this.orderService.expireOverdueOrders();
        if (count > 0) {
          this.logger.log(`Expired ${count} overdue order(s)`);
        }
        break;
      }

      default:
        this.logger.warn(`Unknown maintenance job: ${job.name}`);
    }
  }
}
