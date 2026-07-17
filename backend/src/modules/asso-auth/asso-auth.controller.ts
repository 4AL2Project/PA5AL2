import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, IsUUID } from 'class-validator';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../auth/roles.enum';
import { AssoAuthService } from './asso-auth.service';

class SendMagicLinkDto {
  @IsUUID()
  association_id!: string;
}

class RequestMagicLinkByEmailDto {
  @IsEmail()
  email!: string;
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

  @Post('request-link')
  @HttpCode(200)
  @ApiOperation({
    summary:
      "Demander un magic link depuis l'espace association (self-service, toujours 200)",
  })
  async requestLinkByEmail(@Body() dto: RequestMagicLinkByEmailDto) {
    await this.assoAuthService.sendMagicLinkByEmail(dto.email);
    // Réponse identique qu'on trouve ou non → pas d'énumération d'emails
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
