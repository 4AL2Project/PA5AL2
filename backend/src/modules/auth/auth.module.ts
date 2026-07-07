import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { EmailModule } from '../email/email.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';
import { MaskFinancialInterceptor } from './interceptors/mask-financial.interceptor';
import { MagicLinkService } from './magic-link.service';

@Module({
  imports: [JwtModule.register({}), EmailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    MagicLinkService,
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
