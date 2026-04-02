import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '../../database/client';
import { calculateRisk } from './risk-calculator';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  async analyzeProduct(productId: string, pharmacyId: string) {
    const product = await prisma.product.findFirst({
      where: { product_id: productId, pharmacy_id: pharmacyId },
    });

    if (!product) return null;

    const sales = await prisma.sale.findMany({
      where: { product_id: productId },
    });

    const result = calculateRisk(product, sales);

    return prisma.riskAnalysis.upsert({
      where: {
        product_id_analysis_date: {
          product_id: productId,
          analysis_date: new Date(new Date().toDateString()),
        },
      },
      update: result,
      create: {
        product_id: productId,
        pharmacy_id: pharmacyId,
        ...result,
      },
    });
  }

  async analyzeAllForPharmacy(pharmacyId: string) {
    const products = await prisma.product.findMany({
      where: { pharmacy_id: pharmacyId },
      select: { product_id: true },
    });

    this.logger.log(`Analyzing ${products.length} products for pharmacy ${pharmacyId}`);

    const results = await Promise.allSettled(
      products.map((p) => this.analyzeProduct(p.product_id, pharmacyId)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(`Analysis complete: ${succeeded} succeeded, ${failed} failed`);
    return { succeeded, failed, total: products.length };
  }

  async getLatestAnalysis(pharmacyId: string) {
    const analyses = await prisma.riskAnalysis.findMany({
      where: { pharmacy_id: pharmacyId },
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
          },
        },
      },
    });

    const summary = {
      total_products: analyses.length,
      critical: analyses.filter((a) => a.risk_level === 'critical').length,
      high: analyses.filter((a) => a.risk_level === 'high').length,
      safe: analyses.filter((a) => a.risk_level === 'safe').length,
      recoverable: analyses.reduce((sum, a) => sum + a.recoverable_value, 0),
      potential_loss: analyses.reduce((sum, a) => sum + a.potential_loss, 0),
    };

    return { summary, products: analyses };
  }
}
