import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { SentryModule } from '@sentry/nestjs/setup';

import { config } from './core/config';
import { StorageModule } from './core/storage/storage.module';
import { HealthController } from './health.controller';
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
import { SchedulingModule } from './modules/scheduling/scheduling.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    BullModule.forRoot({
      connection: (() => {
        const { protocol, hostname, port, username, password } = new URL(
          config.redis.url
        );
        return {
          host: hostname,
          port: parseInt(port || '6379', 10),
          ...(username && { username }),
          ...(password && { password }),
          // TLS pour les Redis managés (Redis Cloud, Upstash…) via rediss://
          ...(protocol === 'rediss:' && { tls: {} }),
          // Requis par BullMQ pour les connexions bloquantes des workers.
          maxRetriesPerRequest: null,
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
    SchedulingModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
