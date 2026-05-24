import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { config } from '../../core/config';
import { prisma } from '../../database/client';
import { UserRole } from './roles.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  pharmacy_id: string;
  role: UserRole;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async register(
    email: string,
    password: string,
    pharmacyId: string,
    role: UserRole = UserRole.TITULAIRE
  ) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');

    const pharmacy = await prisma.pharmacy.findUnique({
      where: { pharmacy_id: pharmacyId },
    });
    if (!pharmacy) throw new UnauthorizedException('Invalid pharmacy');

    const hash = await bcrypt.hash(password, config.auth.bcryptRounds);
    const user = await prisma.user.create({
      data: { email, password: hash, pharmacy_id: pharmacyId, role },
      select: {
        user_id: true,
        email: true,
        pharmacy_id: true,
        role: true,
        created_at: true,
      },
    });
    return user;
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens({
      sub: user.user_id,
      email: user.email,
      pharmacy_id: user.pharmacy_id,
      role: user.role as UserRole,
    });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: config.auth.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return this.issueTokens({
      sub: payload.sub,
      email: payload.email,
      pharmacy_id: payload.pharmacy_id,
      role: payload.role,
    });
  }

  private async issueTokens(payload: JwtPayload): Promise<AuthTokens> {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: config.auth.accessSecret,
        expiresIn: config.auth.accessTtl,
      }),
      this.jwtService.signAsync(payload, {
        secret: config.auth.refreshSecret,
        expiresIn: config.auth.refreshTtl,
      }),
    ]);
    return { access_token, refresh_token };
  }
}
