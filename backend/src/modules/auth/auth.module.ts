import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';
import { MaskFinancialInterceptor } from './interceptors/mask-financial.interceptor';
import { InvitationService } from './invitation.service';
import { MagicLinkService } from './magic-link.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, AdminController],
  providers: [
    AuthService,
    InvitationService,
    MagicLinkService,
    AdminService,
    EmailService,
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    MaskFinancialInterceptor,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
    MaskFinancialInterceptor,
    JwtModule,
  ],
})
export class AuthModule {}
