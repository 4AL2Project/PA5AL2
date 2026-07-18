import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { MaintenanceQueue } from './maintenance.queue';
import { DAILY_ANALYSIS_JOB, EXPIRE_ORDERS_JOB } from './scheduling.events';

/**
 * Déclencheur interne (auto-hébergé) des tâches planifiées. Instancié uniquement
 * dans le service `scheduler` (singleton) : les @Cron ne font qu'**enfiler** un
 * job, le travail réel étant exécuté par le service `worker`. C'est l'option
 * portable par défaut ; en prod, un scheduler tiers peut le remplacer en tapant
 * `SchedulerController` (dans ce cas, ne pas déployer le service `scheduler`).
 */
@Injectable()
export class MaintenanceProducer {
  private readonly logger = new Logger(MaintenanceProducer.name);

  constructor(private readonly maintenance: MaintenanceQueue) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduleDailyAnalysis() {
    await this.maintenance.enqueue(DAILY_ANALYSIS_JOB);
    this.logger.log('Enqueued daily risk analysis job');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async scheduleExpireOrders() {
    await this.maintenance.enqueue(EXPIRE_ORDERS_JOB);
    this.logger.debug('Enqueued expire-orders job');
  }
}
