import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import { prisma } from '../../database/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  @Get()
  async getDashboard(@Query('pharmacy_id') pharmacyId: string) {
    if (!pharmacyId) throw new BadRequestException('pharmacy_id is required');

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
        total_recoverable: analyses.reduce(
          (s, a) => s + a.recoverable_value,
          0
        ),
        total_potential_loss: analyses.reduce(
          (s, a) => s + a.potential_loss,
          0
        ),
      },
    };
  }
}
