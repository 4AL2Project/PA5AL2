import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { Roles } from '../auth/decorators/roles.decorator';
import { TenantPharmacyId } from '../auth/decorators/tenant-pharmacy.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { UserRole } from '../auth/roles.enum';
import { AssoAuthService } from '../asso-auth/asso-auth.service';
import { AssociationStatsService } from './association-stats.service';
import {
  AssociationsService,
  CreateAssociationDto,
} from './associations.service';
import {
  RejectAssociationDto,
  ValidateAssociationDto,
} from './dto/association.dto';

const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_IMAGE_MIME = /^image\/(jpe?g|png|webp|gif|svg\+xml)$/;

@ApiTags('associations')
@ApiBearerAuth('access-token')
@Controller('api/associations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssociationsController {
  constructor(
    private readonly associationsService: AssociationsService,
    private readonly statsService: AssociationStatsService,
    private readonly assoAuthService: AssoAuthService
  ) {}

  @Get('annuaire')
  @UseGuards(TenantGuard)
  @Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR)
  @ApiOperation({
    summary:
      "Annuaire des associations pour l'officine (distance, fiabilité, créneaux)",
  })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  annuaire(
    @TenantPharmacyId() pharmacyId: string,
    @Query('category') category?: string,
    @Query('search') search?: string
  ) {
    return this.associationsService.annuaire(pharmacyId, { category, search });
  }

  @Get('pending')
  @Roles(UserRole.ADMIN_SAVELY)
  @ApiOperation({
    summary: 'File de validation : associations en attente (admin Savely)',
  })
  listPending() {
    return this.associationsService.listPending();
  }

  @Get()
  @Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR, UserRole.ADMIN_SAVELY)
  @ApiOperation({
    summary: 'Lister les associations (optionnel: filtre géoloc / catégorie)',
  })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiQuery({ name: 'radius', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  find(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius') radius?: string,
    @Query('category') category?: string
  ) {
    const opts = { category };
    if (lat && lng) {
      return this.associationsService.findNearby(
        parseFloat(lat),
        parseFloat(lng),
        radius ? parseFloat(radius) : 50,
        opts
      );
    }
    return this.associationsService.findAll(opts);
  }

  @Get(':id')
  @Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR, UserRole.ADMIN_SAVELY)
  @ApiOperation({ summary: "Détail d'une association" })
  findOne(@Param('id') id: string) {
    return this.associationsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN_SAVELY)
  @ApiOperation({ summary: 'Créer une association (admin Savely)' })
  create(@Body() dto: CreateAssociationDto) {
    return this.associationsService.create(dto);
  }

  @Get(':id/fiche')
  @UseGuards(TenantGuard)
  @Roles(UserRole.TITULAIRE, UserRole.PREPARATEUR)
  @ApiOperation({
    summary:
      "Fiche association pour l'officine : profil, fiabilité, historique des dons",
  })
  fiche(@Param('id') id: string, @TenantPharmacyId() pharmacyId: string) {
    return this.associationsService.fiche(id, pharmacyId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN_SAVELY, UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Modifier une association (admin ou titulaire)' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateAssociationDto>) {
    return this.associationsService.update(id, dto);
  }

  @Post(':id/logo')
  @Roles(UserRole.ADMIN_SAVELY)
  @ApiOperation({
    summary: "Uploader le logo d'une association (admin Savely)",
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_LOGO_BYTES },
      fileFilter: (_req, file, cb) => {
        cb(null, ALLOWED_IMAGE_MIME.test(file.mimetype));
      },
    })
  )
  uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException(
        'A logo image (jpeg, png, webp, gif, svg ≤ 5 Mo) is required'
      );
    }
    return this.associationsService.setLogo(id, file);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN_SAVELY)
  @ApiOperation({ summary: 'Désactiver une association (admin Savely)' })
  deactivate(@Param('id') id: string) {
    return this.associationsService.deactivate(id);
  }

  @Post(':id/validate')
  @Roles(UserRole.ADMIN_SAVELY)
  @ApiOperation({
    summary: 'Valider une association en attente (admin Savely)',
  })
  validate(@Param('id') id: string, @Body() dto: ValidateAssociationDto) {
    return this.associationsService.validate(id, dto.fiscal_receipt_verified);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN_SAVELY)
  @ApiOperation({
    summary: 'Rejeter une association en attente, avec motif (admin Savely)',
  })
  reject(@Param('id') id: string, @Body() dto: RejectAssociationDto) {
    return this.associationsService.reject(id, dto.reason);
  }

  @Get(':id/stats')
  @Roles(UserRole.ADMIN_SAVELY)
  @ApiOperation({
    summary: 'Stats de fiabilité pour la fiche association (admin Savely)',
  })
  stats(@Param('id') id: string) {
    return this.statsService.getStats(id);
  }

  @Get(':id/allocations')
  @Roles(UserRole.ADMIN_SAVELY)
  @ApiOperation({
    summary: "Historique des retraits d'une association (admin Savely)",
  })
  allocations(@Param('id') id: string) {
    return this.associationsService.allocationHistory(id);
  }

  @Post(':id/inviter')
  @Roles(UserRole.ADMIN_SAVELY)
  @ApiOperation({
    summary:
      "Envoyer le magic link d'accès à l'espace association (admin Savely)",
  })
  async inviter(@Param('id') id: string) {
    await this.assoAuthService.sendMagicLink(id);
    return { success: true };
  }
}
