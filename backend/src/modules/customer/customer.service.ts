import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { config } from '../../core/config';
import { prisma } from '../../database/client';
import { CustomerJwtPayload } from './customer-jwt-payload';

@Injectable()
export class CustomerService {
  constructor(private readonly jwtService: JwtService) {}

  async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    phone?: string
  ) {
    const existing = await prisma.customer.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashed = await bcrypt.hash(password, config.auth.bcryptRounds);
    const customer = await prisma.customer.create({
      data: {
        email,
        password: hashed,
        first_name: firstName,
        last_name: lastName,
        phone,
      },
      select: {
        customer_id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        created_at: true,
      },
    });

    const token = this.signToken(customer.customer_id, customer.email);
    return { customer, access_token: token };
  }

  async login(email: string, password: string) {
    const customer = await prisma.customer.findUnique({
      where: { email },
    });
    if (!customer) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, customer.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.signToken(customer.customer_id, customer.email);
    const { password: _pw, ...safe } = customer;
    return { customer: safe, access_token: token };
  }

  async findById(customerId: string) {
    return prisma.customer.findUniqueOrThrow({
      where: { customer_id: customerId },
      select: {
        customer_id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        created_at: true,
      },
    });
  }

  private signToken(customerId: string, email: string): string {
    const payload: CustomerJwtPayload = {
      sub: customerId,
      email,
      type: 'customer',
    };
    return this.jwtService.sign(payload, {
      secret: config.auth.customerSecret,
      expiresIn: config.auth.accessTtl,
    });
  }
}
