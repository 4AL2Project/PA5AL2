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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/roles.enum';
import { DevService } from './dev.service';
import { DevOnlyGuard } from './dev-only.guard';
import { ResetDatabaseDto, ResetDatabaseResponseDto } from './dto/dev.dto';

@ApiTags('dev')
@ApiBearerAuth()
@UseGuards(DevOnlyGuard, JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN_SAVELY)
@Controller('api/dev')
export class DevController {
  constructor(private readonly devService: DevService) {}

  @Get('counts')
  @ApiOperation({ summary: 'Nombre de lignes par table (dev uniquement)' })
  @ApiOkResponse({ description: 'Compteurs par table' })
  counts() {
    return this.devService.counts();
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Vide toutes les tables, avec rejeu du seed optionnel (dev uniquement)',
  })
  @ApiOkResponse({ type: ResetDatabaseResponseDto })
  reset(@Body() dto: ResetDatabaseDto) {
    return this.devService.reset(dto.seed ?? false);
  }
}
