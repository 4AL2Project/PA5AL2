import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { HealthController } from './health.controller';
import { AnalysisJob } from './jobs/analysis.job';
import { ActionsModule } from './modules/actions/actions.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { AssociationsModule } from './modules/associations/associations.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DonationsModule } from './modules/donations/donations.module';
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
    ActionsModule,
    AssociationsModule,
    DonationsModule,
    ProductModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [AnalysisJob],
})
export class AppModule {}
