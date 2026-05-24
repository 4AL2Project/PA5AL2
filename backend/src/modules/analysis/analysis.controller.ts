import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { TenantPharmacyId } from '../auth/decorators/tenant-pharmacy.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { MaskFinancialInterceptor } from '../auth/interceptors/mask-financial.interceptor';
import { UserRole } from '../auth/roles.enum';
import { AnalysisService } from './analysis.service';

@ApiTags('analysis')
@ApiBearerAuth('access-token')
@Controller('api/analysis')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR, UserRole.ADMIN_SAVELY)
@UseInterceptors(MaskFinancialInterceptor)
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('latest')
  @ApiOperation({ summary: 'Latest risk analysis per product for the pharmacy' })
  async getLatest(@TenantPharmacyId() pharmacyId: string) {
    return this.analysisService.getLatestAnalysis(pharmacyId);
  }
}
