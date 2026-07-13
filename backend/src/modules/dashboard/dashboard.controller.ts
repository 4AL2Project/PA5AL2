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
    const [
      pharmacy,
      analyses,
      pendingActionsCount,
      missingCostPriceCount,
      upcomingPickups,
    ] = await Promise.all([
      prisma.pharmacy.findUnique({
        where: { pharmacy_id: pharmacyId },
        select: { name: true, last_upload_at: true, subscription_tier: true },
      }),
      prisma.riskAnalysis.findMany({
        where: { pharmacy_id: pharmacyId },
        orderBy: { analysis_date: 'desc' },
        distinct: ['product_id'],
        include: {
          product: {
            select: { name: true, external_sku: true, category: true },
          },
        },
      }),
      prisma.action.count({
        where: { pharmacy_id: pharmacyId, status: 'EN_ATTENTE' },
      }),
      prisma.product.count({
        where: {
          pharmacy_id: pharmacyId,
          OR: [{ cost_price: null }, { cost_price: 0 }],
        },
      }),
      // Retraits de dons planifiés sur 7 jours (web titulaire + app préparateur)
      prisma.donationAllocation.findMany({
        where: {
          donation: { pharmacy_id: pharmacyId },
          status: 'PLANIFIEE',
          pickup_slot_start: {
            lte: new Date(Date.now() + 7 * 24 * 3600 * 1000),
          },
        },
        include: { association: { select: { name: true } } },
        orderBy: { pickup_slot_start: 'asc' },
      }),
    ]);

    const byLevel = analyses.reduce(
      (acc: Record<string, number>, a) => {
        acc[a.risk_level] = (acc[a.risk_level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const dormantAnalyses = analyses.filter(
      (a) => a.risk_level === 'high' || a.risk_level === 'critical'
    );
    const top10Dormants = dormantAnalyses
      .sort((a, b) => b.capital_locked - a.capital_locked)
      .slice(0, 10)
      .map((a) => ({
        product_id: a.product_id,
        name: a.product.name,
        sku: a.product.external_sku,
        category: a.product.category ?? '',
        risk_level: a.risk_level,
        days_of_cover: a.days_of_cover,
        capital_locked: a.capital_locked,
        recoverable_value: a.recoverable_value,
      }));

    return {
      pharmacy,
      summary: {
        total_products: analyses.length,
        by_risk_level: byLevel,
        total_capital_locked: analyses.reduce(
          (s, a) => s + a.capital_locked,
          0
        ),
        total_recoverable: analyses.reduce(
          (s, a) => s + a.recoverable_value,
          0
        ),
        total_potential_loss: analyses.reduce(
          (s, a) => s + a.potential_loss,
          0
        ),
        pending_actions: pendingActionsCount,
        missing_cost_price_count: missingCostPriceCount,
      },
      top10_dormants: top10Dormants,
      upcoming_donation_pickups: upcomingPickups.map((a) => ({
        allocation_id: a.allocation_id,
        association_name: a.association.name,
        pickup_slot_start: a.pickup_slot_start,
        pickup_slot_end: a.pickup_slot_end,
        lines: a.lines,
      })),
    };
  }
}
