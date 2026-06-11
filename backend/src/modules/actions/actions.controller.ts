import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { TenantPharmacyId } from '../auth/decorators/tenant-pharmacy.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { UserRole } from '../auth/roles.enum';
import { ActionsService } from './actions.service';

@ApiTags('actions')
@ApiBearerAuth('access-token')
@Controller('api/actions')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR)
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Get()
  @ApiOperation({ summary: 'Actions en attente (stock dormant à traiter)' })
  @ApiQuery({ name: 'all', required: false, type: Boolean })
  list(@TenantPharmacyId() pharmacyId: string, @Query('all') all?: string) {
    if (all === 'true') return this.actionsService.listAll(pharmacyId);
    return this.actionsService.listPending(pharmacyId);
  }

  @Patch(':id/validate')
  @ApiOperation({ summary: 'Valider une action (action prise en compte)' })
  validate(@Param('id') id: string, @TenantPharmacyId() pharmacyId: string) {
    return this.actionsService.validate(id, pharmacyId);
  }

  @Patch(':id/ignore')
  @ApiOperation({ summary: 'Ignorer une action (produit hors scope)' })
  ignore(@Param('id') id: string, @TenantPharmacyId() pharmacyId: string) {
    return this.actionsService.ignore(id, pharmacyId);
  }

  @Patch(':id/snooze')
  @ApiOperation({ summary: 'Reporter une action de 48h' })
  snooze(@Param('id') id: string, @TenantPharmacyId() pharmacyId: string) {
    return this.actionsService.snooze(id, pharmacyId);
  }

  @Patch(':id/reset')
  @ApiOperation({ summary: 'Remettre en attente (annuler ignore/snooze)' })
  reset(@Param('id') id: string, @TenantPharmacyId() pharmacyId: string) {
    return this.actionsService.resetToEnAttente(id, pharmacyId);
  }
}
