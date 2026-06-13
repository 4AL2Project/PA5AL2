/**
 * Détection du Logiciel de Gestion d'Officine (LGO) à partir des en-têtes de fichier.
 * Mappe les colonnes propriétaires vers le schéma standard Savely.
 */

export type FileType = 'products' | 'sales';

export interface LgoProfile {
  name: string;
  /** Colonnes attendues pour identifier ce LGO (au moins 2 must match) */
  signatures: string[];
  /** Mapping colonne LGO → colonne Savely */
  columnMap: Record<string, string>;
}

export interface DetectionResult {
  lgo: LgoProfile | null;
  /** Colonnes du fichier mappées vers le schéma Savely */
  mappedHeaders: Record<string, string>;
  /** Colonnes non reconnues */
  unknownHeaders: string[];
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

// ─── Profils LGO connus ────────────────────────────────────────────────────────

const LGO_PROFILES: LgoProfile[] = [
  {
    name: 'Pharmagest',
    signatures: ['code cip', 'designation', 'qte stock', 'prix ttc'],
    columnMap: {
      'code cip': 'external_sku',
      cip13: 'external_sku',
      'code article': 'external_sku',
      designation: 'name',
      libelle: 'name',
      'qte stock': 'stock_quantity',
      stock: 'stock_quantity',
      'prix ttc': 'unit_price',
      'prix vente ttc': 'unit_price',
      'pv ttc': 'unit_price',
      'prix achat': 'cost_price',
      'pa ttc': 'cost_price',
      'date peremption': 'expiry_date',
      peremption: 'expiry_date',
      dlu: 'expiry_date',
      famille: 'category',
      gamme: 'category',
      marque: 'brand',
      laboratoire: 'brand',
      lot: 'lot_number',
      'num lot': 'lot_number',
    },
  },
  {
    name: 'LGPI / Alliadis',
    signatures: ['code produit', 'libelle article', 'quantite stock'],
    columnMap: {
      'code produit': 'external_sku',
      reference: 'external_sku',
      'code article': 'external_sku',
      'libelle article': 'name',
      libelle: 'name',
      denomination: 'name',
      'quantite stock': 'stock_quantity',
      'qte en stock': 'stock_quantity',
      'prix de vente': 'unit_price',
      'prix vente': 'unit_price',
      'prix revient': 'cost_price',
      'date limite utilisation': 'expiry_date',
      'date expiration': 'expiry_date',
      sous_famille: 'category',
      categorie: 'category',
      fournisseur: 'brand',
      'numero lot': 'lot_number',
    },
  },
  {
    name: 'Smart Rx',
    signatures: ['cip', 'nom produit', 'stock disponible'],
    columnMap: {
      cip: 'external_sku',
      'code cip': 'external_sku',
      'nom produit': 'name',
      produit: 'name',
      'stock disponible': 'stock_quantity',
      'stock reel': 'stock_quantity',
      'prix unitaire': 'unit_price',
      'prix de vente ht': 'unit_price',
      'cout unitaire': 'cost_price',
      dlp: 'expiry_date',
      'date limite peremption': 'expiry_date',
      rayon: 'category',
      labo: 'brand',
    },
  },
];

/** Colonnes standard Savely (format générique) */
const SAVELY_COLUMNS: Record<string, string> = {
  external_sku: 'external_sku',
  name: 'name',
  category: 'category',
  brand: 'brand',
  expiry_date: 'expiry_date',
  stock_quantity: 'stock_quantity',
  unit_price: 'unit_price',
  cost_price: 'cost_price',
  lot_number: 'lot_number',
  sale_date: 'sale_date',
  quantity_sold: 'quantity_sold',
  unit_price_sold: 'unit_price_sold',
};

// ─── Détection ────────────────────────────────────────────────────────────────

export function detectLgo(headers: string[]): DetectionResult {
  const normalizedHeaders = headers.map(normalize);

  // Cherche le LGO dont le plus de signatures correspondent
  let bestMatch: LgoProfile | null = null;
  let bestScore = 0;

  for (const profile of LGO_PROFILES) {
    const score = profile.signatures.filter((sig) =>
      normalizedHeaders.includes(normalize(sig))
    ).length;

    const threshold = Math.ceil(profile.signatures.length * 0.5);
    if (score >= threshold && score > bestScore) {
      bestScore = score;
      bestMatch = profile;
    }
  }

  const columnMap = bestMatch?.columnMap ?? {};
  const mappedHeaders: Record<string, string> = {};
  const unknownHeaders: string[] = [];

  for (const header of headers) {
    const key = normalize(header);
    const mapped = columnMap[key] ?? SAVELY_COLUMNS[key];
    if (mapped) {
      mappedHeaders[header] = mapped;
    } else {
      unknownHeaders.push(header);
    }
  }

  return { lgo: bestMatch, mappedHeaders, unknownHeaders };
}
