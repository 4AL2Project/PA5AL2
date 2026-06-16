import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtPayload } from '../auth/jwt-payload';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { UserRole } from '../auth/roles.enum';
import { CustomerJwtGuard } from '../customer/guards/customer-jwt.guard';
import { CustomerJwtPayload } from '../customer/customer-jwt-payload';
import { CreateOfferDto, OfferService } from './offer.service';

@ApiTags('offers')
@Controller('api/offers')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  // ─── Titulaire endpoints ────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Publier une Offer B2C (Titulaire)' })
  create(
    @Req() req: Request & { user: JwtPayload },
    @Body() body: CreateOfferDto
  ) {
    return this.offerService.create(req.user.pharmacy_id, body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Lister les Offers de la pharmacie (dashboard)' })
  findAll(
    @Req() req: Request & { user: JwtPayload },
    @Query('status') status?: string
  ) {
    return this.offerService.findAllForPharmacy(req.user.pharmacy_id, status);
  }

  @Patch(':id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Suspendre une Offer' })
  suspend(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string) {
    return this.offerService.suspend(req.user.pharmacy_id, id);
  }

  @Patch(':id/resume')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Réactiver une Offer suspendue' })
  resume(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string) {
    return this.offerService.resume(req.user.pharmacy_id, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Terminer une Offer (annule les Orders actifs)' })
  terminate(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string
  ) {
    return this.offerService.terminate(req.user.pharmacy_id, id);
  }

  // ─── Customer endpoints (mobile) ────────────────────────────────────────────

  @Get('pharmacy/:pharmacyId/active')
  @UseGuards(CustomerJwtGuard)
  @ApiOperation({ summary: 'Catalogue des Offers actives pour un Customer' })
  activeForCustomer(
    @Param('pharmacyId') pharmacyId: string,
    @Req() _req: Request & { customer: CustomerJwtPayload }
  ) {
    return this.offerService.findActiveForCustomer(pharmacyId);
  }
}
