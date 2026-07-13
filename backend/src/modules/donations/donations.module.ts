import { Module } from '@nestjs/common';

import { AssociationsModule } from '../associations/associations.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { CerfaService } from './cerfa.service';
import { DonationCron } from './donation.cron';
import { DonationMatchingService } from './donation-matching.service';
import { DonationOrchestratorService } from './donation-orchestrator.service';
import { DonationPublicController } from './donation-public.controller';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';

@Module({
  imports: [AuthModule, EmailModule, AssociationsModule],
  controllers: [DonationsController, DonationPublicController],
  providers: [
    DonationsService,
    DonationMatchingService,
    DonationOrchestratorService,
    DonationCron,
    CerfaService,
  ],
  exports: [DonationsService, DonationOrchestratorService, CerfaService],
})
export class DonationsModule {}
