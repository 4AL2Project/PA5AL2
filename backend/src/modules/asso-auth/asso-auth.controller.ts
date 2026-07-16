import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/roles.enum';
import { AssoAuthService } from './asso-auth.service';

class SendMagicLinkDto {
  @IsUUID()
  association_id!: string;
}

class VerifyTokenDto {
  @IsString()
  token!: string;
}

@ApiTags('asso-auth')
@Controller('asso/auth')
export class AssoAuthController {
  constructor(private readonly assoAuthService: AssoAuthService) {}

  @Post('magic-link')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_SAVELY)
  @ApiOperation({
    summary:
      "Envoyer un magic link d'accès à l'espace association (admin Savely)",
  })
  async sendMagicLink(@Body() dto: SendMagicLinkDto) {
    await this.assoAuthService.sendMagicLink(dto.association_id);
    return { success: true };
  }

  @Get('verify')
  @ApiOperation({
    summary: 'Vérifier le magic link et obtenir un JWT association (public)',
  })
  verify(@Query() dto: VerifyTokenDto) {
    return this.assoAuthService.verifyToken(dto.token);
  }
}
