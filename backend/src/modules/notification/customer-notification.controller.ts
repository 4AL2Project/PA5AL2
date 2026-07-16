import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { CustomerJwtPayload } from '../customer/customer-jwt-payload';
import { CustomerJwtGuard } from '../customer/guards/customer-jwt.guard';
import { NotificationService } from './notification.service';

type CustomerReq = Request & { customer: CustomerJwtPayload };

@ApiTags('customer-notifications')
@Controller('api/customers/me/notifications')
@UseGuards(CustomerJwtGuard)
export class CustomerNotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des notifications + compteur non-lues' })
  list(@Req() req: CustomerReq) {
    return this.notifications.listForCustomer(req.customer.sub);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marque toutes les notifications comme lues' })
  markAllRead(@Req() req: CustomerReq) {
    return this.notifications.markAllCustomerRead(req.customer.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marque une notification comme lue' })
  markRead(@Req() req: CustomerReq, @Param('id') id: string) {
    return this.notifications.markCustomerRead(req.customer.sub, id);
  }
}
