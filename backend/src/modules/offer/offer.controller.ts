// Gilles — v1.1
// US-80 : recherche géolocalisée + US-81 : détail offre (mobile)
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFloatPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { diskStorage } from 'multer';

import {
  ensureOfferImagesDir,
  OFFER_IMAGES_DIR,
  offerImagePublicUrl,
} from '../../core/uploads';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { JwtPayload } from '../auth/jwt-payload';
import { UserRole } from '../auth/roles.enum';
import { CustomerJwtPayload } from '../customer/customer-jwt-payload';
import { CustomerJwtGuard } from '../customer/guards/customer-jwt.guard';
import { CreateOfferDto, OfferService, UpdateOfferDto } from './offer.service';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 Mo
const MAX_IMAGES_PER_UPLOAD = 10;
const ALLOWED_IMAGE_MIME = /^image\/(jpe?g|png|webp|gif)$/;

const offerImageStorage = diskStorage({
  destination: (_req, _file, cb) => {
    ensureOfferImagesDir();
    cb(null, OFFER_IMAGES_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
  },
});

@ApiTags('offers')
@Controller('api/offers')
export class OfferController {
  constructor(private readonly offerService: OfferService) {}

  // ─── Titulaire endpoints ────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Publier une Offer B2C (Titulaire)' })
  create(
    @Req() req: Request & { user: JwtPayload },
    @Body() body: CreateOfferDto
  ) {
    return this.offerService.create(req.user.pharmacy_id, body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Lister les Offers de la pharmacie (dashboard)' })
  findAll(
    @Req() req: Request & { user: JwtPayload },
    @Query('status') status?: string
  ) {
    return this.offerService.findAllForPharmacy(req.user.pharmacy_id, status);
  }

  @Get(':id/manage')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: "Détail d'une Offer pour le Titulaire (gestion)" })
  findOneForPharmacy(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string
  ) {
    return this.offerService.findOneForPharmacy(req.user.pharmacy_id, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: "Modifier les informations d'une Offer" })
  update(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Body()
    body: UpdateOfferDto & { expires_at?: string | null }
  ) {
    const dto: UpdateOfferDto = {
      discounted_price: body.discounted_price,
      quantity_offered: body.quantity_offered,
    };
    if ('description' in body) {
      dto.description = body.description;
    }
    if ('category_ids' in body) {
      dto.category_ids = body.category_ids;
    }
    if ('expires_at' in body) {
      dto.expires_at = body.expires_at ? new Date(body.expires_at) : null;
    }
    return this.offerService.update(req.user.pharmacy_id, id, dto);
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Ajouter une ou plusieurs images à une Offer' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('images', MAX_IMAGES_PER_UPLOAD, {
      storage: offerImageStorage,
      limits: { fileSize: MAX_IMAGE_BYTES },
      fileFilter: (_req, file, cb) => {
        cb(null, ALLOWED_IMAGE_MIME.test(file.mimetype));
      },
    })
  )
  uploadImages(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'At least one image file (jpeg, png, webp, gif ≤ 5 Mo) is required'
      );
    }
    return this.offerService.addImages(
      req.user.pharmacy_id,
      id,
      files.map((f) => offerImagePublicUrl(f.filename))
    );
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: "Supprimer une image d'une Offer" })
  removeImage(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Param('imageId') imageId: string
  ) {
    return this.offerService.removeImage(req.user.pharmacy_id, id, imageId);
  }

  @Patch(':id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Suspendre une Offer' })
  suspend(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string) {
    return this.offerService.suspend(req.user.pharmacy_id, id);
  }

  @Patch(':id/resume')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Réactiver une Offer suspendue' })
  resume(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string) {
    return this.offerService.resume(req.user.pharmacy_id, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Terminer une Offer (annule les Orders actifs)' })
  terminate(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string
  ) {
    return this.offerService.terminate(req.user.pharmacy_id, id);
  }

  // ─── Customer endpoints (mobile) ────────────────────────────────────────────

  // Note: routes littérales ('nearby', 'pharmacy/:id/active') avant ':id' param

  @Get('nearby')
  @UseGuards(CustomerJwtGuard)
  @ApiOperation({
    summary: 'Recherche géolocalisée des offres actives (Customer) — US-80',
  })
  searchNearby(
    @Req() _req: Request & { customer: CustomerJwtPayload },
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('radius') radius?: string,
    @Query('category') category?: string,
    @Query('minDiscount') minDiscount?: string,
    @Query('maxDistance') maxDistance?: string,
    @Query('sortBy') sortBy?: 'distance' | 'discount' | 'price'
  ) {
    return this.offerService.searchNearby({
      lat,
      lng,
      radius: radius ? parseFloat(radius) : undefined,
      category,
      minDiscount: minDiscount ? parseInt(minDiscount, 10) : undefined,
      maxDistance: maxDistance ? parseFloat(maxDistance) : undefined,
      sortBy,
    });
  }

  @Get('pharmacy/:pharmacyId/active')
  @UseGuards(CustomerJwtGuard)
  @ApiOperation({
    summary: 'Catalogue des Offers actives pour un Customer (par pharmacie)',
  })
  activeForCustomer(
    @Param('pharmacyId') pharmacyId: string,
    @Req() _req: Request & { customer: CustomerJwtPayload }
  ) {
    return this.offerService.findActiveForCustomer(pharmacyId);
  }

  @Get(':id')
  @UseGuards(CustomerJwtGuard)
  @ApiOperation({ summary: "Détail d'une Offer active (Customer) — US-81" })
  findOne(
    @Req() _req: Request & { customer: CustomerJwtPayload },
    @Param('id') id: string
  ) {
    return this.offerService.findActiveById(id);
  }
}
