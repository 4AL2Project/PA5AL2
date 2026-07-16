import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

import { AssoAuthService } from '../asso-auth/asso-auth.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/roles.enum';
import { AdminAssociationsService } from './admin-associations.service';
import {
  AddNoteDto,
  CreateAdminAssociationDto,
  PatchAssoStatutDto,
  UpdateAdminAssociationDto,
} from './dto/admin-association.dto';

@ApiTags('admin-associations')
@ApiBearerAuth('access-token')
@Controller('api/admin/associations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN_SAVELY)
export class AdminAssociationsController {
  constructor(
    private readonly adminService: AdminAssociationsService,
    private readonly assoAuthService: AssoAuthService
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lister les associations (filtres, pagination, tri) — back-office',
  })
  @ApiQuery({ name: 'statut', required: false })
  @ApiQuery({ name: 'agrement', required: false })
  @ApiQuery({ name: 'onboarding', required: false })
  @ApiQuery({ name: 'fiabilite', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  list(
    @Query('statut') statut?: string,
    @Query('agrement') agrement?: string,
    @Query('onboarding') onboarding?: string,
    @Query('fiabilite') fiabilite?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string
  ) {
    return this.adminService.list({
      statut,
      agrement,
      onboarding,
      fiabilite,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
    });
  }

  // ⚠️ Doit être déclarée AVANT la route ':id' pour éviter la collision Express.
  @Get('export')
  @ApiOperation({ summary: 'Exporter les associations en CSV — back-office' })
  async export(@Res() res: Response) {
    const csv = await this.adminService.exportCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=associations.csv'
    );
    // BOM UTF-8 pour Excel
    res.send('﻿' + csv);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une association — back-office' })
  async create(
    @Body() dto: CreateAdminAssociationDto,
    @CurrentUser('email') adminEmail: string
  ) {
    const asso = await this.adminService.create(dto, adminEmail);
    if (dto.send_invitation) {
      await this.assoAuthService.sendMagicLink(asso.association_id);
      await this.adminService.log(
        asso.association_id,
        adminEmail,
        'INVITED',
        null
      );
    }
    return asso;
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une association — back-office" })
  detail(@Param('id') id: string) {
    return this.adminService.detail(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une association — back-office' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminAssociationDto,
    @CurrentUser('email') adminEmail: string
  ) {
    return this.adminService.update(id, dto, adminEmail);
  }

  @Patch(':id/statut')
  @ApiOperation({
    summary: 'Changer le statut (ACTIVE/SUSPENDUE/BLACKLISTEE) — back-office',
  })
  patchStatut(
    @Param('id') id: string,
    @Body() dto: PatchAssoStatutDto,
    @CurrentUser('email') adminEmail: string
  ) {
    return this.adminService.patchStatut(
      id,
      dto.statut,
      dto.raison,
      adminEmail
    );
  }

  @Post(':id/inviter')
  @ApiOperation({
    summary: "Envoyer / renvoyer l'invitation magic link — back-office",
  })
  async inviter(
    @Param('id') id: string,
    @CurrentUser('email') adminEmail: string
  ) {
    await this.assoAuthService.sendMagicLink(id);
    await this.adminService.log(id, adminEmail, 'INVITED', null);
    return { success: true };
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Lister les notes internes — back-office' })
  listNotes(@Param('id') id: string) {
    return this.adminService.listNotes(id);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Ajouter une note interne — back-office' })
  addNote(
    @Param('id') id: string,
    @Body() dto: AddNoteDto,
    @CurrentUser('email') adminEmail: string
  ) {
    return this.adminService.addNote(id, dto.contenu, adminEmail);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: "Journal d'audit paginé — back-office" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listLogs(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.adminService.listLogs(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20
    );
  }
}
