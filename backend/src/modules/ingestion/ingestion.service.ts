import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

import { config } from '../../core/config';
import { StorageService } from '../../core/storage/storage.service';
import { prisma } from '../../database/client';
import { INGESTION_QUEUE, IngestionFile } from './ingestion.events';

/** Fichiers reçus dans une même requête d'import (au moins l'un des deux). */
export interface UploadFiles {
  products?: Express.Multer.File;
  sales?: Express.Multer.File;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectQueue(INGESTION_QUEUE) private readonly queue: Queue,
    private readonly storage: StorageService
  ) {}

  /**
   * Crée UN seul Import regroupant le(s) fichier(s) produits et ventes, puis
   * enfile UN seul job. Le traitement est tout-ou-rien : si l'un des fichiers
   * échoue, l'import entier est marqué en échec.
   */
  async enqueue(pharmacyId: string, files: UploadFiles) {
    const types: string[] = [];
    if (files.products) types.push('products');
    if (files.sales) types.push('sales');

    const fileName = [files.products?.originalname, files.sales?.originalname]
      .filter(Boolean)
      .join(' + ');

    const imp = await prisma.import.create({
      data: {
        pharmacy_id: pharmacyId,
        file_name: fileName,
        file_type: types.join('+'),
        status: 'EN_ATTENTE',
      },
    });

    // Archivage des fichiers bruts sur S3/CloudFront (best-effort par fichier).
    const [productsUrl, salesUrl] = await Promise.all([
      this.archive(imp.import_id, 'products', files.products),
      this.archive(imp.import_id, 'sales', files.sales),
    ]);
    if (productsUrl || salesUrl) {
      await prisma.import.update({
        where: { import_id: imp.import_id },
        data: {
          products_file_url: productsUrl,
          sales_file_url: salesUrl,
        },
      });
    }

    await this.queue.add('process', {
      import_id: imp.import_id,
      pharmacy_id: pharmacyId,
      products: toIngestionFile(files.products),
      sales: toIngestionFile(files.sales),
    });

    this.logger.log(
      `[${pharmacyId}] Import enqueued: ${fileName} (${types.join('+')}) → import_id=${imp.import_id}`
    );

    return { ...imp, products_file_url: productsUrl, sales_file_url: salesUrl };
  }

  /** Archive un fichier d'import sur le stockage et renvoie son URL (ou null). */
  private async archive(
    importId: string,
    kind: 'products' | 'sales',
    file?: Express.Multer.File
  ): Promise<string | null> {
    if (!file) return null;
    const key = `${config.storage.prefixes.imports}/${importId}/${kind}-${randomUUID()}${extname(
      file.originalname
    ).toLowerCase()}`;
    return this.storage.upload({
      key,
      body: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
    });
  }

  async findById(importId: string, pharmacyId: string) {
    return prisma.import.findFirst({
      where: { import_id: importId, pharmacy_id: pharmacyId },
    });
  }

  async listForPharmacy(pharmacyId: string) {
    return prisma.import.findMany({
      where: { pharmacy_id: pharmacyId },
      orderBy: { uploaded_at: 'desc' },
      take: 20,
    });
  }
}

function toIngestionFile(
  file: Express.Multer.File | undefined
): IngestionFile | undefined {
  if (!file) return undefined;
  return {
    file_name: file.originalname,
    buffer: file.buffer.toString('base64'),
    mimetype: file.mimetype,
  };
}
