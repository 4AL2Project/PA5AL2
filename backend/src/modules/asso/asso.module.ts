import { Module } from '@nestjs/common';

import { AssoAuthModule } from '../asso-auth/asso-auth.module';
import { DonationsModule } from '../donations/donations.module';
import { AssoController } from './asso.controller';
import { AssoService } from './asso.service';

@Module({
  imports: [AssoAuthModule, DonationsModule],
  controllers: [AssoController],
  providers: [AssoService],
})
export class AssoModule {}
