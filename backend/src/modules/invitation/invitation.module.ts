import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { InvitationController } from './invitation.controller';
import { InvitationService } from './invitation.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
