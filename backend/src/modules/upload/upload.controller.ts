import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { UploadService } from './upload.service';

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'products', maxCount: 1 },
        { name: 'sales', maxCount: 1 },
      ],
      { storage: memoryStorage() }
    )
  )
  async upload(
    @Query('pharmacy_id') pharmacyId: string,
    @UploadedFiles()
    files: {
      products?: Express.Multer.File[];
      sales?: Express.Multer.File[];
    }
  ) {
    if (!pharmacyId) throw new BadRequestException('pharmacy_id is required');
    return this.uploadService.processUpload(
      pharmacyId,
      files.products?.[0],
      files.sales?.[0]
    );
  }
}
