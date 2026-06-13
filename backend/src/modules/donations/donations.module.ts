// Roger — v1.0
import { Module } from '@nestjs/common';

import { CerfaService } from './cerfa.service';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DonationsController],
  providers: [DonationsService, CerfaService],
  exports: [DonationsService, CerfaService],
})
export class DonationsModule {}
