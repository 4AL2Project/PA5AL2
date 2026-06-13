import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { Roles } from '../auth/decorators/roles.decorator';
import { TenantPharmacyId } from '../auth/decorators/tenant-pharmacy.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { UserRole } from '../auth/roles.enum';
import { UploadService } from './upload.service';

@ApiTags('upload')
@ApiBearerAuth('access-token')
@Controller('api/upload')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import CSV / Excel products + sales for a pharmacy',
  })
  @ApiConsumes('multipart/form-data')
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
    @TenantPharmacyId() pharmacyId: string,
    @UploadedFiles()
    files: {
      products?: Express.Multer.File[];
      sales?: Express.Multer.File[];
    }
  ) {
    return this.uploadService.processUpload(
      pharmacyId,
      files.products?.[0],
      files.sales?.[0]
    );
  }
}
