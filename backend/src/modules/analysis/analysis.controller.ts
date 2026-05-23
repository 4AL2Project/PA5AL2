import { BadRequestException,Controller, Get, Query } from '@nestjs/common';

import { AnalysisService } from './analysis.service';

@Controller('api/analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('latest')
  async getLatest(@Query('pharmacy_id') pharmacyId: string) {
    if (!pharmacyId) throw new BadRequestException('pharmacy_id is required');
    return this.analysisService.getLatestAnalysis(pharmacyId);
  }
}
