import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { config } from '../../core/config';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { AssoAuthController } from './asso-auth.controller';
import { AssoAuthService } from './asso-auth.service';
import { JwtAssoGuard } from './jwt-asso.guard';

@Module({
  imports: [
    AuthModule,
    EmailModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: config.auth.accessSecret,
        signOptions: { expiresIn: config.auth.accessTtl },
      }),
    }),
  ],
  controllers: [AssoAuthController],
  providers: [AssoAuthService, JwtAssoGuard],
  exports: [AssoAuthService, JwtAssoGuard, JwtModule],
})
export class AssoAuthModule {}
