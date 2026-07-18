import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { isApi, isScheduler, isWorker } from '../../core/config';
import { AnalysisJob } from '../../jobs/analysis.job';
import { AnalysisModule } from '../analysis/analysis.module';
import { OrderModule } from '../order/order.module';
import { MaintenanceProducer } from './maintenance.producer';
import { MaintenanceQueue } from './maintenance.queue';
import { MaintenanceWorker } from './maintenance.worker';
import { SchedulerController } from './scheduler.controller';
import { MAINTENANCE_QUEUE } from './scheduling.events';

/**
 * Tâches planifiées, découplées en déclencheur / traitement par la file
 * `maintenance` :
 *  - déclencheur interne  → `MaintenanceProducer` (@Cron, service `scheduler`)
 *  - déclencheur externe  → `SchedulerController` (HTTP gardé, service `api`)
 *  - traitement           → `MaintenanceWorker` (@Processor, service `worker`)
 * `MaintenanceQueue` (enqueue) est partagé par les deux déclencheurs.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: MAINTENANCE_QUEUE }),
    AnalysisModule,
    OrderModule,
  ],
  controllers: [...(isApi ? [SchedulerController] : [])],
  providers: [
    MaintenanceQueue,
    ...(isScheduler ? [MaintenanceProducer] : []),
    ...(isWorker ? [MaintenanceWorker, AnalysisJob] : []),
  ],
})
export class SchedulingModule {}
