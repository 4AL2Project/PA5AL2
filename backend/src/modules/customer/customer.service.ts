// Gilles — v1.1
// US-83 : refresh token Customer + US-84 : stats profil
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

type CustomerRefreshPayload = {
  sub: string;
  email: string;
  type: 'customer_refresh';
};

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
    const existing = await prisma.customer.findUnique({ where: { email } });
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

    return {
      customer,
      access_token: this.signAccessToken(customer.customer_id, customer.email),
      refresh_token: this.signRefreshToken(
        customer.customer_id,
        customer.email
      ),
    };
  }

  async login(email: string, password: string) {
    const customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, customer.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const { password: _pw, ...safe } = customer;
    return {
      customer: safe,
      access_token: this.signAccessToken(customer.customer_id, customer.email),
      refresh_token: this.signRefreshToken(
        customer.customer_id,
        customer.email
      ),
    };
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

  /** Renouvelle l'access token à partir d'un refresh token valide — US-83 */
  async refreshTokens(refreshToken: string) {
    let payload: CustomerRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<CustomerRefreshPayload>(
        refreshToken,
        { secret: config.auth.customerSecret }
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'customer_refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    return {
      access_token: this.signAccessToken(payload.sub, payload.email),
      refresh_token: this.signRefreshToken(payload.sub, payload.email),
    };
  }

  /** Statistiques agrégées du Customer pour l'écran Profil — US-84 */
  async getStats(customerId: string) {
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { customer_id: customerId },
      select: { created_at: true },
    });

    const orders = await prisma.order.findMany({
      where: { customer_id: customerId, status: 'RETIREE' },
      include: {
        offer: {
          select: {
            discounted_price: true,
            product: { select: { unit_price: true } },
          },
        },
      },
    });

    const totalSaved = orders.reduce((acc, order) => {
      const original = (order.offer.product as { unit_price: number })
        .unit_price;
      return acc + (original - order.offer.discounted_price) * order.quantity;
    }, 0);

    return {
      totalSaved: Math.round(totalSaved * 100),
      ordersCount: orders.length,
      favoritePharmaciesCount: 0,
      memberSince: customer.created_at,
    };
  }

  private signAccessToken(customerId: string, email: string): string {
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

  private signRefreshToken(customerId: string, email: string): string {
    const payload: CustomerRefreshPayload = {
      sub: customerId,
      email,
      type: 'customer_refresh',
    };
    return this.jwtService.sign(payload, {
      secret: config.auth.customerSecret,
      expiresIn: config.auth.refreshTtl,
    });
  }
}
