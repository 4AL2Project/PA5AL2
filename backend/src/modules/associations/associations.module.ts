import { Module } from '@nestjs/common';

import { AssociationsController } from './associations.controller';
import { AssociationsService } from './associations.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AssociationsController],
  providers: [AssociationsService],
  exports: [AssociationsService],
})
export class AssociationsModule {}
