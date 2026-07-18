import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/roles.enum';
import { LeadsService } from './leads.service';

@ApiTags('admin-leads')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN_SAVELY)
@Controller('api/admin/leads')
export class AdminLeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get('demo/:id')
  @ApiOperation({ summary: "Détail d'une demande de démo (admin)" })
  getDemoRequest(@Param('id') id: string) {
    return this.leads.findOneDemo(id);
  }

  @Get('demo')
  @ApiOperation({ summary: 'Lister les demandes de démo (admin)' })
  getDemoRequests(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number
  ) {
    return this.leads.findDemoRequests(page, limit);
  }

  @Patch('demo/:id/contacted')
  @ApiOperation({ summary: 'Marquer une demande de démo comme contactée' })
  markContacted(@Param('id') id: string) {
    return this.leads.markContacted(id);
  }

  @Get('waitlist')
  @ApiOperation({
    summary: 'Lister les inscrits waitlist particuliers (admin)',
  })
  getWaitlist(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number
  ) {
    return this.leads.findWaitlistEntries(page, limit);
  }
}
