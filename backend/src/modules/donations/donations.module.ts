import { Module } from '@nestjs/common';

import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DonationsController],
  providers: [DonationsService],
  exports: [DonationsService],
})
export class DonationsModule {}
