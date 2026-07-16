import { Module } from '@nestjs/common';

import { AssoAuthModule } from '../asso-auth/asso-auth.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { AssociationPublicController } from './association-public.controller';
import { AssociationRegistrationService } from './association-registration.service';
import { AssociationStatsService } from './association-stats.service';
import { AssociationsController } from './associations.controller';
import { AssociationsService } from './associations.service';

@Module({
  imports: [AuthModule, GeocodingModule, EmailModule, AssoAuthModule],
  controllers: [AssociationsController, AssociationPublicController],
  providers: [
    AssociationsService,
    AssociationRegistrationService,
    AssociationStatsService,
  ],
  exports: [AssociationsService, AssociationStatsService],
})
export class AssociationsModule {}
