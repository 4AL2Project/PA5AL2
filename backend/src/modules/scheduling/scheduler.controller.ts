import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

import { MaintenanceQueue } from './maintenance.queue';
import { SchedulerKeyGuard } from './scheduler-key.guard';
import { DAILY_ANALYSIS_JOB, EXPIRE_ORDERS_JOB } from './scheduling.events';

/**
 * Déclencheur externe des tâches planifiées : un scheduler tiers (Cloud Scheduler,
 * EventBridge, cron-job.org…) tape ces endpoints, protégés par `X-Scheduler-Key`.
 * Les handlers ne font qu'**enfiler** la tâche ; le `MaintenanceWorker` l'exécute.
 * Alternative à l'auto-hébergement (`ROLE=scheduler`) — n'utiliser qu'un seul des
 * deux à la fois pour éviter un double déclenchement.
 */
@ApiTags('internal')
@ApiHeader({ name: 'X-Scheduler-Key', required: true })
@UseGuards(SchedulerKeyGuard)
@Controller('internal/scheduler')
export class SchedulerController {
  constructor(private readonly maintenance: MaintenanceQueue) {}

  @Post('daily-analysis')
  @HttpCode(202)
  @ApiOperation({ summary: 'Enfile le recalcul de risque quotidien' })
  async triggerDailyAnalysis() {
    await this.maintenance.enqueue(DAILY_ANALYSIS_JOB);
    return { enqueued: DAILY_ANALYSIS_JOB };
  }

  @Post('expire-orders')
  @HttpCode(202)
  @ApiOperation({ summary: 'Enfile l’expiration des commandes en retard' })
  async triggerExpireOrders() {
    await this.maintenance.enqueue(EXPIRE_ORDERS_JOB);
    return { enqueued: EXPIRE_ORDERS_JOB };
  }
}
