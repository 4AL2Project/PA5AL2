/**
 * US-64-Auth -- Magic Link flow
 * POST /api/auth/magic-link
 * POST /api/auth/magic-link/verify
 */
import { GoneException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { EmailService } from './email.service';
import { MagicLinkService } from './magic-link.service';

// --- Mocks -------------------------------------------------------------------
jest.mock('../../database/client', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    authToken: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
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
    user: { findUnique: jest.Mock };
    authToken: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };
};

const emailMock = { sendMagicLinkEmail: jest.fn() };

// --- POST /api/auth/magic-link -----------------------------------------------
describe('MagicLinkService.send', () => {
  let service: MagicLinkService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MagicLinkService(
      new JwtService(),
      emailMock as unknown as EmailService
    );
    prisma.authToken.count.mockResolvedValue(0);
    prisma.authToken.create.mockResolvedValue({ id: 'token-uuid' });
    emailMock.sendMagicLinkEmail.mockResolvedValue(undefined);
  });

  it('repond sans erreur (200 silencieux) quand email connu et ACTIVE', async () => {
    prisma.user.findUnique.mockResolvedValue({
      user_id: 'user-uuid',
      email: 'marie@pharma.fr',
      status: 'ACTIVE',
    });
    await expect(service.send('marie@pharma.fr')).resolves.toBeUndefined();
    expect(emailMock.sendMagicLinkEmail).toHaveBeenCalled();
  });

  it('repond sans erreur (200 silencieux) quand email inconnu -- ne leak pas le compte', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.send('inconnu@example.com')).resolves.toBeUndefined();
    expect(emailMock.sendMagicLinkEmail).not.toHaveBeenCalled();
  });

  it('repond sans erreur (200 silencieux) quand utilisateur PENDING', async () => {
    prisma.user.findUnique.mockResolvedValue({
      user_id: 'user-uuid',
      email: 'pending@pharma.fr',
      status: 'PENDING',
    });
    await expect(service.send('pending@pharma.fr')).resolves.toBeUndefined();
    expect(emailMock.sendMagicLinkEmail).not.toHaveBeenCalled();
  });

  it('stocke le token avec une TTL de 15 minutes', async () => {
    prisma.user.findUnique.mockResolvedValue({
      user_id: 'user-uuid',
      email: 'marie@pharma.fr',
      status: 'ACTIVE',
    });
    const before = Date.now();
    await service.send('marie@pharma.fr');
    const createCall = prisma.authToken.create.mock.calls[0][0];
    const expiresAt: Date = createCall.data.expires_at;
    const diffMinutes = (expiresAt.getTime() - before) / (1000 * 60);
    expect(diffMinutes).toBeGreaterThanOrEqual(14.9);
    expect(diffMinutes).toBeLessThanOrEqual(15.1);
  });

  it('stocke le token hache SHA-256, jamais en clair', async () => {
    prisma.user.findUnique.mockResolvedValue({
      user_id: 'user-uuid',
      email: 'marie@pharma.fr',
      status: 'ACTIVE',
    });
    await service.send('marie@pharma.fr');
    const createCall = prisma.authToken.create.mock.calls[0][0];
    expect(createCall.data.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(createCall.data).not.toHaveProperty('token');
  });

  it('envoie un lien contenant /auth/verify?token=', async () => {
    prisma.user.findUnique.mockResolvedValue({
      user_id: 'user-uuid',
      email: 'marie@pharma.fr',
      status: 'ACTIVE',
    });
    await service.send('marie@pharma.fr');
    const [, link] = emailMock.sendMagicLinkEmail.mock.calls[0];
    expect(link).toContain('/auth/verify?token=');
  });

  it('rate-limit : ne pas envoyer apres 3 demandes dans la fenetre de 15 min', async () => {
    prisma.user.findUnique.mockResolvedValue({
      user_id: 'user-uuid',
      email: 'marie@pharma.fr',
      status: 'ACTIVE',
    });
    prisma.authToken.count.mockResolvedValue(3);
    await service.send('marie@pharma.fr');
    expect(emailMock.sendMagicLinkEmail).not.toHaveBeenCalled();
  });

  it('le type du token cree est MAGIC_LINK', async () => {
    prisma.user.findUnique.mockResolvedValue({
      user_id: 'user-uuid',
      email: 'marie@pharma.fr',
      status: 'ACTIVE',
    });
    await service.send('marie@pharma.fr');
    const createCall = prisma.authToken.create.mock.calls[0][0];
    expect(createCall.data.type).toBe('MAGIC_LINK');
  });
});

// --- POST /api/auth/magic-link/verify ----------------------------------------
describe('MagicLinkService.verify', () => {
  let service: MagicLinkService;

  function makeValidMagicToken() {
    return {
      id: 'token-uuid',
      token_hash: 'hash',
      type: 'MAGIC_LINK',
      consumed_at: null,
      expires_at: new Date(Date.now() + 10 * 60 * 1000),
      user: {
        user_id: 'user-uuid',
        email: 'marie@pharma.fr',
        pharmacy_id: 'pharma-uuid',
        role: 'TITULAIRE',
        status: 'ACTIVE',
      },
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MagicLinkService(
      new JwtService(),
      emailMock as unknown as EmailService
    );
    prisma.authToken.update.mockResolvedValue({});
  });

  it('retourne access_token + refresh_token pour un token valide', async () => {
    prisma.authToken.findFirst.mockResolvedValue(makeValidMagicToken());
    const result = (await service.verify('valid-raw-token')) as Record<
      string,
      unknown
    >;
    expect(result).toHaveProperty('access_token');
    expect(result).toHaveProperty('refresh_token');
  });

  it('invalide le token apres verification (consumed_at rempli)', async () => {
    prisma.authToken.findFirst.mockResolvedValue(makeValidMagicToken());
    await service.verify('valid-raw-token');
    expect(prisma.authToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ consumed_at: expect.any(Date) }),
      })
    );
  });

  it('leve 410 Gone si le token est expire (> 15 min)', async () => {
    prisma.authToken.findFirst.mockResolvedValue({
      ...makeValidMagicToken(),
      expires_at: new Date(Date.now() - 1000),
    });
    await expect(service.verify('expired-token')).rejects.toThrow(
      GoneException
    );
  });

  it('leve 410 Gone si le token est deja consomme', async () => {
    prisma.authToken.findFirst.mockResolvedValue({
      ...makeValidMagicToken(),
      consumed_at: new Date(),
    });
    await expect(service.verify('used-token')).rejects.toThrow(GoneException);
  });

  it('leve 410 Gone si le token est introuvable', async () => {
    prisma.authToken.findFirst.mockResolvedValue(null);
    await expect(service.verify('unknown-token')).rejects.toThrow(
      GoneException
    );
  });

  it('recherche par hash SHA-256, jamais le token en clair', async () => {
    prisma.authToken.findFirst.mockResolvedValue(makeValidMagicToken());
    await service.verify('my-raw-magic-token');
    const query = prisma.authToken.findFirst.mock.calls[0][0];
    expect(JSON.stringify(query)).not.toContain('my-raw-magic-token');
    expect(query.where.token_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
