import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AnalysisJob } from './jobs/analysis.job';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ProductModule } from './modules/product/product.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    UploadModule,
    AnalysisModule,
    ProductModule,
    DashboardModule,
  ],
  providers: [AnalysisJob],
})
export class AppModule {}
