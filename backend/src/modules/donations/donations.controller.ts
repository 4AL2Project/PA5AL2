// Roger — v1.0
// Controller dons médicamenteux — US-30 Don associatif + US-32 Cerfa PDF
import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
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

import { Roles } from '../auth/decorators/roles.decorator';
import { TenantPharmacyId } from '../auth/decorators/tenant-pharmacy.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { UserRole } from '../auth/roles.enum';
import { CerfaService } from './cerfa.service';
import {
  CreateDonationDto,
  DonationsService,
  DonationStatus,
} from './donations.service';

@ApiTags('donations')
@ApiBearerAuth('access-token')
@Controller('api/donations')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR)
export class DonationsController {
  constructor(
    private readonly donationsService: DonationsService,
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

  @Post()
  @ApiOperation({ summary: 'Proposer un don à une association' })
  create(
    @TenantPharmacyId() pharmacyId: string,
    @Body() dto: CreateDonationDto
  ) {
    return this.donationsService.create(pharmacyId, dto);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Association accepte le don' })
  accept(@Param('id') id: string, @TenantPharmacyId() pharmacyId: string) {
    return this.donationsService.accept(id, pharmacyId);
  }

  @Patch(':id/refuse')
  @ApiOperation({ summary: 'Association refuse le don' })
  refuse(@Param('id') id: string, @TenantPharmacyId() pharmacyId: string) {
    return this.donationsService.refuse(id, pharmacyId);
  }

  @Patch(':id/withdraw')
  @ApiOperation({
    summary: 'Marquer le don comme retiré — génère le numéro Cerfa',
  })
  withdraw(@Param('id') id: string, @TenantPharmacyId() pharmacyId: string) {
    return this.donationsService.withdraw(id, pharmacyId);
  }

  @Get(':id/cerfa')
  @ApiOperation({
    summary: 'Télécharger le reçu Cerfa PDF du don (statut RETIREE requis)',
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
      `attachment; filename="cerfa-${id}.pdf"`
    );
    res.setHeader('Content-Length', pdf.length);
    res.end(pdf);
  }
}
