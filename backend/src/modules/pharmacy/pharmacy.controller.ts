import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { JwtPayload } from '../auth/jwt-payload';
import { UserRole } from '../auth/roles.enum';
import {
  CreatePreparateurDto,
  PreparateurResponseDto,
  UpdatePharmacyMeDto,
  UpdatePreparateurDto,
  UpdatePreparateurStatusDto,
} from './dto/pharmacy.dto';
import { PharmacyService } from './pharmacy.service';

@ApiTags('pharmacy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('api/pharmacies')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Get('me')
  @ApiOperation({ summary: 'Fiche de mon officine' })
  getMe(@Req() req: Request & { user: JwtPayload }) {
    return this.pharmacyService.getMyPharmacy(req.user.pharmacy_id!);
  }

  @Patch('me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({
    summary:
      'Mettre à jour les infos de mon officine (nom, adresse, géolocalisation)',
  })
  updateMe(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: UpdatePharmacyMeDto
  ) {
    return this.pharmacyService.updateMyPharmacy(req.user.pharmacy_id!, dto);
  }

  // ─── Preparateurs (titulaire uniquement) ───────────────────────────────────

  @Get('me/preparateurs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({
    summary: 'Lister les preparateurs de commande de mon officine',
  })
  @ApiOkResponse({ type: [PreparateurResponseDto] })
  listPreparateurs(@Req() req: Request & { user: JwtPayload }) {
    return this.pharmacyService.listPreparateurs(req.user.pharmacy_id!);
  }

  @Post('me/preparateurs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({
    summary: 'Ajouter un preparateur de commande a mon officine',
  })
  @ApiCreatedResponse({ type: PreparateurResponseDto })
  addPreparateur(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: CreatePreparateurDto
  ) {
    return this.pharmacyService.addPreparateur(req.user.pharmacy_id!, dto);
  }

  @Patch('me/preparateurs/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Modifier un preparateur de mon officine' })
  @ApiOkResponse({ type: PreparateurResponseDto })
  updatePreparateur(
    @Req() req: Request & { user: JwtPayload },
    @Param('userId') userId: string,
    @Body() dto: UpdatePreparateurDto
  ) {
    return this.pharmacyService.updatePreparateur(
      req.user.pharmacy_id!,
      userId,
      dto
    );
  }

  @Patch('me/preparateurs/:userId/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({
    summary: 'Activer ou desactiver le compte d un preparateur',
  })
  @ApiOkResponse({ type: PreparateurResponseDto })
  setPreparateurStatus(
    @Req() req: Request & { user: JwtPayload },
    @Param('userId') userId: string,
    @Body() dto: UpdatePreparateurStatusDto
  ) {
    return this.pharmacyService.setPreparateurStatus(
      req.user.pharmacy_id!,
      userId,
      dto.status
    );
  }

  @Delete('me/preparateurs/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Supprimer un preparateur de mon officine' })
  @ApiOkResponse({ description: 'Preparateur supprime' })
  deletePreparateur(
    @Req() req: Request & { user: JwtPayload },
    @Param('userId') userId: string
  ) {
    return this.pharmacyService.deletePreparateur(
      req.user.pharmacy_id!,
      userId
    );
  }
}
