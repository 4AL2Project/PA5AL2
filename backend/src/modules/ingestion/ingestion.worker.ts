import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';

import { prisma } from '../../database/client';
import { AnalysisService } from '../analysis/analysis.service';
import { parseFile, RawRow } from './csv.parser';
import {
  IMPORT_STATUS_EVENT,
  ImportStatus,
  ImportStatusPayload,
  INGESTION_QUEUE,
  IngestionFile,
  IngestionJobData,
} from './ingestion.events';
import { validateProductRow, validateSaleRow } from './validation.schema';

type ProductRow = ReturnType<typeof validateProductRow>;
type SaleRow = ReturnType<typeof validateSaleRow>;

/** Décode le buffer base64 d'un fichier d'import puis le parse en lignes. */
function parseIngestionFile(file: IngestionFile) {
  return parseFile(Buffer.from(file.buffer, 'base64'), file.mimetype);
}

@Processor(INGESTION_QUEUE)
export class IngestionWorker extends WorkerHost {
  private readonly logger = new Logger(IngestionWorker.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly analysisService: AnalysisService
  ) {
    super();
  }

  async process(job: Job<IngestionJobData>): Promise<void> {
    const { import_id, pharmacy_id, products, sales } = job.data;

    await this.setStatus(import_id, pharmacy_id, 'EN_COURS');
    this.logger.log(
      `[${import_id}] Processing import for pharmacy ${pharmacy_id} ` +
        `(products=${Boolean(products)}, sales=${Boolean(sales)})`
    );

    try {
      // Phase 1 : parser + valider TOUS les fichiers, collecter toutes les erreurs
      const errors: string[] = [];
      let rowsTotal = 0;
      let validatedProducts: ProductRow[] = [];
      let validatedSales: SaleRow[] = [];

      if (products) {
        const rows = await parseIngestionFile(products);
        rowsTotal += rows.length;
        validatedProducts = this.validateRows(
          rows,
          'produits',
          validateProductRow,
          errors
        );
      }

      if (sales) {
        const rows = await parseIngestionFile(sales);
        rowsTotal += rows.length;
        validatedSales = this.validateRows(
          rows,
          'ventes',
          validateSaleRow,
          errors
        );
      }

      // Phase 2 : tout-ou-rien — une seule erreur (sur l'un OU l'autre fichier)
      // fait échouer l'import complet, sans aucune écriture.
      if (errors.length > 0) {
        this.logger.warn(
          `[${import_id}] Validation failed: ${errors.length} error(s) in ${rowsTotal} rows`
        );
        await this.markFailed(import_id, pharmacy_id, rowsTotal, errors);
        return;
      }

      // Phase 3 : écriture atomique des deux fichiers dans une seule transaction.
      // Timeout élargi : les exports LGO réels peuvent contenir des milliers de lignes.
      await prisma.$transaction(
        async (tx) => {
          if (products)
            await this.writeProducts(tx, pharmacy_id, validatedProducts);
          if (sales) await this.writeSales(tx, pharmacy_id, validatedSales);
        },
        { maxWait: 10_000, timeout: 120_000 }
      );

      await prisma.pharmacy.update({
        where: { pharmacy_id },
        data: { last_upload_at: new Date() },
      });

      // Réconciliation stock : si produits mis à jour, annuler les Orders dont
      // le hold dépasse le nouveau stock.
      if (products) {
        await this.reconcileHolds(pharmacy_id, validatedProducts);
      }

      await this.analysisService.analyzeAllForPharmacy(pharmacy_id);
      await this.markDone(import_id, pharmacy_id, rowsTotal);
      this.logger.log(
        `[${import_id}] Import complete: ${rowsTotal} rows processed`
      );
    } catch (err) {
      this.logger.error(`Ingestion job ${import_id} failed: ${err}`);
      await this.markFailed(import_id, pharmacy_id, 0, [String(err)]);
      throw err;
    }
  }

  /** Valide chaque ligne, en préfixant les erreurs par le nom du fichier. */
  private validateRows<T>(
    rows: RawRow[],
    label: string,
    validate: (row: RawRow, index: number) => T,
    errors: string[]
  ): T[] {
    const validated: T[] = [];
    for (const [i, row] of rows.entries()) {
      try {
        validated.push(validate(row, i + 2));
      } catch (err) {
        errors.push(
          `[${label}] ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
    return validated;
  }

  private async reconcileHolds(pharmacyId: string, rows: ProductRow[]) {
    const skus = rows.map((r) => r.external_sku);
    const products = await prisma.product.findMany({
      where: { pharmacy_id: pharmacyId, external_sku: { in: skus } },
      select: { product_id: true, external_sku: true, stock_quantity: true },
    });

    for (const product of products) {
      // Sum active holds on offers linked to this product
      const offerWithHolds = await prisma.offer.findFirst({
        where: {
          product_id: product.product_id,
          status: { in: ['ACTIVE', 'SUSPENDUE'] },
        },
        include: {
          orders: {
            where: { status: { in: ['RESERVEE', 'EN_PREPARATION', 'PRETE'] } },
            orderBy: { reserved_at: 'desc' },
          },
        },
      });
      if (!offerWithHolds || offerWithHolds.orders.length === 0) continue;

      const totalHeld = offerWithHolds.orders.reduce(
        (sum, o) => sum + o.quantity,
        0
      );
      const available = product.stock_quantity - totalHeld;

      if (available >= 0) continue;

      // Cancel most recent orders until balance is restored
      let deficit = Math.abs(available);
      for (const order of offerWithHolds.orders) {
        if (deficit <= 0) break;
        await prisma.order.update({
          where: { order_id: order.order_id },
          data: { status: 'ANNULEE', cancelled_at: new Date() },
        });
        deficit -= order.quantity;
        this.logger.warn(
          `Cancelled order ${order.order_id} due to stock reconciliation (new stock=${product.stock_quantity})`
        );
      }
    }
  }

  private async writeProducts(
    tx: Prisma.TransactionClient,
    pharmacyId: string,
    rows: ProductRow[]
  ) {
    await Promise.all(
      rows.map((row) =>
        tx.product.upsert({
          where: {
            pharmacy_id_external_sku: {
              pharmacy_id: pharmacyId,
              external_sku: row.external_sku,
            },
          },
          update: {
            lot_number: row.lot_number,
            name: row.name,
            category: row.category,
            brand: row.brand,
            expiry_date: row.expiry_date ? new Date(row.expiry_date) : null,
            stock_quantity: row.stock_quantity,
            unit_price: row.unit_price,
            cost_price: row.cost_price,
          },
          create: {
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
        })
      )
    );
  }

  private async writeSales(
    tx: Prisma.TransactionClient,
    pharmacyId: string,
    rows: SaleRow[]
  ) {
    const skus = [...new Set(rows.map((r) => r.external_sku))];
    const products = await tx.product.findMany({
      where: { pharmacy_id: pharmacyId, external_sku: { in: skus } },
      select: { product_id: true, external_sku: true },
    });

    const skuToId = new Map(
      products.map((p) => [p.external_sku, p.product_id])
    );
    const skippedSkus: string[] = [];

    const saleOps = rows.flatMap((row) => {
      const productId = skuToId.get(row.external_sku);
      if (!productId) {
        skippedSkus.push(row.external_sku);
        return [];
      }
      return tx.sale.upsert({
        where: {
          product_id_sale_date_quantity_sold: {
            product_id: productId,
            sale_date: new Date(row.sale_date),
            quantity_sold: row.quantity_sold,
          },
        },
        create: {
          product_id: productId,
          pharmacy_id: pharmacyId,
          sale_date: new Date(row.sale_date),
          quantity_sold: row.quantity_sold,
          unit_price_sold: row.unit_price_sold,
        },
        update: {},
      });
    });

    if (skippedSkus.length > 0) {
      this.logger.warn(
        `Skipped ${skippedSkus.length} sale rows with unknown SKUs`
      );
    }

    await Promise.all(saleOps);
  }

  private async setStatus(
    importId: string,
    pharmacyId: string,
    status: ImportStatus
  ) {
    await prisma.import.update({
      where: { import_id: importId },
      data: { status },
    });
    this.emit({ import_id: importId, pharmacy_id: pharmacyId, status });
  }

  private async markDone(
    importId: string,
    pharmacyId: string,
    rowsTotal: number
  ) {
    const data = {
      status: 'TERMINÉ' as const,
      rows_total: rowsTotal,
      rows_ok: rowsTotal,
      rows_failed: 0,
    };
    await prisma.import.update({ where: { import_id: importId }, data });
    this.emit({ import_id: importId, pharmacy_id: pharmacyId, ...data });
  }

  private async markFailed(
    importId: string,
    pharmacyId: string,
    rowsTotal: number,
    errors: string[]
  ) {
    const data = {
      status: 'ÉCHOUÉ' as const,
      rows_total: rowsTotal,
      rows_ok: 0,
      rows_failed: errors.length,
      errors,
    };
    await prisma.import.update({ where: { import_id: importId }, data });
    this.emit({ import_id: importId, pharmacy_id: pharmacyId, ...data });
  }

  private emit(payload: ImportStatusPayload) {
    this.eventEmitter.emit(IMPORT_STATUS_EVENT, payload);
  }
}
