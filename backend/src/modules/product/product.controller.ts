import { BadRequestException, Controller, Get, Query } from '@nestjs/common';

import { prisma } from '../../database/client';

@Controller('api/products')
export class ProductController {
  @Get()
  async getProducts(
    @Query('pharmacy_id') pharmacyId: string,
    @Query('risk_level') riskLevel?: string,
    @Query('category') category?: string
  ) {
    if (!pharmacyId) throw new BadRequestException('pharmacy_id is required');

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
