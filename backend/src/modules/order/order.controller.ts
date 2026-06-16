import {
  Body,
  Controller,
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
import { OrderService } from './order.service';

@ApiTags('orders')
@Controller('api/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ─── Customer endpoints (mobile) ────────────────────────────────────────────

  @Post()
  @UseGuards(CustomerJwtGuard)
  @ApiOperation({ summary: 'Réserver une Offer (Customer)' })
  create(
    @Req() req: Request & { customer: CustomerJwtPayload },
    @Body() body: { offer_id: string; quantity: number }
  ) {
    return this.orderService.createOrder(
      req.customer.sub,
      body.offer_id,
      body.quantity
    );
  }

  @Get('my')
  @UseGuards(CustomerJwtGuard)
  @ApiOperation({ summary: 'Mes réservations (Customer)' })
  myOrders(@Req() req: Request & { customer: CustomerJwtPayload }) {
    return this.orderService.findOrdersForCustomer(req.customer.sub);
  }

  @Patch(':id/cancel')
  @UseGuards(CustomerJwtGuard)
  @ApiOperation({
    summary: 'Annuler un Order (Customer — statut RESERVEE seulement)',
  })
  cancelByCustomer(
    @Req() req: Request & { customer: CustomerJwtPayload },
    @Param('id') id: string
  ) {
    return this.orderService.cancel(id, req.customer.sub, 'customer');
  }

  // ─── Pharmacy / Préparateur endpoints ──────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'File de préparation (dashboard pharmacie)' })
  findAll(
    @Req() req: Request & { user: JwtPayload },
    @Query('status') status?: string
  ) {
    return this.orderService.findOrdersForPharmacy(
      req.user.pharmacy_id,
      status
    );
  }

  @Get('qr/:qrCode')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Récupérer un Order par QR code' })
  findByQr(
    @Req() req: Request & { user: JwtPayload },
    @Param('qrCode') qrCode: string
  ) {
    return this.orderService.findByQrCode(qrCode, req.user.pharmacy_id);
  }

  @Patch(':id/prepare')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR)
  @ApiOperation({ summary: 'Passer un Order EN_PREPARATION' })
  prepare(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string) {
    return this.orderService.startPreparation(req.user.pharmacy_id, id);
  }

  @Patch(':id/ready')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR)
  @ApiOperation({ summary: 'Marquer un Order PRETE' })
  ready(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string) {
    return this.orderService.markReady(req.user.pharmacy_id, id);
  }

  @Patch(':id/withdraw')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR)
  @ApiOperation({ summary: 'Valider le retrait (décrémente le stock)' })
  withdraw(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string
  ) {
    return this.orderService.withdraw(req.user.pharmacy_id, id);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Annuler un Order (Titulaire — tout statut actif)' })
  cancelByPharmacy(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string
  ) {
    return this.orderService.cancel(
      id,
      req.user.pharmacy_id,
      'pharmacy',
      req.user.pharmacy_id
    );
  }
}
