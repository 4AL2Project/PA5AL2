import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AnalysisModule } from '../analysis/analysis.module';
import { AuthModule } from '../auth/auth.module';
import { IngestionController } from './ingestion.controller';
import { INGESTION_QUEUE } from './ingestion.events';
import { IngestionGateway } from './ingestion.gateway';
import { IngestionService } from './ingestion.service';
import { IngestionWorker } from './ingestion.worker';

@Module({
  imports: [
    BullModule.registerQueue({ name: INGESTION_QUEUE }),
    AuthModule,
    AnalysisModule,
  ],
  controllers: [IngestionController],
  providers: [IngestionService, IngestionWorker, IngestionGateway],
})
export class IngestionModule {}
