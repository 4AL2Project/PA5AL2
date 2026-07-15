import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { isWorker } from '../../core/config';
import { AnalysisModule } from '../analysis/analysis.module';
import { AuthModule } from '../auth/auth.module';
import { IngestionController } from './ingestion.controller';
import { INGESTION_QUEUE } from './ingestion.events';
import { IngestionGateway } from './ingestion.gateway';
import { IngestionService } from './ingestion.service';
import { IngestionWorker } from './ingestion.worker';

// `IngestionWorker` (le @Processor) n'est instancié que dans le service `worker` :
// l'API (`ROLE=api`) enfile les imports via `IngestionController` mais ne les
// consomme pas. La queue et le controller restent disponibles dans tous les rôles.
@Module({
  imports: [
    BullModule.registerQueue({ name: INGESTION_QUEUE }),
    AuthModule,
    AnalysisModule,
  ],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    IngestionGateway,
    ...(isWorker ? [IngestionWorker] : []),
  ],
})
export class IngestionModule {}
