import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { CreatePharmacyDto, CreatePharmacyResponseDto } from './dto/admin.dto';

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

  @Get('pharmacies')
  @ApiOperation({
    summary:
      'Liste les pharmacies inscrites avec leur titulaire (ADMIN_SAVELY uniquement)',
  })
  @ApiOkResponse({ description: 'Liste des pharmacies' })
  @ApiForbiddenResponse({ description: 'Reserve aux administrateurs Savely' })
  listPharmacies(@CurrentUser() user: { role: UserRole; pharmacy_id: string }) {
    return this.adminService.listPharmacies(user.role, user.pharmacy_id);
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

  @Get('companies')
  @ApiOperation({
    summary:
      'Recherche d’officines via recherche-entreprises.api.gouv.fr pour pré-remplir le formulaire (ADMIN_SAVELY uniquement)',
  })
  @ApiOkResponse({ type: [CompanySuggestionDto] })
  @ApiForbiddenResponse({ description: 'Reserve aux administrateurs Savely' })
  searchCompanies(@Query('q') q: string) {
    return this.companySearch.search(q ?? '');
  }
}
