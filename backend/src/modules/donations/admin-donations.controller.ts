/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Endpoints admin pour la supervision des dons associatifs :
 *   liste cross-pharmacie, détail complet, monitoring KPIs + alertes,
 *   et actions privilégiées (forcer statut, régénérer token).
 * @module DonAssociatif
 */
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/roles.enum';
import { DonationStatus } from './donation.types';
import { DonationsService } from './donations.service';

class ForceStatusDto {
  @IsString()
  @IsIn(['EN_COURS', 'COMPLETEE', 'ECHOUEE', 'ANNULEE'])
  status!: DonationStatus;
}

class AdminListQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  pharmacy_id?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

@ApiTags('admin-donations')
@ApiBearerAuth('access-token')
@Controller('api/admin/donations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN_SAVELY)
export class AdminDonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Get('monitoring')
  @ApiOperation({
    summary:
      'Dashboard monitoring admin : KPIs plateforme + alertes (dons bloqués, tokens expirés, assos peu fiables)',
  })
  getMonitoring() {
    return this.donationsService.getMonitoring();
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les dons (toutes pharmacies, paginé)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'pharmacy_id', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'Date ISO (from)' })
  @ApiQuery({ name: 'to', required: false, description: 'Date ISO (to)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listAll(
    @Query() query: AdminListQueryDto,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.donationsService.adminList({
      ...query,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('parametres/:pharmacy_id')
  @ApiOperation({ summary: "Paramètres de don d'une pharmacie (admin)" })
  getParametres(@Param('pharmacy_id') pharmacyId: string) {
    return this.donationsService.getParametresAdmin(pharmacyId);
  }

  @Get(':id')
  @ApiOperation({
    summary: "Détail complet d'un don (events, proposals, allocations) — sans restriction de tenant",
  })
  detail(@Param('id') id: string) {
    return this.donationsService.adminDetail(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: "Forcer le statut d'un don (bypass machine a etats)",
  })
  forceStatus(@Param('id') id: string, @Body() dto: ForceStatusDto) {
    return this.donationsService.adminForceStatus(id, dto.status);
  }

  @Post(':id/regen-token')
  @ApiOperation({
    summary: 'Régénérer le token de la proposition active ou expirée',
  })
  async regenToken(@Param('id') id: string) {
    const proposal = await this.donationsService.adminRegenToken(id);
    if (!proposal) throw new NotFoundException('Aucune proposition éligible');
    return proposal;
  }
}
