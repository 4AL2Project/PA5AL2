import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { TenantPharmacyId } from '../auth/decorators/tenant-pharmacy.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { MaskFinancialInterceptor } from '../auth/interceptors/mask-financial.interceptor';
import { UserRole } from '../auth/roles.enum';
import { ActionsService } from './actions.service';

@ApiTags('actions')
@ApiBearerAuth('access-token')
@Controller('api/actions')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR)
@UseInterceptors(MaskFinancialInterceptor)
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
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Valider une action (avec type optionnel)' })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: { type: { type: 'string', enum: ['B2C', 'DON'] } },
    },
  })
  validate(
    @Param('id') id: string,
    @TenantPharmacyId() pharmacyId: string,
    @Body('type') type?: 'B2C' | 'DON'
  ) {
    return this.actionsService.validate(id, pharmacyId, type);
  }

  @Patch(':id/ignore')
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Ignorer une action (produit hors scope)' })
  ignore(@Param('id') id: string, @TenantPharmacyId() pharmacyId: string) {
    return this.actionsService.ignore(id, pharmacyId);
  }

  @Patch(':id/snooze')
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Reporter une action de 48h' })
  snooze(@Param('id') id: string, @TenantPharmacyId() pharmacyId: string) {
    return this.actionsService.snooze(id, pharmacyId);
  }

  @Patch(':id/reset')
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Remettre en attente (annuler ignore/snooze)' })
  reset(@Param('id') id: string, @TenantPharmacyId() pharmacyId: string) {
    return this.actionsService.resetToEnAttente(id, pharmacyId);
  }
}
