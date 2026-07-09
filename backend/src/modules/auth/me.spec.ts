/**
 * GET /api/auth/me -- profil centralisé adapté au rôle
 */
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from './auth.service';

jest.mock('../../database/client', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    pharmacy: { findUnique: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: { user: { findUnique: jest.Mock } };
};

const pharmacy = {
  pharmacy_id: 'ph-1',
  name: 'Officine A',
  email: 'contact@officine-a.fr',
  address: '1 rue de la Paix',
  siret: '12345678900011',
  status: 'ACTIVE',
  subscription_tier: 'premium',
  last_upload_at: new Date('2026-01-01T00:00:00Z'),
};

const baseUser = {
  user_id: 'u-1',
  email: 'user@officine-a.fr',
  first_name: 'Jean',
  last_name: 'Valjean',
  phone: null,
  status: 'ACTIVE',
  accepted_terms_at: null,
  created_at: new Date('2026-01-01T00:00:00Z'),
};

function makeService(): AuthService {
  return new AuthService(new JwtService({}));
}

describe('AuthService.me', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws when the user no longer exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(makeService().me('missing')).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it('TITULAIRE sees full pharmacy including subscription_tier', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      pharmacy_id: 'ph-1',
      role: 'TITULAIRE',
      pharmacy,
    });

    const result = await makeService().me('u-1');

    expect(result.pharmacy?.subscription_tier).toBe('premium');
  });

  it('PREPARATEUR sees pharmacy but not the subscription_tier', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      pharmacy_id: 'ph-1',
      role: 'PREPARATEUR',
      pharmacy,
    });

    const result = await makeService().me('u-1');

    expect(result.pharmacy).not.toBeNull();
    expect(result.pharmacy).not.toHaveProperty('subscription_tier');
  });

  it('ADMIN_SAVELY is a platform account with no pharmacy attached', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      pharmacy_id: null,
      role: 'ADMIN_SAVELY',
      pharmacy: null,
    });

    const result = await makeService().me('u-1');

    expect(result.pharmacy).toBeNull();
  });
});
