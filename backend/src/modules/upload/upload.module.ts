import { Module } from '@nestjs/common';

import { AnalysisModule } from '../analysis/analysis.module';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [AnalysisModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
