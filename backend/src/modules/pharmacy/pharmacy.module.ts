import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';

@Module({
  imports: [AuthModule],
  controllers: [PharmacyController],
  providers: [PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
