import { Module } from '@nestjs/common';

import { ActionsModule } from '../actions/actions.module';
import { AuthModule } from '../auth/auth.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

@Module({
  imports: [AuthModule, ActionsModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
