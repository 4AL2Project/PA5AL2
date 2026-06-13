import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/roles.enum';
import {
  AssociationsService,
  CreateAssociationDto,
} from './associations.service';

@ApiTags('associations')
@ApiBearerAuth('access-token')
@Controller('api/associations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssociationsController {
  constructor(private readonly associationsService: AssociationsService) {}

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

  @Patch(':id')
  @Roles(UserRole.ADMIN_SAVELY)
  @ApiOperation({ summary: 'Modifier une association (admin Savely)' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateAssociationDto>) {
    return this.associationsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN_SAVELY)
  @ApiOperation({ summary: 'Désactiver une association (admin Savely)' })
  deactivate(@Param('id') id: string) {
    return this.associationsService.deactivate(id);
  }
}
