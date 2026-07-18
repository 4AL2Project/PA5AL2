import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AdminLeadsController } from './admin-leads.controller';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [AuthModule],
  controllers: [LeadsController, AdminLeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
