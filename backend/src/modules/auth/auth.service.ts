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
import { AuthTokens, JwtPayload } from './jwt-payload';
import { UserRole } from './roles.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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
    this.logger.log(
      `User registered: ${email} [pharmacy=${pharmacyId}, role=${role}]`
    );
    return user;
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      this.logger.warn(`Login failed (unknown user): ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      this.logger.warn(`Login failed (wrong password): ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      this.logger.warn(`Login refused (status=${user.status}): ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in: ${email} [pharmacy=${user.pharmacy_id}]`);

    return this.issueTokens({
      sub: user.user_id,
      email: user.email,
      pharmacy_id: user.pharmacy_id,
      role: user.role as UserRole,
    });
  }

  /**
   * Profil centralisé de l'utilisateur courant, adapté à son rôle.
   *
   * Spécificités par rôle :
   * - ADMIN_SAVELY : compte plateforme, aucune officine rattachée
   *   (`pharmacy = null`).
   * - TITULAIRE : officine complète, incluant l'abonnement (donnée commerciale).
   * - PREPARATEUR : officine sans l'abonnement (donnée commerciale du titulaire)
   *   et sans visibilité financière.
   */
  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        pharmacy: {
          select: {
            pharmacy_id: true,
            name: true,
            email: true,
            address: true,
            siret: true,
            status: true,
            subscription_tier: true,
            last_upload_at: true,
          },
        },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const role = user.role as UserRole;

    const profile = {
      user_id: user.user_id,
      email: user.email,
      role,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      status: user.status,
      accepted_terms_at: user.accepted_terms_at,
      created_at: user.created_at,
    };

    // ADMIN_SAVELY n'est rattaché à aucune officine.
    if (role === UserRole.ADMIN_SAVELY) {
      return { ...profile, pharmacy: null };
    }

    const pharmacy = user.pharmacy
      ? {
          pharmacy_id: user.pharmacy.pharmacy_id,
          name: user.pharmacy.name,
          email: user.pharmacy.email,
          address: user.pharmacy.address,
          siret: user.pharmacy.siret,
          status: user.pharmacy.status,
          last_upload_at: user.pharmacy.last_upload_at,
          // L'abonnement est une donnée commerciale réservée au titulaire.
          ...(role === UserRole.TITULAIRE
            ? { subscription_tier: user.pharmacy.subscription_tier }
            : {}),
        }
      : null;

    return { ...profile, pharmacy };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: config.auth.refreshSecret,
      });
    } catch {
      this.logger.warn(
        'Token refresh failed: invalid or expired refresh token'
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    this.logger.debug(`Token refreshed for user ${payload.sub}`);

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
