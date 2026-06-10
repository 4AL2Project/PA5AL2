import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CompanyModule } from '../company/company.module';
import { EmailModule } from '../email/email.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule, EmailModule, CompanyModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
