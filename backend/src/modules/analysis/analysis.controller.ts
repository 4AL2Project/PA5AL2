import { Controller, Get, Query } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { Req } from '@nestjs/common';
import { AuthRequest } from '../auth/auth.middleware';

@Controller('api/analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('latest')
  async getLatest(@Req() req: AuthRequest) {
    const pharmacyId = req.user!.pharmacy_id!;
    return this.analysisService.getLatestAnalysis(pharmacyId);
  }
}
