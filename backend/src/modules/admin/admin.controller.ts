import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/roles.enum';
import { CompanySearchService } from '../company/company-search.service';
import { CompanySuggestionDto } from '../company/dto/company.dto';
import { AdminService } from './admin.service';
import {
  AdminUserDto,
  CreateAdminUserDto,
  CreatePharmacyDto,
  CreatePharmacyResponseDto,
  CreatePreparateurDto,
  PharmacyDetailDto,
  PreparateurDto,
  UpdateAdminUserDto,
  UpdateAdminUserStatusDto,
  UpdatePharmacyDto,
  UpdatePharmacyStatusDto,
  UpdatePreparateurDto,
  UpdatePreparateurStatusDto,
} from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN_SAVELY)
@Controller('api/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly companySearch: CompanySearchService
  ) {}

  @Get('stats')
  @ApiOperation({
    summary:
      'Metriques plateforme pour le tableau de bord admin (ADMIN_SAVELY uniquement)',
  })
  @ApiOkResponse({ description: 'Statistiques agregees de la plateforme' })
  @ApiForbiddenResponse({ description: 'Reserve aux administrateurs Savely' })
  getStats(@CurrentUser() user: { role: UserRole }) {
    return this.adminService.getPlatformStats(user.role);
  }

  @Get('pharmacies')
  @ApiOperation({
    summary:
      'Liste les pharmacies inscrites avec leur titulaire (ADMIN_SAVELY uniquement)',
  })
  @ApiOkResponse({ description: 'Liste des pharmacies' })
  @ApiForbiddenResponse({ description: 'Reserve aux administrateurs Savely' })
  listPharmacies(@CurrentUser() user: { role: UserRole }) {
    return this.adminService.listPharmacies(user.role);
  }

  @Get('pharmacies/:id')
  @ApiOperation({
    summary:
      "Detail d'une officine, son titulaire et ses preparateurs (ADMIN_SAVELY uniquement)",
  })
  @ApiOkResponse({ type: PharmacyDetailDto })
  @ApiForbiddenResponse({ description: 'Reserve aux administrateurs Savely' })
  @ApiNotFoundResponse({ description: 'Officine introuvable' })
  getPharmacy(
    @Param('id') id: string,
    @CurrentUser() user: { role: UserRole }
  ) {
    return this.adminService.getPharmacy(id, user.role);
  }

  @Post('pharmacies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Creer une pharmacie et envoyer une invitation au titulaire (ADMIN_SAVELY uniquement)',
  })
  @ApiCreatedResponse({ type: CreatePharmacyResponseDto })
  @ApiForbiddenResponse({ description: 'Reserve aux administrateurs Savely' })
  createPharmacy(
    @Body() dto: CreatePharmacyDto,
    @CurrentUser() user: { role: UserRole }
  ) {
    return this.adminService.createPharmacyWithTitulaire(
      dto.pharmacy,
      dto.titulaire,
      user.role
    );
  }

  @Patch('pharmacies/:id')
  @ApiOperation({
    summary:
      "Modifier les infos d'une officine et de son gerant (ADMIN_SAVELY uniquement)",
  })
  @ApiOkResponse({ type: PharmacyDetailDto })
  @ApiForbiddenResponse({ description: 'Reserve aux administrateurs Savely' })
  @ApiNotFoundResponse({ description: 'Officine introuvable' })
  updatePharmacy(
    @Param('id') id: string,
    @Body() dto: UpdatePharmacyDto,
    @CurrentUser() user: { role: UserRole }
  ) {
    return this.adminService.updatePharmacy(id, user.role, dto);
  }

  @Patch('pharmacies/:id/status')
  @ApiOperation({
    summary: 'Activer ou desactiver une officine (ADMIN_SAVELY uniquement)',
  })
  @ApiOkResponse({ type: PharmacyDetailDto })
  @ApiForbiddenResponse({ description: 'Reserve aux administrateurs Savely' })
  @ApiNotFoundResponse({ description: 'Officine introuvable' })
  setPharmacyStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePharmacyStatusDto,
    @CurrentUser() user: { role: UserRole }
  ) {
    return this.adminService.setPharmacyStatus(id, user.role, dto.status);
  }

  @Delete('pharmacies/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Supprimer définitivement une officine désactivée (ADMIN_SAVELY uniquement)',
  })
  @ApiOkResponse({ description: 'Officine supprimée' })
  @ApiForbiddenResponse({ description: 'Reserve aux administrateurs Savely' })
  @ApiNotFoundResponse({ description: 'Officine introuvable' })
  deletePharmacy(
    @Param('id') id: string,
    @CurrentUser() user: { role: UserRole }
  ) {
    return this.adminService.deletePharmacy(id, user.role);
  }

  @Post('pharmacies/:id/resend-invitation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Renvoyer le lien d'invitation au gerant de l'officine (ADMIN_SAVELY uniquement)",
  })
  @ApiOkResponse({ description: 'Invitation renvoyee' })
  @ApiForbiddenResponse({ description: 'Reserve aux administrateurs Savely' })
  @ApiNotFoundResponse({ description: 'Officine introuvable' })
  resendInvitation(
    @Param('id') id: string,
    @CurrentUser() user: { role: UserRole }
  ) {
    return this.adminService.resendInvitation(id, user.role);
  }

  @Post('pharmacies/:id/preparateurs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Ajouter un preparateur de commande a une officine (ADMIN_SAVELY uniquement)',
  })
  @ApiCreatedResponse({ type: PreparateurDto })
  @ApiForbiddenResponse({ description: 'Reserve aux administrateurs Savely' })
  @ApiNotFoundResponse({ description: 'Officine introuvable' })
  addPreparateur(
    @Param('id') id: string,
    @Body() dto: CreatePreparateurDto,
    @CurrentUser() user: { role: UserRole }
  ) {
    return this.adminService.addPreparateur(id, user.role, dto);
  }

  @Patch('pharmacies/:id/preparateurs/:userId')
  @ApiOperation({
    summary: 'Modifier un preparateur de commande (ADMIN_SAVELY uniquement)',
  })
  @ApiOkResponse({ type: PreparateurDto })
  @ApiForbiddenResponse({ description: 'Reserve aux administrateurs Savely' })
  @ApiNotFoundResponse({ description: 'Preparateur introuvable' })
  updatePreparateur(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdatePreparateurDto,
    @CurrentUser() user: { role: UserRole }
  ) {
    return this.adminService.updatePreparateur(id, user.role, userId, dto);
  }

  @Patch('pharmacies/:id/preparateurs/:userId/status')
  @ApiOperation({
    summary:
      'Activer ou desactiver un preparateur de commande (ADMIN_SAVELY uniquement)',
  })
  @ApiOkResponse({ type: PreparateurDto })
  @ApiForbiddenResponse({ description: 'Reserve aux administrateurs Savely' })
  @ApiNotFoundResponse({ description: 'Preparateur introuvable' })
  setPreparateurStatus(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: UpdatePreparateurStatusDto,
    @CurrentUser() user: { role: UserRole }
  ) {
    return this.adminService.setPreparateurStatus(
      id,
      user.role,
      userId,
      dto.status
    );
  }

  @Delete('pharmacies/:id/preparateurs/:userId')
  @ApiOperation({
    summary: 'Supprimer un preparateur de commande (ADMIN_SAVELY uniquement)',
  })
  @ApiOkResponse({ description: 'Preparateur supprime' })
  @ApiForbiddenResponse({ description: 'Reserve aux administrateurs Savely' })
  @ApiNotFoundResponse({ description: 'Preparateur introuvable' })
  deletePreparateur(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: { role: UserRole }
  ) {
    return this.adminService.deletePreparateur(id, user.role, userId);
  }

  @Get('companies')
  @ApiOperation({
    summary:
      "Recherche d'officines via recherche-entreprises.api.gouv.fr pour pre-remplir le formulaire (ADMIN_SAVELY uniquement)",
  })
  @ApiOkResponse({ type: [CompanySuggestionDto] })
  @ApiForbiddenResponse({ description: 'Reserve aux administrateurs Savely' })
  searchCompanies(@Query('q') q: string) {
    return this.companySearch.search(q ?? '');
  }

  // ─── Admin Users CRUD ────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'Liste des comptes ADMIN_SAVELY (paginée)' })
  @ApiOkResponse({ type: [AdminUserDto] })
  listAdminUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.listAdminUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20
    );
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Inviter un nouvel administrateur Savely par email',
  })
  @ApiCreatedResponse({ type: AdminUserDto })
  createAdminUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createAdminUser(dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: "Modifier le nom/prenom d'un administrateur" })
  @ApiOkResponse({ type: AdminUserDto })
  updateAdminUser(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.adminService.updateAdminUser(id, dto);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activer ou désactiver un administrateur' })
  @ApiOkResponse({ type: AdminUserDto })
  setAdminUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAdminUserStatusDto,
    @CurrentUser() user: { sub: string }
  ) {
    return this.adminService.setAdminUserStatus(id, dto.status, user.sub);
  }

  @Post('users/:id/resend-invitation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Renvoyer l'invitation à un admin en PENDING" })
  resendAdminUserInvitation(@Param('id') id: string) {
    return this.adminService.resendAdminUserInvitation(id);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Désactiver un administrateur (soft delete)' })
  @ApiOkResponse({ type: AdminUserDto })
  deactivateAdminUser(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string }
  ) {
    return this.adminService.deactivateAdminUser(id, user.sub);
  }
}
