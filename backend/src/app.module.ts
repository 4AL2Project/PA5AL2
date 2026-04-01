import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { UploadModule } from './modules/upload/upload.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { ProductModule } from './modules/product/product.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AnalysisJob } from './jobs/analysis.job';

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
