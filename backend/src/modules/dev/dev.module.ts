import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DevController } from './dev.controller';
import { DevService } from './dev.service';

@Module({
  imports: [AuthModule],
  controllers: [DevController],
  providers: [DevService],
})
export class DevModule {}
