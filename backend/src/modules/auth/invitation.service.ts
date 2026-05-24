import {
  BadRequestException,
  GoneException,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { config } from '../../core/config';
import { prisma } from '../../database/client';
import { JwtPayload } from './auth.service';
import { UserRole } from './roles.enum';
import { hashToken } from './token.util';

@Injectable()
export class InvitationService {
  constructor(private readonly jwtService: JwtService) {}

  async getByToken(rawToken: string) {
    const record = await this.findValid(rawToken);
    return {
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

    await prisma.pharmacy.update({
      where: { pharmacy_id: user.pharmacy_id },
      data: {
        name: body.pharmacy.name,
        address: body.pharmacy.address,
        siret: body.pharmacy.siret,
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
