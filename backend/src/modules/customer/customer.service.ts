// Gilles — v1.1
// US-83 : refresh token Customer + US-84 : stats profil
import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { config } from '../../core/config';
import { prisma } from '../../database/client';
import { EmailService } from '../email/email.service';
import { CustomerJwtPayload } from './customer-jwt-payload';
import { generateOtpCode, hashOtpCode } from './customer-otp.util';
import { UpdateCustomerMeDto } from './dto/customer.dto';

type CustomerRefreshPayload = {
  sub: string;
  email: string;
  type: 'customer_refresh';
};

// Champs de profil renvoyés au client mobile (jamais le mot de passe)
const CUSTOMER_PUBLIC_SELECT = {
  customer_id: true,
  email: true,
  civility: true,
  first_name: true,
  last_name: true,
  phone: true,
  created_at: true,
} as const;

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService
  ) {}

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
      select: CUSTOMER_PUBLIC_SELECT,
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
    if (!customer || !customer.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

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

  /**
   * Envoie un code OTP à 6 chiffres à l'email fourni (connexion app mobile).
   * Réponse générique : ne révèle pas l'existence du compte.
   */
  async requestCode(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    const windowStart = new Date(
      Date.now() - config.auth.customerOtpRateLimitWindowMs
    );
    const recentCount = await prisma.customerOtp.count({
      where: { email: normalizedEmail, created_at: { gte: windowStart } },
    });
    if (recentCount >= config.auth.customerOtpRateLimit) {
      this.logger.warn(`OTP rate limit reached for ${normalizedEmail}`);
      return { message: 'Un code a déjà été envoyé, réessayez plus tard.' };
    }

    // Invalide les codes précédents non consommés pour cet email
    await prisma.customerOtp.updateMany({
      where: { email: normalizedEmail, consumed_at: null },
      data: { consumed_at: new Date() },
    });

    const code = generateOtpCode(config.auth.customerOtpLength);
    await prisma.customerOtp.create({
      data: {
        email: normalizedEmail,
        code_hash: hashOtpCode(code),
        expires_at: new Date(Date.now() + config.auth.customerOtpTtlMs),
      },
    });

    await this.emailService.sendOtpCodeEmail(normalizedEmail, code);
    this.logger.log(`OTP code sent to ${normalizedEmail}`);

    return { message: 'Code envoyé' };
  }

  /**
   * Vérifie le code OTP. Crée le compte Customer s'il n'existe pas encore,
   * puis retourne { customer, access_token, refresh_token }.
   * Lève UnauthorizedException('Code invalide') pour la maquette mobile.
   */
  async verifyCode(email: string, code: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const otp = await prisma.customerOtp.findFirst({
      where: { email: normalizedEmail, consumed_at: null },
      orderBy: { created_at: 'desc' },
    });

    if (!otp || otp.expires_at < new Date()) {
      throw new UnauthorizedException('Code invalide');
    }

    if (otp.attempts >= config.auth.customerOtpMaxAttempts) {
      await prisma.customerOtp.update({
        where: { otp_id: otp.otp_id },
        data: { consumed_at: new Date() },
      });
      throw new UnauthorizedException('Code invalide');
    }

    if (otp.code_hash !== hashOtpCode(code.trim())) {
      await prisma.customerOtp.update({
        where: { otp_id: otp.otp_id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Code invalide');
    }

    await prisma.customerOtp.update({
      where: { otp_id: otp.otp_id },
      data: { consumed_at: new Date() },
    });

    let customer = await prisma.customer.findUnique({
      where: { email: normalizedEmail },
      select: CUSTOMER_PUBLIC_SELECT,
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: { email: normalizedEmail },
        select: CUSTOMER_PUBLIC_SELECT,
      });
      this.logger.log(`Customer created via OTP: ${normalizedEmail}`);
    }

    return {
      customer,
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
      select: CUSTOMER_PUBLIC_SELECT,
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

  /** Mise à jour partielle du profil Customer — US-86 */
  async updateProfile(customerId: string, dto: UpdateCustomerMeDto) {
    return prisma.customer.update({
      where: { customer_id: customerId },
      data: dto,
      select: CUSTOMER_PUBLIC_SELECT,
    });
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
