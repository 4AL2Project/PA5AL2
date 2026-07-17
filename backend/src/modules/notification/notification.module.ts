import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomerJwtGuard } from '../customer/guards/customer-jwt.guard';
import { EmailModule } from '../email/email.module';
import { CustomerNotificationController } from './customer-notification.controller';
import { NOTIFICATION_SERVICE } from './notification.interface';
import { NotificationService } from './notification.service';
import { NotificationDispatchService } from './notification-dispatch.service';
import { StaffNotificationController } from './staff-notification.controller';

@Module({
  imports: [JwtModule.register({}), EmailModule],
  controllers: [CustomerNotificationController, StaffNotificationController],
  providers: [
    NotificationService,
    CustomerJwtGuard,
    JwtAuthGuard,
    {
      // Chaque évènement → notification in-app persistée + email au rôle concerné.
      provide: NOTIFICATION_SERVICE,
      useClass: NotificationDispatchService,
    },
  ],
  exports: [NOTIFICATION_SERVICE, NotificationService],
})
export class NotificationModule {}
