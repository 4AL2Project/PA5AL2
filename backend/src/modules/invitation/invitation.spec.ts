/**
 * US-64-Auth -- Invitation flow
 * GET  /api/auth/invitations/:token
 * POST /api/auth/invitations/:token/accept
 */
import { BadRequestException, GoneException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { InvitationService } from './invitation.service';

// --- Mocks -------------------------------------------------------------------
jest.mock('../../database/client', () => ({
  prisma: {
    authToken: { findFirst: jest.fn(), update: jest.fn() },
    user: { update: jest.fn() },
    pharmacy: { update: jest.fn() },
  },
}));
jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    signAsync: jest.fn().mockResolvedValue('signed-token'),
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../../database/client') as {
  prisma: {
    authToken: { findFirst: jest.Mock; update: jest.Mock };
    user: { update: jest.Mock };
    pharmacy: { update: jest.Mock };
  };
};

// --- Helpers -----------------------------------------------------------------
function makeValidToken(
  overrides: Partial<{ consumed_at: Date | null; expires_at: Date }> = {}
) {
  return {
    id: 'token-uuid',
    token_hash: 'hash',
    type: 'INVITATION',
    consumed_at: null,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    user: {
      user_id: 'user-uuid',
      email: 'marie@pharma.fr',
      pharmacy_id: 'pharma-uuid',
      first_name: 'Marie',
      last_name: 'Dupont',
      phone: '0612345678',
      role: 'TITULAIRE',
      status: 'PENDING',
      pharmacy: {
        pharmacy_id: 'pharma-uuid',
        name: 'Pharmacie du Centre',
        address: '12 rue de la Paix',
        siret: '12345678901234',
      },
    },
    ...overrides,
  };
}

// --- GET /api/auth/invitations/:token ----------------------------------------
describe('InvitationService.getByToken', () => {
  let service: InvitationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InvitationService(new JwtService());
  });

  it('retourne pharmacy + titulaire + expires_at pour un token valide', async () => {
    prisma.authToken.findFirst.mockResolvedValue(makeValidToken());
    const result = (await service.getByToken('raw-valid-token')) as Record<
      string,
      unknown
    >;
    expect(result).toHaveProperty('pharmacy');
    expect(result).toHaveProperty('titulaire');
    expect(result).toHaveProperty('expires_at');
  });

  it('leve 410 Gone si le token est expire', async () => {
    prisma.authToken.findFirst.mockResolvedValue(
      makeValidToken({ expires_at: new Date(Date.now() - 1000) })
    );
    await expect(service.getByToken('expired-token')).rejects.toThrow(
      GoneException
    );
  });

  it('leve 410 Gone si le token est deja consomme', async () => {
    prisma.authToken.findFirst.mockResolvedValue(
      makeValidToken({ consumed_at: new Date() })
    );
    await expect(service.getByToken('used-token')).rejects.toThrow(
      GoneException
    );
  });

  it('leve 410 Gone si le token est introuvable', async () => {
    prisma.authToken.findFirst.mockResolvedValue(null);
    await expect(service.getByToken('unknown-token')).rejects.toThrow(
      GoneException
    );
  });

  it('recherche par hash SHA-256, jamais le token en clair', async () => {
    prisma.authToken.findFirst.mockResolvedValue(makeValidToken());
    await service.getByToken('my-raw-token');
    const query = prisma.authToken.findFirst.mock.calls[0][0];
    expect(JSON.stringify(query)).not.toContain('my-raw-token');
    expect(query.where.token_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// --- POST /api/auth/invitations/:token/accept --------------------------------
describe('InvitationService.accept', () => {
  let service: InvitationService;

  const validBody = {
    pharmacy: {
      name: 'Pharmacie du Centre',
      address: '12 rue de la Paix, 75001 Paris',
      siret: '12345678901234',
    },
    titulaire: {
      first_name: 'Marie',
      last_name: 'Dupont',
      phone: '0612345678',
    },
    accepted_terms: true as unknown,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InvitationService(new JwtService());
    prisma.authToken.findFirst.mockResolvedValue(makeValidToken());
    prisma.user.update.mockResolvedValue({
      user_id: 'user-uuid',
      email: 'marie@pharma.fr',
      pharmacy_id: 'pharma-uuid',
      role: 'TITULAIRE',
    });
    prisma.pharmacy.update.mockResolvedValue({});
    prisma.authToken.update.mockResolvedValue({});
  });

  it('retourne access_token + refresh_token apres acceptation valide', async () => {
    const result = (await service.accept('valid-token', validBody)) as Record<
      string,
      unknown
    >;
    expect(result).toHaveProperty('access_token');
    expect(result).toHaveProperty('refresh_token');
  });

  it('passe le user en status ACTIVE', async () => {
    await service.accept('valid-token', validBody);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACTIVE' }),
      })
    );
  });

  it('enregistre accepted_terms_at avec la date courante', async () => {
    const before = new Date();
    await service.accept('valid-token', validBody);
    const updateCall = prisma.user.update.mock.calls[0][0];
    const acceptedAt: Date = updateCall.data.accepted_terms_at;
    expect(acceptedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it('invalide le token en remplissant consumed_at', async () => {
    await service.accept('valid-token', validBody);
    expect(prisma.authToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ consumed_at: expect.any(Date) }),
      })
    );
  });

  it('leve 400 si accepted_terms est false', async () => {
    await expect(
      service.accept('valid-token', { ...validBody, accepted_terms: false })
    ).rejects.toThrow(BadRequestException);
  });

  it('leve 400 si accepted_terms est absent', async () => {
    await expect(
      service.accept('valid-token', { ...validBody, accepted_terms: undefined })
    ).rejects.toThrow(BadRequestException);
  });

  it('leve 410 Gone si le token est expire', async () => {
    prisma.authToken.findFirst.mockResolvedValue(
      makeValidToken({ expires_at: new Date(Date.now() - 1000) })
    );
    await expect(service.accept('expired-token', validBody)).rejects.toThrow(
      GoneException
    );
  });

  it('leve 410 Gone si le token est deja consomme (double soumission)', async () => {
    prisma.authToken.findFirst.mockResolvedValue(
      makeValidToken({ consumed_at: new Date() })
    );
    await expect(service.accept('used-token', validBody)).rejects.toThrow(
      GoneException
    );
  });

  it('met a jour les infos pharmacie avec les donnees corrigees', async () => {
    const correctedPharmacy = {
      name: 'Pharmacie Centre Corrige',
      address: '15 avenue de la Republique',
      siret: '12345678901234',
    };
    await service.accept('valid-token', {
      ...validBody,
      pharmacy: correctedPharmacy,
    });
    expect(prisma.pharmacy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: correctedPharmacy.name }),
      })
    );
  });
});
