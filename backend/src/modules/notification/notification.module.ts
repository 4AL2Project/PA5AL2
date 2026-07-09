import { Module } from '@nestjs/common';

import { ConsoleNotificationService } from './console-notification.service';
import { NOTIFICATION_SERVICE } from './notification.interface';
import { OrderNotificationListener } from './order-notification.listener';

@Module({
  providers: [
    {
      provide: NOTIFICATION_SERVICE,
      useClass: ConsoleNotificationService,
    },
    OrderNotificationListener,
  ],
  exports: [NOTIFICATION_SERVICE],
})
export class NotificationModule {}
