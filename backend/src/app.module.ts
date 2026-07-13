import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { config } from './core/config';
import { StorageModule } from './core/storage/storage.module';
import { HealthController } from './health.controller';
import { AnalysisJob } from './jobs/analysis.job';
import { ActionsModule } from './modules/actions/actions.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { AssociationsModule } from './modules/associations/associations.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoryModule } from './modules/category/category.module';
import { CustomerModule } from './modules/customer/customer.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DonationsModule } from './modules/donations/donations.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { NotificationModule } from './modules/notification/notification.module';
import { OfferModule } from './modules/offer/offer.module';
import { OrderModule } from './modules/order/order.module';
import { PharmacyModule } from './modules/pharmacy/pharmacy.module';
import { ProductModule } from './modules/product/product.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    BullModule.forRoot({
      connection: (() => {
        const { hostname, port, username, password } = new URL(
          config.redis.url
        );
        return {
          host: hostname,
          port: parseInt(port || '6379', 10),
          ...(username && { username }),
          ...(password && { password }),
        };
      })(),
    }),
    StorageModule,
    AuthModule,
    AdminModule,
    InvitationModule,
    IngestionModule,
    AnalysisModule,
    ActionsModule,
    AssociationsModule,
    DonationsModule,
    ProductModule,
    PharmacyModule,
    DashboardModule,
    CustomerModule,
    NotificationModule,
    OfferModule,
    OrderModule,
    CategoryModule,
  ],
  controllers: [HealthController],
  providers: [AnalysisJob],
})
export class AppModule {}
