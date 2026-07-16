import {
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload';
import { NotificationService } from './notification.service';

type StaffReq = Request & { user: JwtPayload };

@ApiTags('staff-notifications')
@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class StaffNotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des notifications + compteur non-lues' })
  list(@Req() req: StaffReq) {
    return this.notifications.listForStaff(req.user.sub);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marque toutes les notifications comme lues' })
  markAllRead(@Req() req: StaffReq) {
    return this.notifications.markAllStaffRead(req.user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marque une notification comme lue' })
  markRead(@Req() req: StaffReq, @Param('id') id: string) {
    return this.notifications.markStaffRead(req.user.sub, id);
  }
}
