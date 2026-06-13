import { Injectable, Logger } from '@nestjs/common';

import { ValidationError } from '../../core/errors';
import { prisma } from '../../database/client';
import { AnalysisService } from '../analysis/analysis.service';
import { parseFile } from './csv.parser';
import { validateProductRow, validateSaleRow } from './validation.schema';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly analysisService: AnalysisService) {}

  async processUpload(
    pharmacyId: string,
    productsFile?: Express.Multer.File,
    salesFile?: Express.Multer.File
  ) {
    if (!productsFile && !salesFile) {
      throw new ValidationError(
        'At least one file (products or sales) is required'
      );
    }

    const results: {
      products?: Awaited<ReturnType<UploadService['importProducts']>>;
      sales?: Awaited<ReturnType<UploadService['importSales']>>;
      analysis?: Awaited<ReturnType<AnalysisService['analyzeAllForPharmacy']>>;
    } = {};

    if (productsFile) {
      results.products = await this.importProducts(pharmacyId, productsFile);
    }

    if (salesFile) {
      results.sales = await this.importSales(pharmacyId, salesFile);
    }

    // update last_upload_at
    await prisma.pharmacy.update({
      where: { pharmacy_id: pharmacyId },
      data: { last_upload_at: new Date() },
    });

    // trigger analysis
    results.analysis =
      await this.analysisService.analyzeAllForPharmacy(pharmacyId);

    return results;
  }

  private async importProducts(pharmacyId: string, file: Express.Multer.File) {
    const rows = await parseFile(file.buffer, file.mimetype);
    const errors: string[] = [];
    const validated: ReturnType<typeof validateProductRow>[] = [];

    rows.forEach((row, i) => {
      try {
        validated.push(validateProductRow(row, i + 2));
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    });

    if (errors.length > 0) {
      throw new ValidationError(
        `Product validation errors:\n${errors.join('\n')}`
      );
    }

    let inserted = 0;
    let updated = 0;

    for (const row of validated) {
      const existing = await prisma.product.findUnique({
        where: {
          pharmacy_id_external_sku: {
            pharmacy_id: pharmacyId,
            external_sku: row.external_sku,
          },
        },
      });

      if (existing) {
        await prisma.product.update({
          where: { product_id: existing.product_id },
          data: {
            lot_number: row.lot_number,
            name: row.name,
            category: row.category,
            brand: row.brand,
            expiry_date: row.expiry_date ? new Date(row.expiry_date) : null,
            stock_quantity: row.stock_quantity,
            unit_price: row.unit_price,
            cost_price: row.cost_price,
          },
        });
        updated++;
      } else {
        await prisma.product.create({
          data: {
            pharmacy_id: pharmacyId,
            external_sku: row.external_sku,
            lot_number: row.lot_number,
            name: row.name,
            category: row.category,
            brand: row.brand,
            expiry_date: row.expiry_date ? new Date(row.expiry_date) : null,
            stock_quantity: row.stock_quantity,
            unit_price: row.unit_price,
            cost_price: row.cost_price,
          },
        });
        inserted++;
      }
    }

    this.logger.log(`Products: ${inserted} inserted, ${updated} updated`);
    return { inserted, updated, total: validated.length };
  }

  private async importSales(pharmacyId: string, file: Express.Multer.File) {
    const rows = await parseFile(file.buffer, file.mimetype);
    const errors: string[] = [];
    const validated: ReturnType<typeof validateSaleRow>[] = [];

    rows.forEach((row, i) => {
      try {
        validated.push(validateSaleRow(row, i + 2));
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    });

    if (errors.length > 0) {
      throw new ValidationError(
        `Sale validation errors:\n${errors.join('\n')}`
      );
    }

    let inserted = 0;
    let skipped = 0;

    for (const row of validated) {
      const product = await prisma.product.findFirst({
        where: { pharmacy_id: pharmacyId, external_sku: row.external_sku },
      });

      if (!product) {
        this.logger.warn(
          `SKU not found: ${row.external_sku} — skipping sale row`
        );
        skipped++;
        continue;
      }

      await prisma.sale.upsert({
        where: {
          product_id_sale_date_quantity_sold: {
            product_id: product.product_id,
            sale_date: new Date(row.sale_date),
            quantity_sold: row.quantity_sold,
          },
        },
        create: {
          product_id: product.product_id,
          pharmacy_id: pharmacyId,
          sale_date: new Date(row.sale_date),
          quantity_sold: row.quantity_sold,
          unit_price_sold: row.unit_price_sold,
        },
        update: {},
      });
      inserted++;
    }

    this.logger.log(`Sales: ${inserted} inserted, ${skipped} skipped`);
    return { inserted, skipped, total: validated.length };
  }
}
