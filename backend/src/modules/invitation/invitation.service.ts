import { BadRequestException, GoneException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { config } from '../../core/config';
import { prisma } from '../../database/client';
import { JwtPayload } from '../auth/jwt-payload';
import { UserRole } from '../auth/roles.enum';
import { hashToken } from '../auth/token.util';
import { GeocodingService } from '../geocoding/geocoding.service';

@Injectable()
export class InvitationService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly geocoding: GeocodingService
  ) {}

  async getByToken(rawToken: string) {
    const record = await this.findValid(rawToken);
    return {
      role: record.user.role,
      pharmacy: record.user.pharmacy,
      titulaire: {
        first_name: record.user.first_name,
        last_name: record.user.last_name,
        email: record.user.email,
        phone: record.user.phone,
      },
      expires_at: record.expires_at,
    };
  }

  async accept(
    rawToken: string,
    body: {
      pharmacy: { name: string; address: string; siret: string };
      titulaire: { first_name: string; last_name: string; phone: string };
      accepted_terms: unknown;
    }
  ) {
    if (body.accepted_terms !== true) {
      throw new BadRequestException(
        'Vous devez accepter les CGU pour finaliser votre compte'
      );
    }

    const record = await this.findValid(rawToken);
    const user = record.user;

    const coords = await this.geocoding.geocode(body.pharmacy.address);

    await prisma.pharmacy.update({
      where: { pharmacy_id: user.pharmacy_id! },
      data: {
        name: body.pharmacy.name,
        address: body.pharmacy.address,
        siret: body.pharmacy.siret,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      },
    });

    const updatedUser = await prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        first_name: body.titulaire.first_name,
        last_name: body.titulaire.last_name,
        phone: body.titulaire.phone,
        status: 'ACTIVE',
        accepted_terms_at: new Date(),
      },
    });

    await prisma.authToken.update({
      where: { id: record.id },
      data: { consumed_at: new Date() },
    });

    return this.issueTokens({
      sub: updatedUser.user_id,
      email: updatedUser.email,
      pharmacy_id: updatedUser.pharmacy_id,
      role: updatedUser.role as UserRole,
    });
  }

  /**
   * Finalise le compte d'un preparateur invite depuis l'onboarding web.
   * Le compte passe de PENDING a ACTIVE. Aucun mot de passe n'est defini :
   * le preparateur se connecte ensuite par code OTP a 6 chiffres.
   */
  async acceptPreparateur(
    rawToken: string,
    body: {
      accepted_terms: unknown;
      first_name?: string;
      last_name?: string;
      phone?: string;
    }
  ) {
    if (body.accepted_terms !== true) {
      throw new BadRequestException(
        'Vous devez accepter les CGU pour finaliser votre compte'
      );
    }

    const record = await this.findValid(rawToken);
    const user = record.user;

    if (user.role !== UserRole.PREPARATEUR) {
      throw new BadRequestException(
        'Cette invitation ne concerne pas un compte preparateur'
      );
    }

    const updatedUser = await prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        first_name: body.first_name ?? user.first_name,
        last_name: body.last_name ?? user.last_name,
        phone: body.phone ?? user.phone,
        status: 'ACTIVE',
        accepted_terms_at: new Date(),
      },
    });

    await prisma.authToken.update({
      where: { id: record.id },
      data: { consumed_at: new Date() },
    });

    return this.issueTokens({
      sub: updatedUser.user_id,
      email: updatedUser.email,
      pharmacy_id: updatedUser.pharmacy_id,
      role: updatedUser.role as UserRole,
    });
  }

  /**
   * Finalise le compte d'un admin Savely invite : il choisit son mot de passe.
   * Pas de mise a jour d'officine (pharmacy_id = null pour ADMIN_SAVELY).
   */
  async acceptAdmin(
    rawToken: string,
    body: { password: string; first_name?: string; last_name?: string }
  ) {
    const record = await this.findValid(rawToken);
    const user = record.user;

    if (user.role !== UserRole.ADMIN_SAVELY) {
      throw new BadRequestException(
        'Cette invitation ne concerne pas un compte administrateur'
      );
    }

    const passwordHash = await bcrypt.hash(
      body.password,
      config.auth.bcryptRounds
    );

    const updatedUser = await prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        password: passwordHash,
        first_name: body.first_name ?? user.first_name,
        last_name: body.last_name ?? user.last_name,
        status: 'ACTIVE',
        accepted_terms_at: new Date(),
      },
    });

    await prisma.authToken.update({
      where: { id: record.id },
      data: { consumed_at: new Date() },
    });

    return this.issueTokens({
      sub: updatedUser.user_id,
      email: updatedUser.email,
      pharmacy_id: updatedUser.pharmacy_id,
      role: updatedUser.role as UserRole,
    });
  }

  private async findValid(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const record = await prisma.authToken.findFirst({
      where: { token_hash: tokenHash, type: 'INVITATION' },
      include: {
        user: {
          include: { pharmacy: true },
        },
      },
    });

    if (!record || record.consumed_at || record.expires_at < new Date()) {
      throw new GoneException('Ce lien est expire ou deja utilise');
    }

    return record;
  }

  private async issueTokens(payload: JwtPayload) {
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
