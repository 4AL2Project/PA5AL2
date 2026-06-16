import { Module } from '@nestjs/common';

import { ConsoleNotificationService } from './console-notification.service';
import { NOTIFICATION_SERVICE } from './notification.interface';

@Module({
  providers: [
    {
      provide: NOTIFICATION_SERVICE,
      useClass: ConsoleNotificationService,
    },
  ],
  exports: [NOTIFICATION_SERVICE],
})
export class NotificationModule {}
