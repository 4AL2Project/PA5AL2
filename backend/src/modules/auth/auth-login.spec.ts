/**
 * POST /api/auth/login -- le mot de passe reste valable pour TITULAIRE et
 * ADMIN_SAVELY, mais plus pour PREPARATEUR (connexion par code OTP).
 */
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';

jest.mock('../../database/client', () => ({
  prisma: { user: { findUnique: jest.fn() } },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: { user: { findUnique: jest.Mock } };
};

describe('AuthService.login', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    const jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    } as unknown as JwtService;
    service = new AuthService(jwt);
  });

  it('accepte un titulaire avec le bon mot de passe', async () => {
    prisma.user.findUnique.mockResolvedValue({
      user_id: 'u-1',
      email: 'titulaire@pharma.fr',
      password: await bcrypt.hash('bonMotDePasse', 4),
      pharmacy_id: 'ph-1',
      role: 'TITULAIRE',
      status: 'ACTIVE',
    });

    const res = await service.login('titulaire@pharma.fr', 'bonMotDePasse');

    expect(res.access_token).toBe('signed-token');
  });

  it("refuse un preparateur et l'oriente vers le code a 6 chiffres", async () => {
    // password NULL en base depuis la migration add_preparateur_otp
    prisma.user.findUnique.mockResolvedValue({
      user_id: 'u-2',
      email: 'prep@pharma.fr',
      password: null,
      pharmacy_id: 'ph-1',
      role: 'PREPARATEUR',
      status: 'ACTIVE',
    });

    await expect(
      service.login('prep@pharma.fr', 'peu importe')
    ).rejects.toThrow(/code à 6 chiffres/);
  });

  it("refuse un preparateur meme s'il lui reste un hash de mot de passe", async () => {
    prisma.user.findUnique.mockResolvedValue({
      user_id: 'u-3',
      email: 'prep-legacy@pharma.fr',
      password: await bcrypt.hash('ancienMotDePasse', 4),
      pharmacy_id: 'ph-1',
      role: 'PREPARATEUR',
      status: 'ACTIVE',
    });

    await expect(
      service.login('prep-legacy@pharma.fr', 'ancienMotDePasse')
    ).rejects.toThrow(UnauthorizedException);
  });

  it('refuse un email inconnu sans reveler quoi que ce soit', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.login('inconnu@pharma.fr', 'x')).rejects.toThrow(
      'Invalid credentials'
    );
  });
});
