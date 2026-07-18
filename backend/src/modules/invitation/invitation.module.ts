import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { GeocodingModule } from '../geocoding/geocoding.module';
import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';

@Module({
  imports: [JwtModule.register({}), GeocodingModule],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
