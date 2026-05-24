import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { HealthController } from './health.controller';
import { AnalysisJob } from './jobs/analysis.job';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ProductModule } from './modules/product/product.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    UploadModule,
    AnalysisModule,
    ProductModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [AnalysisJob],
})
export class AppModule {}
