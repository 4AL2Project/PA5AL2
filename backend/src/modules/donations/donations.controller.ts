// Controller dons — cycle de vie complet piloté par l'orchestrateur
import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantPharmacyId } from '../auth/decorators/tenant-pharmacy.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { UserRole } from '../auth/roles.enum';
import { CerfaService } from './cerfa.service';
import { DonationStatus } from './donation.types';
import { DonationOrchestratorService } from './donation-orchestrator.service';
import { DonationsService } from './donations.service';
import {
  ConfirmPickupDto,
  CreateDonationDto,
  EligiblePreviewDto,
  ScanPickupDto,
  UpdateDonParametresDto,
} from './dto/donation.dto';

@ApiTags('donations')
@ApiBearerAuth('access-token')
@Controller('api/donations')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR)
export class DonationsController {
  constructor(
    private readonly donationsService: DonationsService,
    private readonly orchestrator: DonationOrchestratorService,
    private readonly cerfaService: CerfaService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lister les dons de la pharmacie' })
  @ApiQuery({ name: 'status', required: false })
  list(
    @TenantPharmacyId() pharmacyId: string,
    @Query('status') status?: string
  ) {
    return this.donationsService.listForPharmacy(
      pharmacyId,
      status as DonationStatus | undefined
    );
  }

  @Get('bilan')
  @ApiOperation({ summary: 'Bilan RSE des dons de la pharmacie' })
  getBilan(@TenantPharmacyId() pharmacyId: string) {
    return this.donationsService.getBilan(pharmacyId);
  }

  @Get('upcoming-pickups')
  @ApiOperation({
    summary: 'Retraits planifiés des prochains jours (dashboard, préparateur)',
  })
  upcomingPickups(@TenantPharmacyId() pharmacyId: string) {
    return this.donationsService.upcomingPickups(pharmacyId);
  }

  @Get('parametres')
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Paramètres de don (seuil dormance, rayon matching)' })
  getParametres(@TenantPharmacyId() pharmacyId: string) {
    return this.donationsService.getParametres(pharmacyId);
  }

  @Put('parametres')
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Modifier les paramètres de don' })
  updateParametres(
    @TenantPharmacyId() pharmacyId: string,
    @Body() dto: UpdateDonParametresDto
  ) {
    return this.donationsService.updateParametres(pharmacyId, dto);
  }

  @Post('eligible-preview')
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({
    summary: "Nombre d'associations éligibles pour un lot (avant validation)",
  })
  eligiblePreview(
    @TenantPharmacyId() pharmacyId: string,
    @Body() dto: EligiblePreviewDto
  ) {
    return this.donationsService.eligiblePreview(pharmacyId, dto.lines);
  }

  @Post()
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({
    summary:
      'Valider un don — le système propose ensuite en cascade aux associations',
  })
  create(
    @TenantPharmacyId() pharmacyId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateDonationDto
  ) {
    return this.orchestrator.createDonation(pharmacyId, userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un don : lignes, reliquat, timeline" })
  detail(@Param('id') id: string, @TenantPharmacyId() pharmacyId: string) {
    return this.donationsService.getDetail(id, pharmacyId);
  }

  @Post(':id/cancel')
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({
    summary: 'Annuler un don EN_COURS (impossible si un retrait est planifié)',
  })
  cancel(
    @Param('id') id: string,
    @TenantPharmacyId() pharmacyId: string,
    @CurrentUser('sub') userId: string
  ) {
    return this.orchestrator.cancelDonation(id, pharmacyId, userId);
  }

  @Post('pickup/scan')
  @ApiOperation({
    summary:
      "Confirmer un retrait par scan du QR de l'allocation (app préparateur)",
  })
  scanPickup(
    @TenantPharmacyId() pharmacyId: string,
    @CurrentUser() user: { sub: string; role: string },
    @Body() dto: ScanPickupDto
  ) {
    return this.orchestrator.confirmPickupByQr(
      dto.qr_code,
      pharmacyId,
      dto.picked_up_by,
      `${user.role}:${user.sub}`
    );
  }

  @Post('allocations/:id/confirm-pickup')
  @ApiOperation({
    summary:
      'Confirmer le retrait (nom du récupérateur) — génère le Cerfa de cette allocation',
  })
  confirmPickup(
    @Param('id') id: string,
    @TenantPharmacyId() pharmacyId: string,
    @CurrentUser() user: { sub: string; role: string },
    @Body() dto: ConfirmPickupDto
  ) {
    return this.orchestrator.confirmPickup(
      id,
      pharmacyId,
      dto.picked_up_by,
      `${user.role}:${user.sub}`
    );
  }

  @Get('allocations/:id/cerfa')
  @ApiOperation({
    summary: 'Télécharger le reçu Cerfa PDF (allocation RETIREE requise)',
  })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadCerfa(
    @Param('id') id: string,
    @TenantPharmacyId() pharmacyId: string,
    @Res() res: Response
  ) {
    const pdf = await this.cerfaService.generateCerfa(id, pharmacyId);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cerfa-16216-${id}.pdf"`
    );
    res.setHeader('Content-Length', pdf.length);
    res.end(pdf);
  }
}
