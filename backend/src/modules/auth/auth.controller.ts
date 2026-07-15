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
  ApiGoneResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  AuthTokensDto,
  LoginDto,
  MeResponseDto,
  RefreshDto,
  RegisterDto,
  RegisteredUserDto,
} from './dto/auth.dto';
import { MagicLinkRequestDto, MagicLinkVerifyDto } from './dto/magic-link.dto';
import {
  PreparateurRequestCodeDto,
  PreparateurRequestCodeResponseDto,
  PreparateurVerifyCodeDto,
} from './dto/preparateur-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MagicLinkService } from './magic-link.service';
import { PreparateurOtpService } from './preparateur-otp.service';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly magicLinkService: MagicLinkService,
    private readonly preparateurOtpService: PreparateurOtpService
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

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: "Profil centralisé de l'utilisateur courant (adapté à son rôle)",
  })
  @ApiOkResponse({ type: MeResponseDto })
  me(@CurrentUser('sub') userId: string) {
    return this.authService.me(userId);
  }

  // ─── Connexion préparateur par code OTP ───────────────────────────────────

  @Post('preparateur/request-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Envoyer un code à 6 chiffres au préparateur (réponse toujours 200, rate-limitée)',
  })
  @ApiOkResponse({ type: PreparateurRequestCodeResponseDto })
  requestPreparateurCode(@Body() dto: PreparateurRequestCodeDto) {
    return this.preparateurOtpService.requestCode(dto.email);
  }

  @Post('preparateur/verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consommer le code du préparateur et retourner une session',
  })
  @ApiOkResponse({ type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Code invalide ou expire' })
  verifyPreparateurCode(@Body() dto: PreparateurVerifyCodeDto) {
    return this.preparateurOtpService.verifyCode(dto.email, dto.code);
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
