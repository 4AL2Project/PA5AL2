import { Injectable } from '@nestjs/common';

import { CompanySuggestionDto } from './dto/company.dto';

// NAF 47.73Z = "Commerce de détail de produits pharmaceutiques en magasin spécialisé"
const PHARMACY_NAF = '47.73Z';
const API_BASE = 'https://recherche-entreprises.api.gouv.fr/search';

/** Forme (partielle) d'un résultat renvoyé par recherche-entreprises.api.gouv.fr */
export interface GouvCompanyResult {
  nom_complet?: string;
  nom_raison_sociale?: string;
  siren?: string;
  etat_administratif?: string; // 'A' = actif
  siege?: {
    siret?: string;
    adresse?: string;
    code_postal?: string;
    libelle_commune?: string;
    latitude?: string | null;
    longitude?: string | null;
  };
  dirigeants?: Array<{
    nom?: string;
    prenoms?: string;
    qualite?: string;
    type_dirigeant?: string; // 'personne physique' | 'personne morale'
  }>;
}

@Injectable()
export class CompanySearchService {
  /**
   * Cherche des officines (pharmacies, NAF 47.73Z) via l'API publique
   * recherche-entreprises.api.gouv.fr et renvoie des suggestions normalisées
   * prêtes à pré-remplir le formulaire de création d'officine.
   */
  async search(query: string): Promise<CompanySuggestionDto[]> {
    const q = query.trim();
    if (q.length < 3) return [];

    const url =
      `${API_BASE}?q=${encodeURIComponent(q)}` +
      `&activite_principale=${PHARMACY_NAF}&per_page=10&page=1`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = (await res.json()) as { results?: GouvCompanyResult[] };
    const results = data.results ?? [];

    return results
      .filter((r) => r.siege?.siret) // on a besoin d'un SIRET d'établissement
      .map((r) => this.normalize(r));
  }

  /**
   * Mappe un résultat brut de l'API gouv vers notre suggestion d'officine.
   * L'API renvoie latitude/longitude en chaînes → conversion en number (ou null).
   */
  private normalize(r: GouvCompanyResult): CompanySuggestionDto {
    const siege = r.siege ?? {};
    const toNum = (v?: string | null): number | null =>
      v != null && v !== '' ? Number(v) : null;

    // Seul un dirigeant "personne physique" peut pré-remplir le titulaire.
    const director = (r.dirigeants ?? []).find(
      (d) => d.type_dirigeant === 'personne physique'
    );

    return {
      siret: siege.siret ?? '',
      name: r.nom_complet ?? r.nom_raison_sociale ?? '',
      address: siege.adresse ?? '',
      postal_code: siege.code_postal ?? '',
      city: siege.libelle_commune ?? '',
      latitude: toNum(siege.latitude),
      longitude: toNum(siege.longitude),
      // prenoms = "MARYAM ANNE" → 1er prénom ; nom = "PROVOST (MIRAFZAL)" → "PROVOST"
      director_first_name: director?.prenoms
        ? director.prenoms.trim().split(/\s+/)[0]
        : null,
      director_last_name: director?.nom
        ? director.nom.split('(')[0].trim()
        : null,
    };
  }
}
