import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { prisma } from '../../database/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantPharmacyId } from '../auth/decorators/tenant-pharmacy.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { MaskFinancialInterceptor } from '../auth/interceptors/mask-financial.interceptor';
import { UserRole } from '../auth/roles.enum';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@Controller('api/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR, UserRole.ADMIN_SAVELY)
@UseInterceptors(MaskFinancialInterceptor)
export class DashboardController {
  @Get()
  @ApiOperation({
    summary: 'Aggregated pharmacy KPIs (counts + recoverable values)',
  })
  async getDashboard(@TenantPharmacyId() pharmacyId: string) {
    const [pharmacy, analyses] = await Promise.all([
      prisma.pharmacy.findUnique({
        where: { pharmacy_id: pharmacyId },
        select: { name: true, last_upload_at: true, subscription_tier: true },
      }),
      prisma.riskAnalysis.findMany({
        where: { pharmacy_id: pharmacyId },
        orderBy: { analysis_date: 'desc' },
        distinct: ['product_id'],
      }),
    ]);

    const byLevel = analyses.reduce(
      (acc: Record<string, number>, a) => {
        acc[a.risk_level] = (acc[a.risk_level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      pharmacy,
      summary: {
        total_products: analyses.length,
        by_risk_level: byLevel,
        total_capital_locked: analyses.reduce(
          (s, a) => s + a.capital_locked,
          0,
        ),
        total_recoverable: analyses.reduce(
          (s, a) => s + a.recoverable_value,
          0,
        ),
        total_potential_loss: analyses.reduce(
          (s, a) => s + a.potential_loss,
          0,
        ),
      },
    };
  }
}
