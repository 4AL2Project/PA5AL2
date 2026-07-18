import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CategoryModule } from '../category/category.module';
import { CustomerModule } from '../customer/customer.module';
import { OfferController } from './offer.controller';
import { OfferService } from './offer.service';

@Module({
  imports: [AuthModule, CustomerModule, CategoryModule],
  controllers: [OfferController],
  providers: [OfferService],
  exports: [OfferService],
})
export class OfferModule {}
