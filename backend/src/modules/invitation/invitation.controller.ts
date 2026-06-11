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

import { AuthTokensDto } from '../auth/dto/auth.dto';
import { AcceptInvitationDto, InvitationInfoDto } from './dto/invitation.dto';
import { InvitationService } from './invitation.service';

@ApiTags('auth')
@Controller('api/auth/invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get(':token')
  @ApiOperation({
    summary: "Recuperer les infos pre-remplies d'une invitation",
  })
  @ApiOkResponse({ type: InvitationInfoDto })
  @ApiGoneResponse({ description: 'Token expire ou deja consomme' })
  getInvitation(@Param('token') token: string) {
    return this.invitationService.getByToken(token);
  }

  @Post(':token/accept')
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
}
