// Gilles — v1.1
// US-83 : refresh token + US-84 : stats profil Customer
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { CustomerService } from './customer.service';
import { CustomerJwtPayload } from './customer-jwt-payload';
import { CustomerJwtGuard } from './guards/customer-jwt.guard';

interface AuthBody {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

@ApiTags('customers')
@Controller('api/customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post('register')
  @ApiOperation({ summary: 'Créer un compte Customer B2C' })
  register(@Body() body: AuthBody) {
    return this.customerService.register(
      body.email,
      body.password,
      body.first_name,
      body.last_name,
      body.phone
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion Customer B2C' })
  login(@Body() body: Pick<AuthBody, 'email' | 'password'>) {
    return this.customerService.login(body.email, body.password);
  }

  @Post('auth/request-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Envoie un code de connexion à 6 chiffres par email (app mobile)',
  })
  requestCode(@Body() body: { email: string }) {
    return this.customerService.requestCode(body.email);
  }

  @Post('auth/verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Vérifie le code OTP, crée le compte si nouveau et retourne les tokens',
  })
  verifyCode(@Body() body: { email: string; code: string }) {
    return this.customerService.verifyCode(body.email, body.code);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renouveler les tokens Customer — US-83' })
  refresh(@Body() body: { refresh_token: string }) {
    return this.customerService.refreshTokens(body.refresh_token);
  }

  @Get('me')
  @UseGuards(CustomerJwtGuard)
  @ApiOperation({ summary: 'Profil du Customer connecté' })
  me(@Req() req: Request & { customer: CustomerJwtPayload }) {
    return this.customerService.findById(req.customer.sub);
  }

  @Patch('me')
  @UseGuards(CustomerJwtGuard)
  @ApiOperation({ summary: 'Mise à jour partielle du profil Customer — US-86' })
  updateMe(
    @Req() req: Request & { customer: CustomerJwtPayload },
    @Body() body: { first_name?: string; last_name?: string; phone?: string }
  ) {
    return this.customerService.updateProfile(req.customer.sub, body);
  }

  @Get('me/stats')
  @UseGuards(CustomerJwtGuard)
  @ApiOperation({ summary: 'Statistiques du profil Customer — US-84' })
  stats(@Req() req: Request & { customer: CustomerJwtPayload }) {
    return this.customerService.getStats(req.customer.sub);
  }
}
