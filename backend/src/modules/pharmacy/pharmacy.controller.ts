import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { JwtPayload } from '../auth/jwt-payload';
import { UserRole } from '../auth/roles.enum';
import { UpdatePharmacyMeDto } from './dto/pharmacy.dto';
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
    return this.pharmacyService.getMyPharmacy(req.user.pharmacy_id);
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
    return this.pharmacyService.updateMyPharmacy(req.user.pharmacy_id, dto);
  }
}
