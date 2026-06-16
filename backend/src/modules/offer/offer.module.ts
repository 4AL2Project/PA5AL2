import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CustomerModule } from '../customer/customer.module';
import { OfferController } from './offer.controller';
import { OfferService } from './offer.service';

@Module({
  imports: [AuthModule, CustomerModule],
  controllers: [OfferController],
  providers: [OfferService],
  exports: [OfferService],
})
export class OfferModule {}
