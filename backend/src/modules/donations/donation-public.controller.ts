// Pages asso tokenisées : l'asso n'a PAS de compte, toute interaction passe
// par un token à usage unique lié à une proposition (jamais d'auth asso).
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { DonationOrchestratorService } from './donation-orchestrator.service';
import { RespondProposalDto } from './dto/donation.dto';

@ApiTags('public-donations')
@Controller('api/public/don')
export class DonationPublicController {
  constructor(private readonly orchestrator: DonationOrchestratorService) {}

  @Get(':token')
  @ApiOperation({
    summary:
      "État d'une proposition de don — page d'état propre pour tout token non actionnable",
  })
  getProposal(@Param('token') token: string) {
    return this.orchestrator.getProposalView(token);
  }

  @Post(':token')
  @ApiOperation({
    summary:
      "Répondre à une proposition : accepter (total/partiel + créneau) ou refuser. 409 si la proposition n'est plus disponible.",
  })
  respond(@Param('token') token: string, @Body() dto: RespondProposalDto) {
    return this.orchestrator.respondToProposal(token, dto);
  }
}
