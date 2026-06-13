import { Module } from '@nestjs/common';

import { AnalysisModule } from '../analysis/analysis.module';
import { AuthModule } from '../auth/auth.module';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [AuthModule, AnalysisModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
