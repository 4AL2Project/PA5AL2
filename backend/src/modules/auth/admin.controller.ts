import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
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

import { AdminService } from './admin.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { CreatePharmacyDto, CreatePharmacyResponseDto } from './dto/admin.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UserRole } from './roles.enum';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN_SAVELY)
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
