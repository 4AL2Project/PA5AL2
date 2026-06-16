import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { HealthController } from './health.controller';
import { AnalysisJob } from './jobs/analysis.job';
import { ActionsModule } from './modules/actions/actions.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { AssociationsModule } from './modules/associations/associations.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomerModule } from './modules/customer/customer.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DonationsModule } from './modules/donations/donations.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { NotificationModule } from './modules/notification/notification.module';
import { OfferModule } from './modules/offer/offer.module';
import { OrderModule } from './modules/order/order.module';
import { ProductModule } from './modules/product/product.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    AuthModule,
    AdminModule,
    InvitationModule,
    IngestionModule,
    AnalysisModule,
    ActionsModule,
    AssociationsModule,
    DonationsModule,
    ProductModule,
    DashboardModule,
    CustomerModule,
    NotificationModule,
    OfferModule,
    OrderModule,
  ],
  controllers: [HealthController],
  providers: [AnalysisJob],
})
export class AppModule {}
