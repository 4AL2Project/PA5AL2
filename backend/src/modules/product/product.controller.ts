import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { prisma } from '../../database/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantPharmacyId } from '../auth/decorators/tenant-pharmacy.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { MaskFinancialInterceptor } from '../auth/interceptors/mask-financial.interceptor';
import { UserRole } from '../auth/roles.enum';

@ApiTags('products')
@ApiBearerAuth('access-token')
@Controller('api/products')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR, UserRole.ADMIN_SAVELY)
@UseInterceptors(MaskFinancialInterceptor)
export class ProductController {
  @Get()
  @ApiOperation({ summary: 'List products with their latest risk analysis' })
  @ApiQuery({
    name: 'risk_level',
    required: false,
    enum: ['critical', 'high', 'safe'],
  })
  @ApiQuery({ name: 'category', required: false })
  async getProducts(
    @TenantPharmacyId() pharmacyId: string,
    @Query('risk_level') riskLevel?: string,
    @Query('category') category?: string
  ) {
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

  @Get(':product_id')
  @ApiOperation({ summary: 'Fetch a single product by id (tenant-scoped)' })
  async getProduct(
    @TenantPharmacyId() pharmacyId: string,
    @Param('product_id') productId: string
  ) {
    const product = await prisma.product.findFirst({
      where: { product_id: productId, pharmacy_id: pharmacyId },
      select: {
        product_id: true,
        external_sku: true,
        name: true,
        category: true,
        brand: true,
        expiry_date: true,
        stock_quantity: true,
        unit_price: true,
        cost_price: true,
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
