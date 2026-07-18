import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers temporels ────────────────────────────────────────────────────────

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(23, 59, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 3600 * 1000);
}

// Génère un code de récupération SAV-XXXX compatible avec le champ recovery_code
// (alphabet sans ambiguïté visuelle, unique constraint en DB)
const RC_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeRecoveryCode(prefix: string): string {
  const rand = Array.from(
    { length: 6 },
    () => RC_ALPHABET[Math.floor(Math.random() * RC_ALPHABET.length)]
  ).join('');
  return `SAV-${prefix}-${rand}`;
}

// ─── UUIDs fixes ──────────────────────────────────────────────────────────────

// Aligné sur NEXT_PUBLIC_PHARMACY_ID du frontend
const PHARMACY_1_ID = '3c865b32-ba84-483d-8256-2b1d7d5e542e';
const PHARMACY_2_ID = '3c865b32-ba84-483d-8256-2b1d7d5e542f';
const PHARMACY_3_ID = '3c865b32-ba84-483d-8256-2b1d7d5e5430';
const ADMIN_PHARMACY_ID = '00000000-0000-0000-0000-000000000001';

const ADMIN_EMAIL = 'admin@savely.fr';
const ADMIN_PASSWORD = 'admin1234';

// ─── Catégories système ───────────────────────────────────────────────────────

const SYSTEM_CATEGORIES = [
  { name: 'Soins du corps', slug: 'soins-du-corps' },
  {
    name: 'Compléments alimentaires et nutrition',
    slug: 'complements-alimentaires-et-nutrition',
  },
  {
    name: 'Matériel médical et orthopédie',
    slug: 'materiel-medical-et-orthopedie',
  },
  { name: 'Hygiène et protection', slug: 'hygiene-et-protection' },
  { name: 'Bien être', slug: 'bien-etre' },
  { name: 'Autres', slug: 'autres' },
];

// ─── Pharmacies ───────────────────────────────────────────────────────────────

const PHARMACIES = [
  {
    pharmacy_id: PHARMACY_1_ID,
    name: 'Pharmacie Centrale République',
    email: 'demo@cosmorisk.fr',
    address: '12 Place de la République, 75011 Paris',
    siret: '12345678901234',
    lat: 48.8676,
    lng: 2.3631,
    donation_pickup_windows: [
      { day: 'TUE', start: '14:00', end: '17:00' },
      { day: 'THU', start: '09:00', end: '12:00' },
    ],
    subscription_tier: 'pro',
  },
  {
    pharmacy_id: PHARMACY_2_ID,
    name: 'Pharmacie du Marché des Enfants Rouges',
    email: 'marche@savely-demo.fr',
    address: '39 rue de Bretagne, 75003 Paris',
    siret: '23456789012345',
    lat: 48.8628,
    lng: 2.3607,
    donation_pickup_windows: [
      { day: 'MON', start: '09:00', end: '12:00' },
      { day: 'WED', start: '14:00', end: '17:00' },
      { day: 'FRI', start: '09:00', end: '12:00' },
    ],
    subscription_tier: 'pro',
  },
  {
    pharmacy_id: PHARMACY_3_ID,
    name: 'Pharmacie de la Butte Montmartre',
    email: 'butte@savely-demo.fr',
    address: '22 rue Lepic, 75018 Paris',
    siret: '34567890123456',
    lat: 48.8847,
    lng: 2.3386,
    donation_pickup_windows: [
      { day: 'TUE', start: '09:00', end: '12:00' },
      { day: 'SAT', start: '10:00', end: '13:00' },
    ],
    subscription_tier: 'starter',
  },
];

// ─── Utilisateurs ─────────────────────────────────────────────────────────────

const USERS = [
  // Titulaires (connexion mot de passe + magic link)
  {
    email: 'demo@cosmorisk.fr',
    password: 'demo1234',
    role: 'TITULAIRE',
    first_name: 'Sophie',
    last_name: 'Marchand',
    pharmacy_id: PHARMACY_1_ID,
  },
  {
    email: 'titulaire2@savely-demo.fr',
    password: 'demo1234',
    role: 'TITULAIRE',
    first_name: 'Pierre',
    last_name: 'Durand',
    pharmacy_id: PHARMACY_2_ID,
  },
  {
    email: 'titulaire3@savely-demo.fr',
    password: 'demo1234',
    role: 'TITULAIRE',
    first_name: 'Marie',
    last_name: 'Leblanc',
    pharmacy_id: PHARMACY_3_ID,
  },
  // Préparateurs (connexion OTP uniquement — password null)
  {
    email: 'prep1@savely-demo.fr',
    password: null,
    role: 'PREPARATEUR',
    first_name: 'Léa',
    last_name: 'Petit',
    pharmacy_id: PHARMACY_1_ID,
  },
  {
    email: 'prep2@savely-demo.fr',
    password: null,
    role: 'PREPARATEUR',
    first_name: 'Hugo',
    last_name: 'Martin',
    pharmacy_id: PHARMACY_2_ID,
  },
];

// ─── Associations ─────────────────────────────────────────────────────────────

const ASSOCIATIONS = [
  {
    name: 'Solidarité Quartier République',
    address: '8 rue du Faubourg du Temple',
    city: 'Paris',
    postal_code: '75011',
    lat: 48.868,
    lng: 2.366,
    action_radius_km: 5,
    categories: ['Cosmétique', 'Dermatologie', 'Capillaire'],
    pickup_sla_days: 5,
    response_sla_hours: 48,
    pickup_windows: [
      { day: 'MON', start: '09:00', end: '17:00' },
      { day: 'TUE', start: '09:00', end: '17:00' },
      { day: 'WED', start: '09:00', end: '17:00' },
      { day: 'THU', start: '09:00', end: '17:00' },
      { day: 'FRI', start: '09:00', end: '17:00' },
    ],
    contact_email: 'contact@solidarite-republique.org',
    contact_phone: '0140000001',
    rna_or_siren: 'W751000001',
    status: 'ACTIVE',
    fiscal_receipt_verified: true,
  },
  {
    name: 'Entraide Île-de-France',
    address: '3 avenue de la Résistance',
    city: 'Créteil',
    postal_code: '94000',
    lat: 48.7904,
    lng: 2.4556,
    action_radius_km: 60,
    categories: ['Cosmétique', 'Solaire', 'Pédiatrie', 'Compléments'],
    pickup_sla_days: 7,
    response_sla_hours: 72,
    pickup_windows: [
      { day: 'TUE', start: '10:00', end: '16:00' },
      { day: 'THU', start: '10:00', end: '16:00' },
    ],
    contact_email: 'dons@entraide-idf.org',
    contact_phone: '0140000002',
    rna_or_siren: 'W941000002',
    status: 'ACTIVE',
    fiscal_receipt_verified: true,
  },
  {
    // Association peu fiable : historique de retraits manqués
    name: 'Les Oubliés du Retrait',
    address: '21 boulevard Voltaire',
    city: 'Paris',
    postal_code: '75011',
    lat: 48.863,
    lng: 2.37,
    action_radius_km: 30,
    categories: ['Cosmétique', 'Maquillage', 'Parfumerie'],
    pickup_sla_days: 10,
    response_sla_hours: 72,
    contact_email: 'contact@oublies-retrait.org',
    contact_phone: '0140000003',
    rna_or_siren: 'W751000003',
    status: 'ACTIVE',
    fiscal_receipt_verified: false,
  },
  {
    name: 'Croix Verte Solidaire',
    address: '14 rue de la Paix',
    city: 'Vincennes',
    postal_code: '94300',
    lat: 48.8467,
    lng: 2.4387,
    action_radius_km: 40,
    categories: ['Cosmétique', 'Hygiène', 'Bébé', 'Soins corps'],
    pickup_sla_days: 5,
    response_sla_hours: 48,
    pickup_windows: [
      { day: 'MON', start: '10:00', end: '16:00' },
      { day: 'WED', start: '10:00', end: '16:00' },
      { day: 'FRI', start: '10:00', end: '16:00' },
    ],
    contact_email: 'contact@croix-verte-solidaire.org',
    contact_phone: '0140000004',
    rna_or_siren: 'W943000004',
    status: 'ACTIVE',
    fiscal_receipt_verified: true,
  },
  {
    // Association en attente de validation — illustre le parcours d'inscription
    name: 'Beauté Pour Tous',
    address: '5 passage du Marché',
    city: 'Montreuil',
    postal_code: '93100',
    lat: 48.8642,
    lng: 2.4423,
    action_radius_km: 20,
    categories: ['Cosmétique', 'Maquillage', 'Soins visage'],
    pickup_sla_days: 5,
    response_sla_hours: 48,
    contact_email: 'hello@beaute-pour-tous.fr',
    contact_phone: '0140000005',
    rna_or_siren: 'W931000005',
    status: 'EN_ATTENTE_VALIDATION',
    fiscal_receipt_verified: false,
  },
];

// ─── Produits cosmétiques — Pharmacie 1 ──────────────────────────────────────
// Distribution cible : ~8 critiques (don), ~13 élevés (B2C), ~11 sûrs
// Classification : days_of_cover = stock / velocity_30j
//   < 60  → safe   → aucune action
//   60–179 → high  → mise en vente B2C
//   ≥ 180  → critical → don associatif

type ProductRow = {
  sku: string;
  lot: string;
  name: string;
  category: string;
  brand: string;
  expiresIn: number;
  stock: number;
  price: number;
  cost: number;
};

const PRODUCTS_P1: ProductRow[] = [
  // ── Critiques (velocity très faible par rapport au stock)
  {
    sku: 'CRE-HYD-50',
    lot: 'LOT-2026-A001',
    name: 'Crème Hydratante Visage 50ml',
    category: 'Soins visage',
    brand: 'Vichy',
    expiresIn: 540,
    stock: 180,
    price: 12.9,
    cost: 8.5,
  },
  {
    sku: 'SER-VIT-C',
    lot: 'LOT-2026-A002',
    name: 'Sérum Éclat Vitamine C 30ml',
    category: 'Soins visage',
    brand: 'La Roche-Posay',
    expiresIn: 730,
    stock: 95,
    price: 24.9,
    cost: 16.0,
  },
  {
    sku: 'MIC-EAU-400',
    lot: 'LOT-2026-A003',
    name: 'Eau Micellaire Sensitive 400ml',
    category: 'Soins visage',
    brand: 'Bioderma',
    expiresIn: 540,
    stock: 200,
    price: 9.9,
    cost: 6.2,
  },
  {
    sku: 'BB-CREAM-30',
    lot: 'LOT-2026-A004',
    name: 'BB Cream SPF15 30ml',
    category: 'Maquillage',
    brand: 'Garnier',
    expiresIn: 540,
    stock: 130,
    price: 8.5,
    cost: 5.0,
  },
  {
    sku: 'FOND-TEINT-30',
    lot: 'LOT-2026-A005',
    name: 'Fond de Teint Fluide 30ml',
    category: 'Maquillage',
    brand: 'Maybelline',
    expiresIn: 540,
    stock: 160,
    price: 14.9,
    cost: 9.5,
  },
  {
    sku: 'CREME-MAIN-75',
    lot: 'LOT-2026-A006',
    name: 'Crème Mains Réparatrice 75ml',
    category: 'Soins corps',
    brand: 'Avène',
    expiresIn: 540,
    stock: 140,
    price: 6.9,
    cost: 4.2,
  },
  {
    sku: 'HUILE-ROSE-30',
    lot: 'LOT-2026-A007',
    name: 'Huile Rosier Sauvage 30ml',
    category: 'Soins visage',
    brand: 'Caudalie',
    expiresIn: 730,
    stock: 75,
    price: 32.9,
    cost: 21.0,
  },
  {
    sku: 'CONT-OCU-15',
    lot: 'LOT-2026-A008',
    name: 'Contour des Yeux Anti-Cernes 15ml',
    category: 'Soins visage',
    brand: 'Clarins',
    expiresIn: 730,
    stock: 60,
    price: 38.9,
    cost: 24.0,
  },
  // ── Élevés (days_of_cover 60–179 → B2C resale)
  {
    sku: 'CREME-CORP-200',
    lot: 'LOT-2026-B001',
    name: 'Crème Corps Nourrissante 200ml',
    category: 'Soins corps',
    brand: 'Nuxe',
    expiresIn: 730,
    stock: 110,
    price: 15.9,
    cost: 10.0,
  },
  {
    sku: 'MASQ-ARG-75',
    lot: 'LOT-2026-B002',
    name: 'Masque Purifiant Argile 75ml',
    category: 'Soins visage',
    brand: 'Caudalie',
    expiresIn: 730,
    stock: 75,
    price: 18.5,
    cost: 12.0,
  },
  {
    sku: 'GEL-DOUCHE-250',
    lot: 'LOT-2026-B003',
    name: 'Gel Douche Surgras 250ml',
    category: 'Soins corps',
    brand: 'Avène',
    expiresIn: 730,
    stock: 45,
    price: 7.9,
    cost: 4.8,
  },
  {
    sku: 'HUILE-SEC-100',
    lot: 'LOT-2026-B004',
    name: 'Huile Sèche Corps 100ml',
    category: 'Soins corps',
    brand: 'Nuxe',
    expiresIn: 730,
    stock: 55,
    price: 22.9,
    cost: 14.5,
  },
  {
    sku: 'DEMA-YEU-125',
    lot: 'LOT-2026-B005',
    name: 'Démaquillant Yeux Bi-Phase 125ml',
    category: 'Soins visage',
    brand: 'Garnier',
    expiresIn: 730,
    stock: 90,
    price: 5.9,
    cost: 3.5,
  },
  {
    sku: 'CREME-PIED-75',
    lot: 'LOT-2026-B006',
    name: 'Crème Pieds Réparatrice 75ml',
    category: 'Soins corps',
    brand: 'Avène',
    expiresIn: 730,
    stock: 65,
    price: 11.9,
    cost: 7.0,
  },
  {
    sku: 'SHA-REP-250',
    lot: 'LOT-2026-B007',
    name: 'Shampooing Réparateur 250ml',
    category: 'Cheveux',
    brand: 'Kérastase',
    expiresIn: 730,
    stock: 60,
    price: 28.9,
    cost: 18.0,
  },
  {
    sku: 'COND-LISS-200',
    lot: 'LOT-2026-B008',
    name: 'Après-Shampooing Lissant 200ml',
    category: 'Cheveux',
    brand: "L'Oréal",
    expiresIn: 730,
    stock: 85,
    price: 11.9,
    cost: 7.5,
  },
  {
    sku: 'ROUGE-LEV-3G',
    lot: 'LOT-2026-B009',
    name: 'Rouge à Lèvres Satin 3g',
    category: 'Maquillage',
    brand: 'Bourjois',
    expiresIn: 730,
    stock: 40,
    price: 10.9,
    cost: 6.5,
  },
  {
    sku: 'MASCARA-BLK',
    lot: 'LOT-2026-B010',
    name: 'Mascara Volume Noir 9ml',
    category: 'Maquillage',
    brand: 'Maybelline',
    expiresIn: 730,
    stock: 35,
    price: 12.9,
    cost: 8.0,
  },
  {
    sku: 'VERN-ONG-10',
    lot: 'LOT-2026-B011',
    name: 'Vernis à Ongles 10ml',
    category: 'Maquillage',
    brand: 'Bourjois',
    expiresIn: 730,
    stock: 50,
    price: 9.9,
    cost: 5.5,
  },
  {
    sku: 'SOIN-CHEV-150',
    lot: 'LOT-2026-B012',
    name: 'Soin Cheveux Sans Rinçage 150ml',
    category: 'Cheveux',
    brand: "L'Oréal",
    expiresIn: 730,
    stock: 70,
    price: 13.9,
    cost: 8.5,
  },
  {
    sku: 'GOMMAGE-VIS-50',
    lot: 'LOT-2026-B013',
    name: 'Gommage Doux Visage 50ml',
    category: 'Soins visage',
    brand: 'La Roche-Posay',
    expiresIn: 730,
    stock: 45,
    price: 16.9,
    cost: 10.5,
  },
  // ── Sûrs (days_of_cover < 60 → écoulement normal)
  {
    sku: 'CREME-NUIT-50',
    lot: 'LOT-2026-C001',
    name: 'Crème de Nuit Anti-Âge 50ml',
    category: 'Soins visage',
    brand: 'Vichy',
    expiresIn: 730,
    stock: 45,
    price: 34.9,
    cost: 22.0,
  },
  {
    sku: 'BAUME-LEV-15',
    lot: 'LOT-2026-C002',
    name: 'Baume Lèvres Hydratant 15ml',
    category: 'Soins lèvres',
    brand: 'Nuxe',
    expiresIn: 730,
    stock: 80,
    price: 9.9,
    cost: 5.8,
  },
  {
    sku: 'GOMMAGE-100',
    lot: 'LOT-2026-C003',
    name: 'Gommage Corps Sucré 100ml',
    category: 'Soins corps',
    brand: 'Garnier',
    expiresIn: 730,
    stock: 90,
    price: 8.9,
    cost: 5.2,
  },
  {
    sku: 'BRUME-CORP-200',
    lot: 'LOT-2026-C004',
    name: 'Brume Corps Parfumée 200ml',
    category: 'Parfumerie',
    brand: 'Nuxe',
    expiresIn: 730,
    stock: 110,
    price: 14.9,
    cost: 9.0,
  },
  {
    sku: 'SAVON-MAR-100',
    lot: 'LOT-2026-C005',
    name: 'Savon de Marseille Olive 100g',
    category: 'Soins corps',
    brand: 'Le Petit Marseillais',
    expiresIn: 1095,
    stock: 130,
    price: 3.9,
    cost: 2.2,
  },
  {
    sku: 'EAU-FLOR-100',
    lot: 'LOT-2026-C006',
    name: 'Eau Florale Bleuet 100ml',
    category: 'Soins visage',
    brand: 'Caudalie',
    expiresIn: 730,
    stock: 75,
    price: 13.9,
    cost: 8.5,
  },
  {
    sku: 'LAIT-CORP-400',
    lot: 'LOT-2026-C007',
    name: 'Lait Corporel Hydratant 400ml',
    category: 'Soins corps',
    brand: 'Nivea',
    expiresIn: 730,
    stock: 100,
    price: 8.9,
    cost: 5.5,
  },
  {
    sku: 'DEO-SPRAY-150',
    lot: 'LOT-2026-C008',
    name: 'Déodorant Spray 24h 150ml',
    category: 'Soins corps',
    brand: 'Nivea',
    expiresIn: 730,
    stock: 85,
    price: 4.9,
    cost: 2.8,
  },
  {
    sku: 'TONER-ROSE-150',
    lot: 'LOT-2026-C009',
    name: 'Lotion Tonique Rose 150ml',
    category: 'Soins visage',
    brand: 'Caudalie',
    expiresIn: 730,
    stock: 55,
    price: 16.9,
    cost: 10.5,
  },
  {
    sku: 'CREME-SOL-50',
    lot: 'LOT-2026-C010',
    name: 'Crème Solaire SPF50 50ml',
    category: 'Solaire',
    brand: 'La Roche-Posay',
    expiresIn: 730,
    stock: 70,
    price: 19.9,
    cost: 12.5,
  },
  {
    sku: 'EAU-PARF-50',
    lot: 'LOT-2026-C011',
    name: 'Eau de Parfum Florale 50ml',
    category: 'Parfumerie',
    brand: 'Clarins',
    expiresIn: 1095,
    stock: 120,
    price: 45.9,
    cost: 28.0,
  },
];

// Plans de vente P1 : 5 entrées hebdomadaires (semaines 4 à 0 avant aujourd'hui)
// Calibrés pour que days_of_cover = stock / (sum/30) tombe dans la bonne tranche
const SALES_PLAN_P1: Record<string, number[]> = {
  // Critiques : velocity ≤ stock/180
  'CRE-HYD-50': [3, 3, 3, 3, 3], // vel=0.5  doc=360
  'SER-VIT-C': [2, 2, 2, 2, 1], // vel=0.3  doc=317
  'MIC-EAU-400': [2, 2, 2, 2, 2], // vel=0.33 doc=606
  'BB-CREAM-30': [1, 1, 2, 1, 1], // vel=0.2  doc=650
  'FOND-TEINT-30': [2, 2, 2, 2, 2], // vel=0.33 doc=480
  'CREME-MAIN-75': [2, 2, 2, 2, 2], // vel=0.33 doc=420
  'HUILE-ROSE-30': [1, 1, 1, 1, 1], // vel=0.17 doc=450
  'CONT-OCU-15': [1, 1, 1, 1, 1], // vel=0.17 doc=360
  // Élevés : 60 ≤ doc < 180
  'CREME-CORP-200': [8, 8, 8, 8, 8], // vel=1.33 doc=82.5
  'MASQ-ARG-75': [5, 5, 5, 5, 5], // vel=0.83 doc=90
  'GEL-DOUCHE-250': [3, 3, 3, 3, 3], // vel=0.5  doc=90
  'HUILE-SEC-100': [4, 4, 3, 4, 3], // vel=0.6  doc=91.7
  'DEMA-YEU-125': [6, 6, 6, 6, 5], // vel=0.97 doc=92.8
  'CREME-PIED-75': [4, 4, 4, 4, 4], // vel=0.67 doc=97.5
  'SHA-REP-250': [4, 4, 4, 4, 4], // vel=0.67 doc=90
  'COND-LISS-200': [5, 5, 5, 5, 5], // vel=0.83 doc=102
  'ROUGE-LEV-3G': [2, 2, 2, 2, 2], // vel=0.33 doc=121
  'MASCARA-BLK': [2, 2, 2, 2, 2], // vel=0.33 doc=105
  'VERN-ONG-10': [3, 3, 3, 3, 3], // vel=0.5  doc=100
  'SOIN-CHEV-150': [5, 5, 5, 5, 5], // vel=0.83 doc=84
  'GOMMAGE-VIS-50': [4, 4, 4, 4, 4], // vel=0.67 doc=67.5
  // Sûrs : doc < 60
  'CREME-NUIT-50': [6, 6, 6, 6, 6], // vel=1.0  doc=45
  'BAUME-LEV-15': [10, 10, 10, 10, 9], // vel=1.63 doc=49.1
  'GOMMAGE-100': [14, 14, 14, 14, 14], // vel=2.33 doc=38.6
  'BRUME-CORP-200': [14, 14, 14, 14, 14], // vel=2.33 doc=47.2
  'SAVON-MAR-100': [14, 14, 14, 14, 14], // vel=2.33 doc=55.8
  'EAU-FLOR-100': [10, 10, 10, 10, 10], // vel=1.67 doc=45
  'LAIT-CORP-400': [12, 12, 12, 12, 12], // vel=2.0  doc=50
  'DEO-SPRAY-150': [12, 12, 12, 12, 12], // vel=2.0  doc=42.5
  'TONER-ROSE-150': [7, 7, 7, 7, 7], // vel=1.17 doc=47.1
  'CREME-SOL-50': [10, 10, 10, 10, 10], // vel=1.67 doc=42
  'EAU-PARF-50': [14, 14, 14, 14, 14], // vel=2.33 doc=51.5
};

// ─── Produits cosmétiques — Pharmacie 2 (focus maquillage + parfumerie) ──────

const PRODUCTS_P2: ProductRow[] = [
  {
    sku: 'P2-FOND-TEINT',
    lot: 'LOT-P2-A001',
    name: 'Fond de Teint Mat Longue Tenue 30ml',
    category: 'Maquillage',
    brand: "L'Oréal",
    expiresIn: 730,
    stock: 200,
    price: 16.9,
    cost: 10.5,
  },
  {
    sku: 'P2-PALETTE-FAR',
    lot: 'LOT-P2-A002',
    name: 'Palette Fards à Paupières 12 teintes',
    category: 'Maquillage',
    brand: 'Bourjois',
    expiresIn: 730,
    stock: 80,
    price: 19.9,
    cost: 12.0,
  },
  {
    sku: 'P2-BLUSH-8G',
    lot: 'LOT-P2-A003',
    name: 'Blush Poudre Rose Nacré 8g',
    category: 'Maquillage',
    brand: 'Rimmel',
    expiresIn: 730,
    stock: 60,
    price: 11.9,
    cost: 7.0,
  },
  {
    sku: 'P2-PARF-EDT',
    lot: 'LOT-P2-B001',
    name: 'Eau de Toilette Fraîche 75ml',
    category: 'Parfumerie',
    brand: 'Issey Miyake',
    expiresIn: 1095,
    stock: 40,
    price: 62.0,
    cost: 38.0,
  },
  {
    sku: 'P2-SERUM-HA',
    lot: 'LOT-P2-B002',
    name: 'Sérum Acide Hyaluronique 30ml',
    category: 'Soins visage',
    brand: 'Neutrogena',
    expiresIn: 730,
    stock: 120,
    price: 21.9,
    cost: 13.5,
  },
  {
    sku: 'P2-CREME-BB',
    lot: 'LOT-P2-B003',
    name: 'Crème BB Teintée SPF20 50ml',
    category: 'Soins visage',
    brand: 'Garnier',
    expiresIn: 730,
    stock: 90,
    price: 9.9,
    cost: 6.0,
  },
  {
    sku: 'P2-MASQ-HYD',
    lot: 'LOT-P2-C001',
    name: 'Masques Tissu Hydratants (5 pcs)',
    category: 'Soins visage',
    brand: 'Garnier',
    expiresIn: 730,
    stock: 150,
    price: 7.9,
    cost: 4.5,
  },
  {
    sku: 'P2-BAUME-CORP',
    lot: 'LOT-P2-C002',
    name: 'Baume Corps Réparateur 200ml',
    category: 'Soins corps',
    brand: 'Bioderma',
    expiresIn: 730,
    stock: 55,
    price: 18.9,
    cost: 11.5,
  },
  {
    sku: 'P2-GEL-DOC',
    lot: 'LOT-P2-C003',
    name: 'Gel Douche Surgras Avoine 400ml',
    category: 'Soins corps',
    brand: 'Avène',
    expiresIn: 730,
    stock: 75,
    price: 10.9,
    cost: 6.5,
  },
  {
    sku: 'P2-DEO-BILLE',
    lot: 'LOT-P2-C004',
    name: 'Déodorant Bille Jasmin 50ml',
    category: 'Soins corps',
    brand: 'Nuxe',
    expiresIn: 730,
    stock: 40,
    price: 12.9,
    cost: 7.5,
  },
  {
    sku: 'P2-SHAM-SEC',
    lot: 'LOT-P2-D001',
    name: 'Shampooing Sec Volume 150ml',
    category: 'Cheveux',
    brand: 'Batiste',
    expiresIn: 730,
    stock: 100,
    price: 8.5,
    cost: 5.0,
  },
  {
    sku: 'P2-MASQ-CHEV',
    lot: 'LOT-P2-D002',
    name: 'Masque Capillaire Réparateur 200ml',
    category: 'Cheveux',
    brand: 'Schwarzkopf',
    expiresIn: 730,
    stock: 65,
    price: 14.9,
    cost: 9.0,
  },
  {
    sku: 'P2-SPRAY-SOL',
    lot: 'LOT-P2-E001',
    name: 'Spray Solaire SPF30 150ml',
    category: 'Solaire',
    brand: 'Garnier',
    expiresIn: 730,
    stock: 85,
    price: 12.9,
    cost: 7.8,
  },
  {
    sku: 'P2-APRES-SOL',
    lot: 'LOT-P2-E002',
    name: 'Après-Soleil Hydratant 200ml',
    category: 'Solaire',
    brand: 'Ambre Solaire',
    expiresIn: 730,
    stock: 70,
    price: 9.9,
    cost: 5.8,
  },
  {
    sku: 'P2-CREME-NUIT',
    lot: 'LOT-P2-F001',
    name: 'Crème Nuit Régénératrice 50ml',
    category: 'Soins visage',
    brand: 'Vichy',
    expiresIn: 730,
    stock: 30,
    price: 29.9,
    cost: 18.5,
  },
];

const SALES_PLAN_P2: Record<string, number[]> = {
  'P2-FOND-TEINT': [2, 2, 2, 2, 2], // vel=0.33 doc=606 → critique
  'P2-PALETTE-FAR': [3, 3, 3, 3, 3], // vel=0.5  doc=160 → élevé
  'P2-BLUSH-8G': [4, 4, 4, 4, 4], // vel=0.67 doc=90  → élevé
  'P2-PARF-EDT': [1, 1, 1, 1, 1], // vel=0.17 doc=240 → critique
  'P2-SERUM-HA': [4, 4, 4, 4, 4], // vel=0.67 doc=180 → élevé
  'P2-CREME-BB': [5, 5, 5, 5, 5], // vel=0.83 doc=108 → élevé
  'P2-MASQ-HYD': [3, 3, 3, 3, 3], // vel=0.5  doc=300 → critique
  'P2-BAUME-CORP': [4, 4, 4, 4, 4], // vel=0.67 doc=82  → élevé
  'P2-GEL-DOC': [4, 4, 4, 4, 4], // vel=0.67 doc=112 → élevé
  'P2-DEO-BILLE': [4, 4, 4, 4, 4], // vel=0.67 doc=60  → élevé
  'P2-SHAM-SEC': [10, 10, 10, 10, 10], // vel=1.67 doc=60 → élevé
  'P2-MASQ-CHEV': [4, 4, 4, 4, 4], // vel=0.67 doc=97  → élevé
  'P2-SPRAY-SOL': [12, 12, 12, 12, 12], // vel=2.0 doc=42.5 → sûr
  'P2-APRES-SOL': [10, 10, 10, 10, 10], // vel=1.67 doc=42 → sûr
  'P2-CREME-NUIT': [4, 4, 4, 4, 4], // vel=0.67 doc=45  → sûr
};

// ─── Produits cosmétiques — Pharmacie 3 (focus soins corps + bébé) ────────────

const PRODUCTS_P3: ProductRow[] = [
  {
    sku: 'P3-LAIT-BEBE',
    lot: 'LOT-P3-A001',
    name: 'Lait de Toilette Bébé 500ml',
    category: 'Bébé',
    brand: 'Mustela',
    expiresIn: 730,
    stock: 120,
    price: 13.9,
    cost: 8.5,
  },
  {
    sku: 'P3-CREME-BEBE',
    lot: 'LOT-P3-A002',
    name: 'Crème Protectrice Bébé 50ml',
    category: 'Bébé',
    brand: 'Mustela',
    expiresIn: 730,
    stock: 90,
    price: 9.9,
    cost: 6.0,
  },
  {
    sku: 'P3-GEL-BEBE',
    lot: 'LOT-P3-A003',
    name: 'Gel Lavant Doux Bébé 200ml',
    category: 'Bébé',
    brand: 'Mustela',
    expiresIn: 730,
    stock: 110,
    price: 11.9,
    cost: 7.2,
  },
  {
    sku: 'P3-LAIT-CORP',
    lot: 'LOT-P3-B001',
    name: 'Lait Corporel Douceur 400ml',
    category: 'Soins corps',
    brand: 'Nivea',
    expiresIn: 730,
    stock: 150,
    price: 7.9,
    cost: 4.5,
  },
  {
    sku: 'P3-SAVON-LIQ',
    lot: 'LOT-P3-B002',
    name: 'Savon Liquide Surgras Fleur 300ml',
    category: 'Soins corps',
    brand: 'Roger & Gallet',
    expiresIn: 730,
    stock: 80,
    price: 8.9,
    cost: 5.2,
  },
  {
    sku: 'P3-HUILE-AMAN',
    lot: 'LOT-P3-B003',
    name: 'Huile Végétale Amande Douce 100ml',
    category: 'Soins corps',
    brand: 'Weleda',
    expiresIn: 730,
    stock: 60,
    price: 12.9,
    cost: 7.8,
  },
  {
    sku: 'P3-CREME-MAIN',
    lot: 'LOT-P3-B004',
    name: 'Crème Mains Intense Sécheresse 75ml',
    category: 'Soins corps',
    brand: 'Neutrogena',
    expiresIn: 730,
    stock: 70,
    price: 5.9,
    cost: 3.5,
  },
  {
    sku: 'P3-SHA-DOUX',
    lot: 'LOT-P3-C001',
    name: 'Shampooing Doux Usage Fréquent 250ml',
    category: 'Cheveux',
    brand: 'Ducray',
    expiresIn: 730,
    stock: 95,
    price: 14.9,
    cost: 9.0,
  },
  {
    sku: 'P3-SHA-ANTI',
    lot: 'LOT-P3-C002',
    name: 'Shampooing Anti-Pelliculaire 200ml',
    category: 'Cheveux',
    brand: 'Ducray',
    expiresIn: 730,
    stock: 55,
    price: 16.9,
    cost: 10.2,
  },
  {
    sku: 'P3-CREME-VIS',
    lot: 'LOT-P3-D001',
    name: 'Crème Visage Peaux Sensibles 40ml',
    category: 'Soins visage',
    brand: 'Avène',
    expiresIn: 730,
    stock: 45,
    price: 19.9,
    cost: 12.0,
  },
];

const SALES_PLAN_P3: Record<string, number[]> = {
  'P3-LAIT-BEBE': [3, 3, 3, 3, 3], // vel=0.5  doc=240 → critique
  'P3-CREME-BEBE': [4, 4, 4, 4, 4], // vel=0.67 doc=135 → élevé
  'P3-GEL-BEBE': [3, 3, 3, 3, 3], // vel=0.5  doc=220 → critique
  'P3-LAIT-CORP': [3, 3, 3, 3, 3], // vel=0.5  doc=300 → critique
  'P3-SAVON-LIQ': [5, 5, 5, 5, 5], // vel=0.83 doc=96  → élevé
  'P3-HUILE-AMAN': [3, 3, 3, 3, 3], // vel=0.5  doc=120 → élevé
  'P3-CREME-MAIN': [9, 9, 9, 9, 9], // vel=1.5  doc=46.7 → sûr
  'P3-SHA-DOUX': [5, 5, 5, 5, 5], // vel=0.83 doc=114 → élevé
  'P3-SHA-ANTI': [4, 4, 4, 4, 4], // vel=0.67 doc=82  → élevé
  'P3-CREME-VIS': [6, 6, 6, 6, 6], // vel=1.0  doc=45  → sûr
};

// ─── Algorithme de classification dormance ───────────────────────────────────

function computeVelocity(saleDates: Date[], quantities: number[]): number {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  let total = 0;
  for (let i = 0; i < saleDates.length; i++) {
    if (saleDates[i] >= thirtyDaysAgo) total += quantities[i];
  }
  return total / 30;
}

function classifyDormance(velocity: number, daysOfCover: number): string {
  if (velocity === 0) return 'critical';
  if (daysOfCover < 60) return 'safe';
  if (daysOfCover < 180) return 'high';
  return 'critical';
}

function deriveAction(level: string): string {
  if (level === 'safe') return 'Aucune action';
  if (level === 'high') return 'Mise en vente B2C';
  return 'Don associatif';
}

function calculateRisk(
  stock: number,
  unitPrice: number,
  costPrice: number,
  saleDates: Date[],
  quantities: number[]
) {
  const velocity = computeVelocity(saleDates, quantities);
  const rawCover = velocity > 0 ? stock / velocity : 9999;
  const daysOfCover = parseFloat(Math.min(rawCover, 9999).toFixed(1));
  const capitalLocked = parseFloat((stock * costPrice).toFixed(2));
  const level = classifyDormance(velocity, daysOfCover);
  const recoveryRate = level === 'safe' ? 0 : 0.5;
  return {
    days_of_cover: daysOfCover,
    sales_velocity_30d: parseFloat(velocity.toFixed(4)),
    capital_locked: capitalLocked,
    risk_level: level,
    suggested_action: deriveAction(level),
    recoverable_value: parseFloat(
      (stock * unitPrice * recoveryRate).toFixed(2)
    ),
    potential_loss: capitalLocked,
  };
}

// ─── Fonctions de seed ────────────────────────────────────────────────────────

async function seedAdmin() {
  const adminPharmacy = await prisma.pharmacy.upsert({
    where: { pharmacy_id: ADMIN_PHARMACY_ID },
    update: {},
    create: {
      pharmacy_id: ADMIN_PHARMACY_ID,
      name: 'Savely (Admin)',
      email: 'admin-internal@savely.fr',
      address: 'Interne',
      siret: '00000000000000',
      subscription_tier: 'admin',
    },
  });

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existingAdmin) {
    const needsFix =
      existingAdmin.role !== 'ADMIN_SAVELY' ||
      existingAdmin.status !== 'ACTIVE' ||
      existingAdmin.pharmacy_id !== adminPharmacy.pharmacy_id;
    if (needsFix) {
      await prisma.user.update({
        where: { user_id: existingAdmin.user_id },
        data: {
          pharmacy_id: adminPharmacy.pharmacy_id,
          role: 'ADMIN_SAVELY',
          status: 'ACTIVE',
          password: passwordHash,
        },
      });
    }
    console.log(`✅ Admin : ${ADMIN_EMAIL}`);
    return;
  }

  await prisma.user.create({
    data: {
      pharmacy_id: adminPharmacy.pharmacy_id,
      email: ADMIN_EMAIL,
      password: passwordHash,
      role: 'ADMIN_SAVELY',
      status: 'ACTIVE',
      first_name: 'Admin',
      last_name: 'Savely',
    },
  });
  console.log(`✅ Admin créé : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

async function seedCategories() {
  let created = 0;
  for (const cat of SYSTEM_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { pharmacy_id: null, slug: cat.slug },
    });
    if (existing) continue;
    await prisma.category.create({
      data: {
        pharmacy_id: null,
        name: cat.name,
        slug: cat.slug,
        is_system: true,
      },
    });
    created++;
  }
  console.log(
    `✅ Catégories système : ${created} créée(s), ${SYSTEM_CATEGORIES.length - created} déjà présente(s)`
  );
}

async function seedPharmacies() {
  for (const ph of PHARMACIES) {
    const existing = await prisma.pharmacy.findUnique({
      where: { pharmacy_id: ph.pharmacy_id },
    });
    if (!existing) {
      await prisma.pharmacy.create({
        data: { ...ph, last_upload_at: new Date() },
      });
      console.log(`✅ Pharmacie créée : ${ph.name}`);
    } else {
      if (existing.lat == null || existing.donation_pickup_windows == null) {
        await prisma.pharmacy.update({
          where: { pharmacy_id: ph.pharmacy_id },
          data: {
            lat: ph.lat,
            lng: ph.lng,
            donation_pickup_windows: ph.donation_pickup_windows,
          },
        });
      }
      console.log(`✅ Pharmacie déjà présente : ${ph.name}`);
    }
  }
}

async function seedUsers() {
  let created = 0;
  for (const u of USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
    });
    if (existing) continue;

    const passwordHash = u.password ? await bcrypt.hash(u.password, 12) : null;
    await prisma.user.create({
      data: {
        pharmacy_id: u.pharmacy_id,
        email: u.email,
        password: passwordHash,
        role: u.role,
        status: 'ACTIVE',
        first_name: u.first_name,
        last_name: u.last_name,
      },
    });
    created++;
  }
  console.log(
    `✅ Utilisateurs : ${created} créé(s), ${USERS.length - created} déjà présent(s)`
  );
}

async function seedAssociations(): Promise<Map<string, string>> {
  const byName = new Map<string, string>();
  let created = 0;

  for (const a of ASSOCIATIONS) {
    const existing = await prisma.association.findFirst({
      where: { name: a.name },
    });
    if (existing) {
      byName.set(a.name, existing.association_id);
      continue;
    }
    const asso = await prisma.association.create({
      data: {
        ...a,
        email_verified_at: a.status === 'ACTIVE' ? new Date() : null,
      },
    });
    byName.set(a.name, asso.association_id);
    created++;
  }
  console.log(
    `✅ Associations : ${created} créée(s), ${ASSOCIATIONS.length - created} déjà présente(s)`
  );

  // Historique de non-fiabilité pour "Les Oubliés du Retrait"
  const unreliableId = byName.get('Les Oubliés du Retrait');
  if (unreliableId) {
    const alreadySeeded = await prisma.donationAllocation.findFirst({
      where: { association_id: unreliableId, status: 'NON_RECUPEREE' },
    });
    if (!alreadySeeded) {
      for (let i = 0; i < 3; i++) {
        const donation = await prisma.donation.create({
          data: {
            pharmacy_id: ADMIN_PHARMACY_ID,
            status: 'ECHOUEE',
            attempt_count: 1,
          },
        });
        const proposal = await prisma.donationProposal.create({
          data: {
            donation_id: donation.donation_id,
            association_id: unreliableId,
            status: 'ACCEPTEE',
            proposed_lines: [],
            sent_at: daysAgo(30 + i * 10),
            responded_at: daysAgo(29 + i * 10),
            expires_at: daysAgo(27 + i * 10),
          },
        });
        await prisma.donationAllocation.create({
          data: {
            donation_id: donation.donation_id,
            association_id: unreliableId,
            proposal_id: proposal.proposal_id,
            status: 'NON_RECUPEREE',
            lines: [],
            pickup_slot_start: daysAgo(25 + i * 10),
            pickup_slot_end: daysAgo(25 + i * 10),
            recovery_code: makeRecoveryCode(`NR${i}`),
          } as Parameters<typeof prisma.donationAllocation.create>[0]['data'],
        });
      }
      console.log(
        '✅ Historique de non-fiabilité créé (Les Oubliés du Retrait)'
      );
    }
  }

  return byName;
}

async function seedProductsForPharmacy(
  pharmacyId: string,
  products: ProductRow[],
  salesPlan: Record<string, number[]>
): Promise<Record<string, string>> {
  const skuToId: Record<string, string> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const p of products) {
    let product = await prisma.product.findFirst({
      where: { pharmacy_id: pharmacyId, external_sku: p.sku },
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          pharmacy_id: pharmacyId,
          external_sku: p.sku,
          lot_number: p.lot,
          name: p.name,
          category: p.category,
          brand: p.brand,
          expiry_date: daysFromNow(p.expiresIn),
          stock_quantity: p.stock,
          unit_price: p.price,
          cost_price: p.cost,
        },
      });
    }
    skuToId[p.sku] = product.product_id;

    const plan = salesPlan[p.sku] ?? [];
    const salesDates: Date[] = [];
    const salesQtys: number[] = [];

    for (let week = 0; week < plan.length; week++) {
      const saleDate = daysAgo(28 - week * 7);
      const existingSale = await prisma.sale.findFirst({
        where: { product_id: product.product_id, sale_date: saleDate },
      });
      if (!existingSale) {
        await prisma.sale.create({
          data: {
            product_id: product.product_id,
            pharmacy_id: pharmacyId,
            sale_date: saleDate,
            quantity_sold: plan[week],
            unit_price_sold: p.price,
          },
        });
      }
      salesDates.push(saleDate);
      salesQtys.push(plan[week]);
    }

    const existingRisk = await prisma.riskAnalysis.findFirst({
      where: { product_id: product.product_id, analysis_date: today },
    });
    if (!existingRisk) {
      const risk = calculateRisk(
        p.stock,
        p.price,
        p.cost,
        salesDates,
        salesQtys
      );
      await prisma.riskAnalysis.create({
        data: {
          product_id: product.product_id,
          pharmacy_id: pharmacyId,
          analysis_date: today,
          ...risk,
        },
      });
    }
  }

  return skuToId;
}

// ─── DonParametres ────────────────────────────────────────────────────────────

async function seedDonParametres() {
  const configs = [
    {
      pharmacy_id: PHARMACY_1_ID,
      seuil_dormance_jours: 90,
      rayon_matching_km: 50,
    },
    {
      pharmacy_id: PHARMACY_2_ID,
      seuil_dormance_jours: 75,
      rayon_matching_km: 30,
    },
    {
      pharmacy_id: PHARMACY_3_ID,
      seuil_dormance_jours: 100,
      rayon_matching_km: 60,
    },
  ];
  let created = 0;
  for (const cfg of configs) {
    const existing = await prisma.donParametres.findUnique({
      where: { pharmacy_id: cfg.pharmacy_id },
    });
    if (!existing) {
      await prisma.donParametres.create({ data: cfg });
      created++;
    }
  }
  console.log(
    `✅ DonParametres : ${created} créé(s), ${configs.length - created} déjà présent(s)`
  );
}

// ─── Cycles de don — 4 scénarios du cycle de vie complet ─────────────────────

async function seedDonationCycles(
  p1SkuToId: Record<string, string>,
  assoByName: Map<string, string>
) {
  // Idempotence : on ne re-seed pas si des dons non-ECHOUEE existent déjà pour P1
  const alreadySeeded = await prisma.donation.findFirst({
    where: { pharmacy_id: PHARMACY_1_ID, status: { not: 'ECHOUEE' } },
  });
  if (alreadySeeded) {
    console.log('✅ Cycles de dons déjà présents');
    return;
  }

  const assoId1 = assoByName.get('Solidarité Quartier République')!;
  const assoId2 = assoByName.get('Entraide Île-de-France')!;
  const assoId3 = assoByName.get('Croix Verte Solidaire')!;
  const assoId4 = assoByName.get('Les Oubliés du Retrait')!;

  // ── Scénario 1 : EN_COURS — proposition envoyée, asso n'a pas répondu ──────
  const lines1 = [
    {
      product_id: p1SkuToId['CRE-HYD-50'],
      name: 'Crème Hydratante Visage 50ml',
      quantity: 10,
      unit_value: 8.5,
    },
    {
      product_id: p1SkuToId['MIC-EAU-400'],
      name: 'Eau Micellaire Sensitive 400ml',
      quantity: 15,
      unit_value: 6.2,
    },
  ];
  const don1 = await prisma.donation.create({
    data: {
      pharmacy_id: PHARMACY_1_ID,
      status: 'EN_COURS',
      attempt_count: 1,
      lines: {
        create: lines1.map((l) => ({
          product_id: l.product_id,
          quantity_total: l.quantity,
          quantity_allocated: 0,
          unit_value: l.unit_value,
        })),
      },
    },
  });
  await prisma.donationProposal.create({
    data: {
      donation_id: don1.donation_id,
      association_id: assoId1,
      status: 'ENVOYEE',
      proposed_lines: lines1,
      sent_at: daysAgo(1),
      expires_at: daysFromNow(2),
    },
  });
  await prisma.donationEvent.createMany({
    data: [
      {
        donation_id: don1.donation_id,
        type: 'DONATION_CREATED',
        actor: 'TITULAIRE:system',
        payload: { source: 'centre_actions' },
        created_at: daysAgo(2),
      },
      {
        donation_id: don1.donation_id,
        type: 'PROPOSAL_SENT',
        actor: 'SYSTEM',
        payload: { association: 'Solidarité Quartier République' },
        created_at: daysAgo(1),
      },
    ],
  });

  // ── Scénario 2 : EN_COURS — allocation PLANIFIEE, retrait dans 3 jours ─────
  const lines2 = [
    {
      product_id: p1SkuToId['FOND-TEINT-30'],
      name: 'Fond de Teint Fluide 30ml',
      quantity: 8,
      unit_value: 9.5,
    },
    {
      product_id: p1SkuToId['BB-CREAM-30'],
      name: 'BB Cream SPF15 30ml',
      quantity: 12,
      unit_value: 5.0,
    },
    {
      product_id: p1SkuToId['ROUGE-LEV-3G'],
      name: 'Rouge à Lèvres Satin 3g',
      quantity: 6,
      unit_value: 6.5,
    },
  ];
  const don2 = await prisma.donation.create({
    data: {
      pharmacy_id: PHARMACY_1_ID,
      status: 'EN_COURS',
      attempt_count: 1,
      lines: {
        create: lines2.map((l) => ({
          product_id: l.product_id,
          quantity_total: l.quantity,
          quantity_allocated: l.quantity,
          unit_value: l.unit_value,
        })),
      },
    },
  });
  const prop2 = await prisma.donationProposal.create({
    data: {
      donation_id: don2.donation_id,
      association_id: assoId2,
      status: 'ACCEPTEE',
      proposed_lines: lines2,
      sent_at: daysAgo(4),
      responded_at: daysAgo(3),
      expires_at: daysFromNow(1),
    },
  });
  await prisma.donationAllocation.create({
    data: {
      donation_id: don2.donation_id,
      association_id: assoId2,
      proposal_id: prop2.proposal_id,
      status: 'PLANIFIEE',
      lines: lines2,
      pickup_slot_start: hoursFromNow(72),
      pickup_slot_end: hoursFromNow(75),
      recovery_code: makeRecoveryCode('D2'),
    } as Parameters<typeof prisma.donationAllocation.create>[0]['data'],
  });
  await prisma.donationEvent.createMany({
    data: [
      {
        donation_id: don2.donation_id,
        type: 'DONATION_CREATED',
        actor: 'TITULAIRE:system',
        payload: {},
        created_at: daysAgo(5),
      },
      {
        donation_id: don2.donation_id,
        type: 'PROPOSAL_SENT',
        actor: 'SYSTEM',
        payload: { association: 'Entraide Île-de-France' },
        created_at: daysAgo(4),
      },
      {
        donation_id: don2.donation_id,
        type: 'PROPOSAL_ACCEPTED',
        actor: `ASSOCIATION:${assoId2}`,
        payload: { slots_selected: 3 },
        created_at: daysAgo(3),
      },
    ],
  });

  // ── Scénario 3 : COMPLETEE — retrait effectué, Cerfa généré ─────────────────
  const lines3 = [
    {
      product_id: p1SkuToId['SER-VIT-C'],
      name: 'Sérum Éclat Vitamine C 30ml',
      quantity: 5,
      unit_value: 16.0,
    },
    {
      product_id: p1SkuToId['HUILE-ROSE-30'],
      name: 'Huile Rosier Sauvage 30ml',
      quantity: 4,
      unit_value: 21.0,
    },
    {
      product_id: p1SkuToId['CONT-OCU-15'],
      name: 'Contour des Yeux Anti-Cernes 15ml',
      quantity: 3,
      unit_value: 24.0,
    },
  ];
  const don3 = await prisma.donation.create({
    data: {
      pharmacy_id: PHARMACY_1_ID,
      status: 'COMPLETEE',
      attempt_count: 1,
      lines: {
        create: lines3.map((l) => ({
          product_id: l.product_id,
          quantity_total: l.quantity,
          quantity_allocated: l.quantity,
          unit_value: l.unit_value,
        })),
      },
    },
  });
  const prop3 = await prisma.donationProposal.create({
    data: {
      donation_id: don3.donation_id,
      association_id: assoId3,
      status: 'ACCEPTEE',
      proposed_lines: lines3,
      sent_at: daysAgo(15),
      responded_at: daysAgo(13),
      expires_at: daysAgo(10),
    },
  });
  const pickupStart = daysAgo(5);
  pickupStart.setHours(9, 0, 0, 0);
  const pickupEnd = daysAgo(5);
  pickupEnd.setHours(12, 0, 0, 0);
  await prisma.donationAllocation.create({
    data: {
      donation_id: don3.donation_id,
      association_id: assoId3,
      proposal_id: prop3.proposal_id,
      status: 'RETIREE',
      lines: lines3,
      pickup_slot_start: pickupStart,
      pickup_slot_end: pickupEnd,
      picked_up_by: 'Isabelle Moreau (bénévole)',
      picked_up_at: pickupStart,
      cerfa_number: 'CERFA-2026-00123',
      recovery_code: 'SAV-D3-COMPLETEE',
    } as Parameters<typeof prisma.donationAllocation.create>[0]['data'],
  });
  await prisma.donationEvent.createMany({
    data: [
      {
        donation_id: don3.donation_id,
        type: 'DONATION_CREATED',
        actor: 'TITULAIRE:system',
        payload: {},
        created_at: daysAgo(16),
      },
      {
        donation_id: don3.donation_id,
        type: 'PROPOSAL_SENT',
        actor: 'SYSTEM',
        payload: { association: 'Croix Verte Solidaire' },
        created_at: daysAgo(15),
      },
      {
        donation_id: don3.donation_id,
        type: 'PROPOSAL_ACCEPTED',
        actor: `ASSOCIATION:${assoId3}`,
        payload: {},
        created_at: daysAgo(13),
      },
      {
        donation_id: don3.donation_id,
        type: 'PICKUP_CONFIRMED',
        actor: 'PREPARATEUR:system',
        payload: { picked_up_by: 'Isabelle Moreau' },
        created_at: pickupStart,
      },
      {
        donation_id: don3.donation_id,
        type: 'DONATION_COMPLETED',
        actor: 'SYSTEM',
        payload: { cerfa: 'CERFA-2026-00123' },
        created_at: pickupStart,
      },
    ],
  });

  // ── Scénario 4 : ECHOUEE — 3 assos contactées, aucune n'a accepté ───────────
  const lines4 = [
    {
      product_id: p1SkuToId['HUILE-SEC-100'],
      name: 'Huile Sèche Corps 100ml',
      quantity: 6,
      unit_value: 14.5,
    },
    {
      product_id: p1SkuToId['CREME-CORP-200'],
      name: 'Crème Corps Nourrissante 200ml',
      quantity: 10,
      unit_value: 10.0,
    },
  ];
  const don4 = await prisma.donation.create({
    data: {
      pharmacy_id: PHARMACY_1_ID,
      status: 'ECHOUEE',
      attempt_count: 3,
      lines: {
        create: lines4.map((l) => ({
          product_id: l.product_id,
          quantity_total: l.quantity,
          quantity_allocated: 0,
          unit_value: l.unit_value,
        })),
      },
    },
  });
  await prisma.donationProposal.create({
    data: {
      donation_id: don4.donation_id,
      association_id: assoId1,
      status: 'REFUSEE',
      refusal_reason: 'Capacité de stockage insuffisante cette semaine',
      proposed_lines: lines4,
      sent_at: daysAgo(20),
      responded_at: daysAgo(19),
      expires_at: daysAgo(17),
    },
  });
  await prisma.donationProposal.create({
    data: {
      donation_id: don4.donation_id,
      association_id: assoId2,
      status: 'EXPIREE',
      proposed_lines: lines4,
      sent_at: daysAgo(17),
      expires_at: daysAgo(14),
    },
  });
  await prisma.donationProposal.create({
    data: {
      donation_id: don4.donation_id,
      association_id: assoId4,
      status: 'EXPIREE',
      proposed_lines: lines4,
      sent_at: daysAgo(14),
      expires_at: daysAgo(11),
    },
  });
  await prisma.donationEvent.createMany({
    data: [
      {
        donation_id: don4.donation_id,
        type: 'DONATION_CREATED',
        actor: 'TITULAIRE:system',
        payload: {},
        created_at: daysAgo(21),
      },
      {
        donation_id: don4.donation_id,
        type: 'PROPOSAL_SENT',
        actor: 'SYSTEM',
        payload: { association: 'Solidarité Quartier République' },
        created_at: daysAgo(20),
      },
      {
        donation_id: don4.donation_id,
        type: 'PROPOSAL_REFUSED',
        actor: `ASSOCIATION:${assoId1}`,
        payload: { reason: 'Capacité insuffisante' },
        created_at: daysAgo(19),
      },
      {
        donation_id: don4.donation_id,
        type: 'PROPOSAL_SENT',
        actor: 'SYSTEM',
        payload: { association: 'Entraide Île-de-France' },
        created_at: daysAgo(17),
      },
      {
        donation_id: don4.donation_id,
        type: 'PROPOSAL_EXPIRED',
        actor: 'SYSTEM',
        payload: {},
        created_at: daysAgo(14),
      },
      {
        donation_id: don4.donation_id,
        type: 'PROPOSAL_SENT',
        actor: 'SYSTEM',
        payload: { association: 'Les Oubliés du Retrait' },
        created_at: daysAgo(14),
      },
      {
        donation_id: don4.donation_id,
        type: 'PROPOSAL_EXPIRED',
        actor: 'SYSTEM',
        payload: {},
        created_at: daysAgo(11),
      },
      {
        donation_id: don4.donation_id,
        type: 'DONATION_FAILED',
        actor: 'SYSTEM',
        payload: { attempts: 3 },
        created_at: daysAgo(11),
      },
    ],
  });

  console.log(
    '✅ 4 cycles de dons créés : EN_COURS×2 (ENVOYEE + PLANIFIEE), COMPLETEE, ECHOUEE'
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function runSeed() {
  console.log('🌱 Démarrage du seed complet...\n');

  await seedAdmin();
  await seedCategories();
  const assoByName = await seedAssociations();
  await seedPharmacies();
  await seedUsers();

  console.log('\n📦 Produits & analyses de risque...');
  const p1Ids = await seedProductsForPharmacy(
    PHARMACY_1_ID,
    PRODUCTS_P1,
    SALES_PLAN_P1
  );
  console.log(
    `   Pharmacie 1 (Centrale République)         : ${PRODUCTS_P1.length} produits`
  );
  await seedProductsForPharmacy(PHARMACY_2_ID, PRODUCTS_P2, SALES_PLAN_P2);
  console.log(
    `   Pharmacie 2 (Marché des Enfants Rouges)   : ${PRODUCTS_P2.length} produits`
  );
  await seedProductsForPharmacy(PHARMACY_3_ID, PRODUCTS_P3, SALES_PLAN_P3);
  console.log(
    `   Pharmacie 3 (Butte Montmartre)            : ${PRODUCTS_P3.length} produits`
  );

  console.log('\n⚙️  DonParametres...');
  await seedDonParametres();

  console.log('\n💝 Cycles de dons...');
  await seedDonationCycles(p1Ids, assoByName);

  // Résumé distribution de risque pharmacie 1
  const analyses = await prisma.riskAnalysis.findMany({
    where: { pharmacy_id: PHARMACY_1_ID },
  });
  const byLevel = analyses.reduce<Record<string, number>>((acc, a) => {
    acc[a.risk_level] = (acc[a.risk_level] || 0) + 1;
    return acc;
  }, {});

  console.log('\n📊 Distribution des risques — Pharmacie 1 :');
  for (const [level, count] of Object.entries(byLevel)) {
    console.log(`   ${level.padEnd(10)} ${'█'.repeat(count)} (${count})`);
  }

  console.log('\n─────────────────────────────────────────────────────────');
  console.log('🏁 Seed terminé avec succès !\n');
  console.log('🔑 Connexions :');
  console.log(`   Admin Savely     : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`   Titulaire 1      : demo@cosmorisk.fr / demo1234`);
  console.log(`   Titulaire 2      : titulaire2@savely-demo.fr / demo1234`);
  console.log(`   Titulaire 3      : titulaire3@savely-demo.fr / demo1234`);
  console.log(`   Préparateur 1    : prep1@savely-demo.fr (OTP)`);
  console.log(`   Préparateur 2    : prep2@savely-demo.fr (OTP)`);
  console.log('\n🏥 Pharmacies :');
  console.log(`   P1 démo          : ${PHARMACY_1_ID}`);
  console.log(`   P2               : ${PHARMACY_2_ID}`);
  console.log(`   P3               : ${PHARMACY_3_ID}`);
  console.log('\n🤝 Associations :');
  ASSOCIATIONS.forEach((a) =>
    console.log(
      `   ${a.name.padEnd(36)} [${a.status}]${a.fiscal_receipt_verified ? ' ✓ fiscal' : ''}`
    )
  );
  console.log('─────────────────────────────────────────────────────────\n');
}

// Auto-exécution uniquement en lancement CLI direct (`ts-node seed.ts`),
// pas lorsqu'un module applicatif (DevService) importe `runSeed`.
if (require.main === module) {
  runSeed()
    .catch((e) => {
      console.error('❌ Erreur seed :', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
