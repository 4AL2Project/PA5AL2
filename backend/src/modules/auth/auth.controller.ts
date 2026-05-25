import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiGoneResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import {
  AuthTokensDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  RegisteredUserDto,
} from './dto/auth.dto';
import { AcceptInvitationDto, InvitationInfoDto } from './dto/invitation.dto';
import { MagicLinkRequestDto, MagicLinkVerifyDto } from './dto/magic-link.dto';
import { InvitationService } from './invitation.service';
import { MagicLinkService } from './magic-link.service';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly invitationService: InvitationService,
    private readonly magicLinkService: MagicLinkService
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Creer un compte utilisateur lie a une pharmacie' })
  @ApiOkResponse({ type: RegisteredUserDto })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(
      dto.email,
      dto.password,
      dto.pharmacy_id,
      dto.role
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Échanger email + password contre une paire de tokens',
  })
  @ApiOkResponse({ type: AuthTokensDto })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renouveler une paire de tokens via un refresh token',
  })
  @ApiOkResponse({ type: AuthTokensDto })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  // ─── Invitation flow ──────────────────────────────────────────────────────

  @Get('invitations/:token')
  @ApiOperation({
    summary: "Recuperer les infos pre-remplies d'une invitation",
  })
  @ApiOkResponse({ type: InvitationInfoDto })
  @ApiGoneResponse({ description: 'Token expire ou deja consomme' })
  getInvitation(@Param('token') token: string) {
    return this.invitationService.getByToken(token);
  }

  @Post('invitations/:token/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Finaliser le compte et retourner une paire de tokens JWT',
  })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiGoneResponse({ description: 'Token expire ou deja consomme' })
  acceptInvitation(
    @Param('token') token: string,
    @Body() dto: AcceptInvitationDto
  ) {
    return this.invitationService.accept(token, dto);
  }

  // ─── Magic link flow ──────────────────────────────────────────────────────

  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Envoyer un magic link de connexion (reponse toujours 200, rate-limite)',
  })
  sendMagicLink(@Body() dto: MagicLinkRequestDto) {
    return this.magicLinkService.send(dto.email);
  }

  @Post('magic-link/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consommer un magic link et retourner une session' })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiGoneResponse({ description: 'Token expire ou deja consomme' })
  verifyMagicLink(@Body() dto: MagicLinkVerifyDto) {
    return this.magicLinkService.verify(dto.token);
  }
}
