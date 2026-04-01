import {
  Controller,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthRequest } from '../auth/auth.middleware';
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
      { storage: memoryStorage() },
    ),
  )
  async upload(
    @Req() req: AuthRequest,
    @UploadedFiles()
    files: {
      products?: Express.Multer.File[];
      sales?: Express.Multer.File[];
    },
  ) {
    const pharmacyId = req.user!.pharmacy_id!;
    return this.uploadService.processUpload(
      pharmacyId,
      files.products?.[0],
      files.sales?.[0],
    );
  }
}
