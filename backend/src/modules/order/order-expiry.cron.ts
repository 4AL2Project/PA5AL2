import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { OrderService } from './order.service';

@Injectable()
export class OrderExpiryCron {
  private readonly logger = new Logger(OrderExpiryCron.name);

  constructor(private readonly orderService: OrderService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireOrders() {
    const count = await this.orderService.expireOverdueOrders();
    if (count > 0) {
      this.logger.log(`Expired ${count} overdue order(s)`);
    }
  }
}
