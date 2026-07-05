import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { JwtPayload } from '../auth/jwt-payload';
import { UserRole } from '../auth/roles.enum';
import {
  CategoryService,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './category.service';

@ApiTags('categories')
@ApiBearerAuth('access-token')
@Controller('api/categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Lister les catégories (système + pharmacie)' })
  findAll(@Req() req: Request & { user: JwtPayload }) {
    return this.categoryService.findAllForPharmacy(req.user.pharmacy_id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Créer une catégorie pour la pharmacie' })
  create(
    @Req() req: Request & { user: JwtPayload },
    @Body() body: CreateCategoryDto
  ) {
    return this.categoryService.create(req.user.pharmacy_id, body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Renommer une catégorie de la pharmacie' })
  update(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto
  ) {
    return this.categoryService.update(req.user.pharmacy_id, id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles(UserRole.TITULAIRE)
  @ApiOperation({ summary: 'Supprimer une catégorie de la pharmacie' })
  remove(@Req() req: Request & { user: JwtPayload }, @Param('id') id: string) {
    return this.categoryService.remove(req.user.pharmacy_id, id);
  }
}
