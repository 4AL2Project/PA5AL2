// Cahier de tests : auto-inscription des associations (landing publique)
// Couvre : honeypot, géocodage échoué, doublon email, vérification email 48h.

import { BadRequestException, GoneException } from '@nestjs/common';

import { hashToken } from '../auth/token.util';
import { createFakeDb, FakeDb } from '../donations/testing/fake-db';
import { AssociationRegistrationService } from './association-registration.service';

jest.mock('../../database/client', () => ({ prisma: {} }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const clientModule = require('../../database/client') as { prisma: FakeDb };

const DTO = {
  name: 'Solidarité Test',
  rna_or_siren: 'W123456789',
  contact_email: 'contact@solidarite.org',
  contact_phone: '0612345678',
  address: '5 rue du Partage',
  postal_code: '75011',
  city: 'Paris',
  action_radius_km: 25,
  categories: ['Cosmétique'],
};

let db: FakeDb;
let service: AssociationRegistrationService;
let geocoding: { geocode: jest.Mock };
let email: {
  sendAssociationVerificationEmail: jest.Mock;
  sendAssociationUnderReviewEmail: jest.Mock;
};

beforeEach(() => {
  db = createFakeDb();
  Object.assign(clientModule.prisma, db);
  geocoding = {
    geocode: jest.fn().mockResolvedValue({ lat: 48.86, lng: 2.37 }),
  };
  email = {
    sendAssociationVerificationEmail: jest.fn(),
    sendAssociationUnderReviewEmail: jest.fn(),
  };
  service = new AssociationRegistrationService(
    geocoding as never,
    email as never
  );
});

describe('AssociationRegistrationService — inscription', () => {
  it('crée l’asso EN_ATTENTE_VALIDATION et envoie l’email de vérification', async () => {
    const result = await service.register(DTO);

    expect(result.status).toBe('EN_ATTENTE_VALIDATION');
    const stored = db.tables.association[0];
    expect(stored.lat).toBe(48.86);
    expect(stored.email_verified_at ?? null).toBeNull();
    expect(stored.verify_token_hash).toBeTruthy();
    expect(email.sendAssociationVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it('honeypot rempli : répond comme un succès mais ne crée RIEN', async () => {
    const result = await service.register({ ...DTO, website: 'spam.biz' });

    expect(result.status).toBe('EN_ATTENTE_VALIDATION');
    expect(db.tables.association).toHaveLength(0);
    expect(email.sendAssociationVerificationEmail).not.toHaveBeenCalled();
  });

  it('géocodage échoué → erreur propre demandant de préciser l’adresse', async () => {
    geocoding.geocode.mockResolvedValue(null);
    await expect(service.register(DTO)).rejects.toThrow(/Adresse introuvable/);
    expect(db.tables.association).toHaveLength(0);
  });

  it('refuse un email déjà inscrit', async () => {
    await service.register(DTO);
    await expect(service.register(DTO)).rejects.toBeInstanceOf(
      BadRequestException
    );
  });
});

describe('AssociationRegistrationService — vérification email', () => {
  it('valide l’email, consomme le token et notifie l’examen en cours', async () => {
    db.seed('association', {
      name: 'Solidarité Test',
      contact_email: DTO.contact_email,
      status: 'EN_ATTENTE_VALIDATION',
      verify_token_hash: hashToken('raw-token'),
      verify_token_expires_at: new Date(Date.now() + 3600 * 1000),
    });

    await service.verifyEmail('raw-token');

    const stored = db.tables.association[0];
    expect(stored.email_verified_at).toBeInstanceOf(Date);
    expect(stored.verify_token_hash).toBeNull();
    expect(email.sendAssociationUnderReviewEmail).toHaveBeenCalledTimes(1);
  });

  it('lien expiré (48 h dépassées) → 410', async () => {
    db.seed('association', {
      name: 'Retardataire',
      contact_email: 'x@y.org',
      status: 'EN_ATTENTE_VALIDATION',
      verify_token_hash: hashToken('old-token'),
      verify_token_expires_at: new Date(Date.now() - 1000),
    });

    await expect(service.verifyEmail('old-token')).rejects.toBeInstanceOf(
      GoneException
    );
  });

  it('token inconnu → 404', async () => {
    await expect(service.verifyEmail('inconnu')).rejects.toThrow(
      /Lien invalide/
    );
  });
});
