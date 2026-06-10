import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { HealthController } from './health.controller';
import { AnalysisJob } from './jobs/analysis.job';
import { AdminModule } from './modules/admin/admin.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { ProductModule } from './modules/product/product.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    AdminModule,
    InvitationModule,
    UploadModule,
    AnalysisModule,
    ProductModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [AnalysisJob],
})
export class AppModule {}
