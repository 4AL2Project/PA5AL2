import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CustomerModule } from '../customer/customer.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderExpiryCron } from './order-expiry.cron';

@Module({
  imports: [AuthModule, CustomerModule],
  controllers: [OrderController],
  providers: [OrderService, OrderExpiryCron],
  exports: [OrderService],
})
export class OrderModule {}
