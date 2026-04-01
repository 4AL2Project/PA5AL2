import { Controller, Get, Query, Req } from '@nestjs/common';
import { prisma } from '../../database/client';
import { AuthRequest } from '../auth/auth.middleware';

@Controller('api/products')
export class ProductController {
  @Get()
  async getProducts(
    @Req() req: AuthRequest,
    @Query('risk_level') riskLevel?: string,
    @Query('category') category?: string,
  ) {
    const pharmacyId = req.user!.pharmacy_id!;

    // fetch latest analyses with optional filters
    const analyses = await prisma.riskAnalysis.findMany({
      where: {
        pharmacy_id: pharmacyId,
        ...(riskLevel ? { risk_level: riskLevel } : {}),
      },
      orderBy: { analysis_date: 'desc' },
      distinct: ['product_id'],
      include: {
        product: {
          select: {
            name: true,
            category: true,
            brand: true,
            external_sku: true,
            expiry_date: true,
            stock_quantity: true,
            unit_price: true,
            cost_price: true,
          },
        },
      },
    });

    const filtered = category
      ? analyses.filter((a) => a.product.category === category)
      : analyses;

    return { products: filtered, total: filtered.length };
  }
}
