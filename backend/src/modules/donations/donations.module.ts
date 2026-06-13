// Roger — v1.0
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CerfaService } from './cerfa.service';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';

@Module({
  imports: [AuthModule],
  controllers: [DonationsController],
  providers: [DonationsService, CerfaService],
  exports: [DonationsService, CerfaService],
})
export class DonationsModule {}
