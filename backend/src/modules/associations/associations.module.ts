import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AssociationsController } from './associations.controller';
import { AssociationsService } from './associations.service';

@Module({
  imports: [AuthModule],
  controllers: [AssociationsController],
  providers: [AssociationsService],
  exports: [AssociationsService],
})
export class AssociationsModule {}
