// Cahier de tests US-63 : Service de géocodage (adresse → coordonnées GPS)
// Utilise l'API adresse.data.gouv.fr (BAN)

import { GeocodingService } from './geocoding.service';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function banResponse(lat: number, lng: number) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        features: [
          {
            geometry: { coordinates: [lng, lat] },
            properties: { score: 0.9, label: '1 rue de la Paix 75001 Paris' },
          },
        ],
      }),
  };
}

describe('GeocodingService — geocode (US-63)', () => {
  let service: GeocodingService;

  beforeEach(() => {
    mockFetch.mockReset();
    service = new GeocodingService();
  });

  it('retourne lat/lng pour une adresse valide (Paris)', async () => {
    mockFetch.mockResolvedValue(banResponse(48.8566, 2.3522));

    const result = await service.geocode('1 rue de la Paix', '75001', 'Paris');

    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(48.8566, 3);
    expect(result!.lng).toBeCloseTo(2.3522, 3);
  });

  it("appelle l'API BAN avec l'adresse correctement encodée", async () => {
    mockFetch.mockResolvedValue(banResponse(48.8566, 2.3522));

    await service.geocode('10 avenue des Champs-Élysées', '75008', 'Paris');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('api-adresse.data.gouv.fr');
    expect(calledUrl).toContain('Champs');
  });

  it("retourne null si l'API BAN ne trouve aucun résultat", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ features: [] }),
    });

    const result = await service.geocode(
      'adresse inconnue',
      '00000',
      'Nowhere'
    );

    expect(result).toBeNull();
  });

  it("retourne null si l'API BAN est indisponible (erreur réseau)", async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await service.geocode('1 rue de la Paix', '75001', 'Paris');

    expect(result).toBeNull();
  });

  it("retourne null si la réponse HTTP n'est pas ok (statut 500)", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    const result = await service.geocode('1 rue de la Paix', '75001', 'Paris');

    expect(result).toBeNull();
  });
});
