import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateDemoRequestDto, CreateWaitlistEntryDto } from './dto/lead.dto';
import { LeadsService } from './leads.service';

@ApiTags('public-leads')
@Controller('api/public')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post('demo-request')
  @HttpCode(201)
  @ApiOperation({ summary: 'Enregistrer une demande de démo (landing page)' })
  createDemo(@Body() dto: CreateDemoRequestDto) {
    return this.leads.createDemoRequest(dto);
  }

  @Post('waitlist')
  @HttpCode(201)
  @ApiOperation({ summary: 'Inscription à la waitlist particuliers (landing page)' })
  joinWaitlist(@Body() dto: CreateWaitlistEntryDto) {
    return this.leads.createWaitlistEntry(dto);
  }
}
