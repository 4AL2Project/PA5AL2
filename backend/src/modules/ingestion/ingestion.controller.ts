import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
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

import { ValidationError } from '../../core/errors';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantPharmacyId } from '../auth/decorators/tenant-pharmacy.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { UserRole } from '../auth/roles.enum';
import { IngestionService } from './ingestion.service';

@ApiTags('upload')
@ApiBearerAuth('access-token')
@Controller('api')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR)
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary:
      'Enqueue a single CSV/Excel import bundling products + sales (all-or-nothing) — responds 202 immediately, track via WebSocket or GET /imports/:id',
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
    files: { products?: Express.Multer.File[]; sales?: Express.Multer.File[] }
  ) {
    const productsFile = files.products?.[0];
    const salesFile = files.sales?.[0];

    if (!productsFile && !salesFile) {
      throw new ValidationError(
        'At least one file (products or sales) is required'
      );
    }

    const imp = await this.ingestionService.enqueue(pharmacyId, {
      products: productsFile,
      sales: salesFile,
    });

    return { import: imp };
  }

  @Get('imports/:id')
  @ApiOperation({ summary: 'Get import status by ID' })
  async getImport(
    @TenantPharmacyId() pharmacyId: string,
    @Param('id') importId: string
  ) {
    const imp = await this.ingestionService.findById(importId, pharmacyId);
    if (!imp) throw new NotFoundException('Import introuvable');
    return imp;
  }

  @Get('imports')
  @ApiOperation({ summary: 'List recent imports for a pharmacy (last 20)' })
  async listImports(@TenantPharmacyId() pharmacyId: string) {
    return this.ingestionService.listForPharmacy(pharmacyId);
  }
}
