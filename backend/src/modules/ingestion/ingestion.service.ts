import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import { prisma } from '../../database/client';
import { FileType, INGESTION_QUEUE } from './ingestion.events';

@Injectable()
export class IngestionService {
  constructor(@InjectQueue(INGESTION_QUEUE) private readonly queue: Queue) {}

  async enqueue(
    pharmacyId: string,
    file: Express.Multer.File,
    fileType: FileType
  ) {
    const imp = await prisma.import.create({
      data: {
        pharmacy_id: pharmacyId,
        file_name: file.originalname,
        file_type: fileType,
        status: 'EN_ATTENTE',
      },
    });

    await this.queue.add('process', {
      import_id: imp.import_id,
      pharmacy_id: pharmacyId,
      file_type: fileType,
      buffer: file.buffer.toString('base64'),
      mimetype: file.mimetype,
    });

    return imp;
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
