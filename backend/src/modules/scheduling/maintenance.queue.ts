import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import { MAINTENANCE_QUEUE, MaintenanceJob } from './scheduling.events';

/**
 * Point d'entrée unique pour enfiler une tâche planifiée dans la file
 * `maintenance`. Mutualisé entre le déclencheur interne (`MaintenanceProducer`,
 * service `scheduler`) et le déclencheur externe (`SchedulerController`, appelé
 * par un scheduler tiers). Le travail réel est fait par le `MaintenanceWorker`.
 */
@Injectable()
export class MaintenanceQueue {
  constructor(@InjectQueue(MAINTENANCE_QUEUE) private readonly queue: Queue) {}

  enqueue(job: MaintenanceJob) {
    return this.queue.add(
      job,
      {},
      { removeOnComplete: true, removeOnFail: 100 }
    );
  }
}
