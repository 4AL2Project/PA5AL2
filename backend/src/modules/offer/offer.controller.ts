// Gilles — v1.1
// US-80 : recherche géolocalisée + US-81 : détail offre (mobile)
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFloatPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { JwtPayload } from '../auth/jwt-payload';
import { UserRole } from '../auth/roles.enum';
import { CustomerJwtPayload } from '../customer/customer-jwt-payload';
import { CustomerJwtGuard } from '../customer/guards/customer-jwt.guard';
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

  // Note: routes littérales ('nearby', 'pharmacy/:id/active') avant ':id' param

  @Get('nearby')
  @UseGuards(CustomerJwtGuard)
  @ApiOperation({
    summary: 'Recherche géolocalisée des offres actives (Customer) — US-80',
  })
  searchNearby(
    @Req() _req: Request & { customer: CustomerJwtPayload },
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('radius') radius?: string,
    @Query('category') category?: string,
    @Query('minDiscount') minDiscount?: string,
    @Query('maxDistance') maxDistance?: string,
    @Query('sortBy') sortBy?: 'distance' | 'discount' | 'price'
  ) {
    return this.offerService.searchNearby({
      lat,
      lng,
      radius: radius ? parseFloat(radius) : undefined,
      category,
      minDiscount: minDiscount ? parseInt(minDiscount, 10) : undefined,
      maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
      sortBy,
    });
  }

  @Get('pharmacy/:pharmacyId/active')
  @UseGuards(CustomerJwtGuard)
  @ApiOperation({
    summary: 'Catalogue des Offers actives pour un Customer (par pharmacie)',
  })
  activeForCustomer(
    @Param('pharmacyId') pharmacyId: string,
    @Req() _req: Request & { customer: CustomerJwtPayload }
  ) {
    return this.offerService.findActiveForCustomer(pharmacyId);
  }

  @Get(':id')
  @UseGuards(CustomerJwtGuard)
  @ApiOperation({ summary: "Détail d'une Offer active (Customer) — US-81" })
  findOne(
    @Req() _req: Request & { customer: CustomerJwtPayload },
    @Param('id') id: string
  ) {
    return this.offerService.findActiveById(id);
  }
}
