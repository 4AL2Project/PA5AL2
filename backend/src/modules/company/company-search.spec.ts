import { CompanySearchService } from './company-search.service';

describe('CompanySearchService — recherche-entreprises.api.gouv.fr', () => {
  let service: CompanySearchService;
  const originalFetch = global.fetch;

  const gouvResponse = {
    results: [
      {
        nom_complet: 'PHARMACIE DU CENTRE',
        nom_raison_sociale: 'PHARMACIE DU CENTRE SARL',
        siren: '123456789',
        etat_administratif: 'A',
        siege: {
          siret: '12345678901234',
          adresse: '12 AVENUE DE LA LIBERATION 76100 ROUEN',
          code_postal: '76100',
          libelle_commune: 'ROUEN',
          latitude: '49.4431',
          longitude: '1.0993',
        },
        dirigeants: [
          {
            nom: 'PROVOST (MIRAFZAL)',
            prenoms: 'MARYAM ANNE',
            qualite: 'Gérant',
            type_dirigeant: 'personne physique',
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    service = new CompanySearchService();
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, json: async () => gouvResponse });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('ne lance aucune requête pour une recherche de moins de 3 caractères', async () => {
    const res = await service.search('ph');
    expect(res).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('filtre sur les pharmacies (NAF 47.73Z)', async () => {
    await service.search('pharmacie du centre');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain('activite_principale=47.73Z');
  });

  it("normalise un résultat gouv en suggestion d'officine", async () => {
    const res = await service.search('pharmacie du centre');
    expect(res).toHaveLength(1);
    expect(res[0]).toEqual({
      siret: '12345678901234',
      name: 'PHARMACIE DU CENTRE',
      address: '12 AVENUE DE LA LIBERATION 76100 ROUEN',
      postal_code: '76100',
      city: 'ROUEN',
      latitude: 49.4431,
      longitude: 1.0993,
      director_first_name: 'MARYAM',
      director_last_name: 'PROVOST',
    });
  });

  it("retourne [] si l'API répond en erreur", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    const res = await service.search('pharmacie');
    expect(res).toEqual([]);
  });

  it("ignore les résultats sans SIRET d'établissement", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ nom_complet: 'X', siege: {} }] }),
    });
    const res = await service.search('pharmacie');
    expect(res).toEqual([]);
  });

  it('ne pré-remplit pas le titulaire pour un dirigeant personne morale', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            nom_complet: 'PHARMA HOLDING',
            siege: { siret: '99999999999999' },
            dirigeants: [
              { sigle: 'HOLDING X', type_dirigeant: 'personne morale' },
            ],
          },
        ],
      }),
    });
    const res = await service.search('pharma holding');
    expect(res[0].director_first_name).toBeNull();
    expect(res[0].director_last_name).toBeNull();
  });
});
