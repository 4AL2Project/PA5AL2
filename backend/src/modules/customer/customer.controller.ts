import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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

  @Get('me')
  @UseGuards(CustomerJwtGuard)
  @ApiOperation({ summary: 'Profil du Customer connecté' })
  me(@Req() req: Request & { customer: CustomerJwtPayload }) {
    return this.customerService.findById(req.customer.sub);
  }
}
