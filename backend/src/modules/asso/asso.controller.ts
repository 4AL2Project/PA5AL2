import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { prisma } from '../../database/client';
import { AssoId } from '../asso-auth/asso-id.decorator';
import { JwtAssoGuard } from '../asso-auth/jwt-asso.guard';
import { DonationOrchestratorService } from '../donations/donation-orchestrator.service';
import { AssoService, UpdateAssoProfileDto } from './asso.service';

class UpdateProfileDto implements UpdateAssoProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contact_phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  site_web?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsArray()
  categories?: string[];

  @IsOptional()
  pickup_windows?: unknown;
}

class AccepterOffreDto {
  @IsISO8601()
  pickup_slot_start!: string;

  @IsISO8601()
  pickup_slot_end!: string;

  @IsString()
  @MaxLength(120)
  picked_up_by!: string;
}

class RefuserOffreDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

@ApiTags('asso')
@ApiBearerAuth('asso-token')
@Controller('asso')
@UseGuards(JwtAssoGuard)
export class AssoController {
  constructor(
    private readonly assoService: AssoService,
    private readonly orchestrator: DonationOrchestratorService
  ) {}

  // ── Profil ────────────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Profil de mon association + créneaux de retrait' })
  getMe(@AssoId() assoId: string) {
    return this.assoService.getProfile(assoId);
  }

  @Put('me')
  @ApiOperation({
    summary:
      'Mettre à jour mon profil (onboarding complété au premier appel)',
  })
  updateMe(@AssoId() assoId: string, @Body() dto: UpdateProfileDto) {
    return this.assoService.updateProfile(assoId, dto);
  }

  // ── Offres (propositions ENVOYEE) ─────────────────────────────────────────

  @Get('offres')
  @ApiOperation({ summary: 'Propositions de dons en attente pour mon asso' })
  getOffres(@AssoId() assoId: string) {
    return this.assoService.getOffres(assoId);
  }

  @Get('offres/:id')
  @ApiOperation({ summary: "Détail d'une proposition de don" })
  getOffre(@AssoId() assoId: string, @Param('id') proposalId: string) {
    return this.assoService.getOffre(assoId, proposalId);
  }

  @Post('offres/:id/accepter')
  @ApiOperation({
    summary: 'Accepter une proposition de don avec créneau de retrait',
  })
  async accepterOffre(
    @AssoId() assoId: string,
    @Param('id') proposalId: string,
    @Body() dto: AccepterOffreDto
  ) {
    const proposal = await prisma.donationProposal.findFirst({
      where: { proposal_id: proposalId, association_id: assoId },
    });
    if (!proposal) throw new NotFoundException('Proposition introuvable');

    return this.orchestrator.respondToProposal(proposal.token, {
      decision: 'ACCEPT',
      slot_start: dto.pickup_slot_start,
      slot_end: dto.pickup_slot_end,
    });
  }

  @Post('offres/:id/refuser')
  @ApiOperation({ summary: 'Refuser une proposition de don' })
  async refuserOffre(
    @AssoId() assoId: string,
    @Param('id') proposalId: string,
    @Body() dto: RefuserOffreDto
  ) {
    const proposal = await prisma.donationProposal.findFirst({
      where: { proposal_id: proposalId, association_id: assoId },
    });
    if (!proposal) throw new NotFoundException('Proposition introuvable');

    return this.orchestrator.respondToProposal(proposal.token, {
      decision: 'REFUSE',
      refusal_reason: dto.reason,
    });
  }

  // ── Dons (allocations) ────────────────────────────────────────────────────

  @Get('dons')
  @ApiOperation({ summary: 'Historique de tous mes dons (allocations)' })
  getDons(@AssoId() assoId: string) {
    return this.assoService.getDons(assoId);
  }

  @Get('dons/:id')
  @ApiOperation({ summary: "Détail d'un don (allocation) + cerfa_url si disponible" })
  getDon(@AssoId() assoId: string, @Param('id') allocationId: string) {
    return this.assoService.getDon(assoId, allocationId);
  }
}
