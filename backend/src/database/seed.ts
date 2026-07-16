import * as bcrypt from 'bcryptjs';

import { prisma } from './client';

const DEMO_USER_EMAIL = 'demo@cosmorisk.fr';
const DEMO_USER_PASSWORD = 'demo1234';

// ─── Données produits ──────────────────────────────────────────────────────────

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

const PRODUCTS = [
  // ── Critique (stock élevé, expire très bientôt, ventes faibles)
  {
    sku: 'CRE-HYD-50',
    lot: 'LOT-2026-A001',
    name: 'Creme Hydratante Visage 50ml',
    category: 'Soins visage',
    brand: 'Vichy',
    expiresIn: 8,
    stock: 180,
    price: 12.9,
    cost: 8.5,
  },
  {
    sku: 'SER-VIT-C',
    lot: 'LOT-2026-A002',
    name: 'Serum Eclat Vitamine C 30ml',
    category: 'Soins visage',
    brand: 'La Roche-Posay',
    expiresIn: 10,
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
    expiresIn: 13,
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
    expiresIn: 15,
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
    expiresIn: 17,
    stock: 160,
    price: 14.9,
    cost: 9.5,
  },
  {
    sku: 'CREME-MAIN-75',
    lot: 'LOT-2026-A006',
    name: 'Creme Mains Reparatrice 75ml',
    category: 'Soins corps',
    brand: 'Avene',
    expiresIn: 12,
    stock: 140,
    price: 6.9,
    cost: 4.2,
  },
  // ── Élevé (expire dans 2-4 semaines, stock modéré à fort)
  {
    sku: 'CREME-CORP-200',
    lot: 'LOT-2026-B001',
    name: 'Creme Corps Nourrissante 200ml',
    category: 'Soins corps',
    brand: 'Nuxe',
    expiresIn: 24,
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
    expiresIn: 20,
    stock: 75,
    price: 18.5,
    cost: 12.0,
  },
  {
    sku: 'GEL-DOUCHE-250',
    lot: 'LOT-2026-B003',
    name: 'Gel Douche Surgras 250ml',
    category: 'Soins corps',
    brand: 'Avene',
    expiresIn: 26,
    stock: 45,
    price: 7.9,
    cost: 4.8,
  },
  {
    sku: 'HUILE-SEC-100',
    lot: 'LOT-2026-B004',
    name: 'Huile Seche Corps 100ml',
    category: 'Soins corps',
    brand: 'Nuxe',
    expiresIn: 28,
    stock: 55,
    price: 22.9,
    cost: 14.5,
  },
  {
    sku: 'DEMA-YEU-125',
    lot: 'LOT-2026-B005',
    name: 'Demaquillant Yeux Bi-Phase 125ml',
    category: 'Soins visage',
    brand: 'Garnier',
    expiresIn: 22,
    stock: 90,
    price: 5.9,
    cost: 3.5,
  },
  // ── Modéré (1 à 2 mois)
  {
    sku: 'SHA-REP-250',
    lot: 'LOT-2026-C001',
    name: 'Shampooing Reparateur 250ml',
    category: 'Cheveux',
    brand: 'Kerastase',
    expiresIn: 43,
    stock: 60,
    price: 28.9,
    cost: 18.0,
  },
  {
    sku: 'COND-LISS-200',
    lot: 'LOT-2026-C002',
    name: 'Apres-Shampooing Lissant 200ml',
    category: 'Cheveux',
    brand: 'L Oreal',
    expiresIn: 49,
    stock: 85,
    price: 11.9,
    cost: 7.5,
  },
  {
    sku: 'ROUGE-LEV-3G',
    lot: 'LOT-2026-C003',
    name: 'Rouge a Levres Satin 3g',
    category: 'Maquillage',
    brand: 'Bourjois',
    expiresIn: 38,
    stock: 40,
    price: 10.9,
    cost: 6.5,
  },
  {
    sku: 'MASCARA-BLK',
    lot: 'LOT-2026-C004',
    name: 'Mascara Volume Noir 9ml',
    category: 'Maquillage',
    brand: 'Maybelline',
    expiresIn: 31,
    stock: 35,
    price: 12.9,
    cost: 8.0,
  },
  {
    sku: 'VERN-ONG-10',
    lot: 'LOT-2026-C005',
    name: 'Vernis a Ongles Rouge 10ml',
    category: 'Maquillage',
    brand: 'Bourjois',
    expiresIn: 46,
    stock: 50,
    price: 9.9,
    cost: 5.5,
  },
  {
    sku: 'SOIN-CHEV-150',
    lot: 'LOT-2026-C006',
    name: 'Soin Cheveux Sans Rincage 150ml',
    category: 'Cheveux',
    brand: 'L Oreal',
    expiresIn: 52,
    stock: 70,
    price: 13.9,
    cost: 8.5,
  },
  // ── Faible (2 à 4 mois, ventes correctes)
  {
    sku: 'CREME-SOL-50',
    lot: 'LOT-2026-D001',
    name: 'Creme Solaire SPF50 50ml',
    category: 'Solaire',
    brand: 'La Roche-Posay',
    expiresIn: 75,
    stock: 70,
    price: 19.9,
    cost: 12.5,
  },
  {
    sku: 'TONER-ROSE-150',
    lot: 'LOT-2026-D002',
    name: 'Lotion Tonique Rose 150ml',
    category: 'Soins visage',
    brand: 'Caudalie',
    expiresIn: 61,
    stock: 55,
    price: 16.9,
    cost: 10.5,
  },
  {
    sku: 'LAIT-CORP-400',
    lot: 'LOT-2026-D003',
    name: 'Lait Corporel Hydratant 400ml',
    category: 'Soins corps',
    brand: 'Nivea',
    expiresIn: 82,
    stock: 100,
    price: 8.9,
    cost: 5.5,
  },
  {
    sku: 'DEO-SPRAY-150',
    lot: 'LOT-2026-D004',
    name: 'Deodorant Spray 24h 150ml',
    category: 'Soins corps',
    brand: 'Nivea',
    expiresIn: 68,
    stock: 85,
    price: 4.9,
    cost: 2.8,
  },
  // ── Sûr (4 mois et plus, bonnes ventes)
  {
    sku: 'EAU-PARF-50',
    lot: 'LOT-2026-E001',
    name: 'Eau de Parfum Florale 50ml',
    category: 'Parfumerie',
    brand: 'Clarins',
    expiresIn: 100,
    stock: 120,
    price: 45.9,
    cost: 28.0,
  },
  {
    sku: 'CREME-NUIT-50',
    lot: 'LOT-2026-E002',
    name: 'Creme de Nuit Anti-Age 50ml',
    category: 'Soins visage',
    brand: 'Vichy',
    expiresIn: 115,
    stock: 45,
    price: 34.9,
    cost: 22.0,
  },
  {
    sku: 'BAUME-LEV-15',
    lot: 'LOT-2026-E003',
    name: 'Baume Levres Hydratant 15ml',
    category: 'Soins levres',
    brand: 'Nuxe',
    expiresIn: 136,
    stock: 80,
    price: 9.9,
    cost: 5.8,
  },
  {
    sku: 'CONTOUR-YEU-15',
    lot: 'LOT-2026-E004',
    name: 'Contour des Yeux 15ml',
    category: 'Soins visage',
    brand: 'Clarins',
    expiresIn: 153,
    stock: 60,
    price: 38.9,
    cost: 24.0,
  },
  {
    sku: 'GOMMAGE-100',
    lot: 'LOT-2026-E005',
    name: 'Gommage Corps Sucre 100ml',
    category: 'Soins corps',
    brand: 'Garnier',
    expiresIn: 141,
    stock: 90,
    price: 8.9,
    cost: 5.2,
  },
  {
    sku: 'BRUME-CORP-200',
    lot: 'LOT-2026-E006',
    name: 'Brume Corps Parfumee 200ml',
    category: 'Parfumerie',
    brand: 'Nuxe',
    expiresIn: 121,
    stock: 110,
    price: 14.9,
    cost: 9.0,
  },
  {
    sku: 'SAVON-MAR-100',
    lot: 'LOT-2026-E007',
    name: 'Savon de Marseille Olive 100g',
    category: 'Soins corps',
    brand: 'Le Petit Marseillais',
    expiresIn: 168,
    stock: 130,
    price: 3.9,
    cost: 2.2,
  },
  {
    sku: 'CREME-PIED-75',
    lot: 'LOT-2026-E008',
    name: 'Creme Pieds Reparatrice 75ml',
    category: 'Soins corps',
    brand: 'Avene',
    expiresIn: 145,
    stock: 65,
    price: 11.9,
    cost: 7.0,
  },
  {
    sku: 'EAU-FLOR-100',
    lot: 'LOT-2026-E009',
    name: 'Eau Florale Bleuet 100ml',
    category: 'Soins visage',
    brand: 'Caudalie',
    expiresIn: 130,
    stock: 75,
    price: 13.9,
    cost: 8.5,
  },
];

// Ventes sur 30 jours par SKU : [quantités sur 5 semaines] — calibrées pour générer tous les niveaux de risque
const SALES_PLAN: Record<string, number[]> = {
  'CRE-HYD-50': [3, 3, 3, 3, 3], // 0.5/j → critique
  'SER-VIT-C': [2, 2, 2, 2, 1], // 0.3/j → critique
  'MIC-EAU-400': [6, 6, 6, 6, 6], // 1.0/j → critique
  'BB-CREAM-30': [4, 4, 4, 5, 4], // 0.7/j → critique
  'FOND-TEINT-30': [9, 9, 9, 9, 9], // 1.5/j → critique
  'CREME-MAIN-75': [3, 3, 3, 3, 3], // 0.5/j → critique
  'CREME-CORP-200': [5, 5, 5, 5, 4], // 0.8/j → élevé
  'MASQ-ARG-75': [3, 3, 3, 3, 3], // 0.5/j → élevé
  'GEL-DOUCHE-250': [2, 3, 2, 3, 2], // 0.4/j → élevé
  'HUILE-SEC-100': [4, 4, 3, 4, 3], // 0.6/j → élevé
  'DEMA-YEU-125': [4, 4, 4, 4, 4], // 0.7/j → élevé
  'SHA-REP-250': [3, 3, 3, 3, 3], // 0.5/j → modéré
  'COND-LISS-200': [5, 5, 5, 5, 4], // 0.8/j → modéré
  'ROUGE-LEV-3G': [4, 4, 3, 4, 3], // 0.6/j → modéré
  'MASCARA-BLK': [2, 3, 2, 3, 2], // 0.4/j → modéré
  'VERN-ONG-10': [3, 3, 3, 3, 3], // 0.5/j → modéré
  'SOIN-CHEV-150': [4, 4, 4, 4, 4], // 0.7/j → modéré
  'CREME-SOL-50': [5, 6, 5, 6, 5], // 0.9/j → faible
  'TONER-ROSE-150': [5, 5, 5, 5, 4], // 0.8/j → faible
  'LAIT-CORP-400': [7, 7, 7, 7, 7], // 1.2/j → faible
  'DEO-SPRAY-150': [5, 5, 5, 5, 5], // 0.8/j → faible
  'EAU-PARF-50': [9, 9, 9, 9, 9], // 1.5/j → sûr
  'CREME-NUIT-50': [4, 4, 4, 5, 4], // 0.7/j → sûr
  'BAUME-LEV-15': [7, 7, 7, 8, 7], // 1.2/j → sûr
  'CONTOUR-YEU-15': [4, 4, 3, 4, 3], // 0.6/j → sûr
  'GOMMAGE-100': [7, 7, 7, 6, 6], // 1.1/j → sûr
  'BRUME-CORP-200': [8, 8, 8, 8, 8], // 1.3/j → sûr
  'SAVON-MAR-100': [9, 9, 9, 9, 9], // 1.5/j → sûr
  'CREME-PIED-75': [5, 5, 5, 5, 5], // 0.8/j → sûr
  'EAU-FLOR-100': [6, 6, 6, 6, 6], // 1.0/j → sûr
};

// ─── Algorithme de risque (dupliqué pour autonomie du script) ──────────────────

function computeVelocity(saleDates: Date[], quantities: number[]): number {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  let total = 0;
  for (let i = 0; i < saleDates.length; i++) {
    if (saleDates[i] >= thirtyDaysAgo) total += quantities[i];
  }
  return total / 30;
}

// US-20 : classification basée sur days_of_cover (pivot stock dormant)
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
  _expiryDate: Date,
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

// ─── Seed principal ────────────────────────────────────────────────────────────

// UUID fixe de la pharmacie de démonstration : aligné sur NEXT_PUBLIC_PHARMACY_ID
// pour que le frontend fonctionne sans configuration manuelle après le seed.
const DEMO_PHARMACY_ID = '3c865b32-ba84-483d-8256-2b1d7d5e542e';

const ADMIN_PHARMACY_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_EMAIL = 'admin@savely.fr';
const ADMIN_PASSWORD = 'admin1234';

// Les 6 catégories système partagées (pharmacy_id = null). "Autres" (slug
// `autres`) sert de repli automatique à la création d'une Offer sans catégorie.
const SYSTEM_CATEGORIES: { name: string; slug: string }[] = [
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
    // Idempotence corrective : on s'assure que le user a bien le bon rôle,
    // le bon statut et un mot de passe valide, même s'il a été créé avant
    // l'introduction du rôle ADMIN_SAVELY.
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
      console.log(`✅ Admin corrigé : ${ADMIN_EMAIL} (rôle/statut réalignés)`);
    } else {
      console.log(`✅ Admin déjà présent : ${ADMIN_EMAIL}`);
    }
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

// ─── Associations de démonstration (cycle don) ───────────────────────────────
// 3 assos aux rayons d'action différents, dont une non fiable (historique de
// retraits manqués) pour illustrer le score de fiabilité du matching.
// Position : autour de la pharmacie démo (Place de la République, Paris 11e).

const DEMO_ASSOCIATIONS: {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  lat?: number;
  lng?: number;
  action_radius_km?: number;
  categories: string[];
  pickup_sla_days?: number;
  pickup_windows?: { day: string; start: string; end: string }[];
  contact_email?: string;
  contact_phone?: string;
  rna_or_siren?: string;
  // Champs admin
  status?: string;
  agrement_numero?: string;
  agrement_valide?: boolean;
  is_onboarded?: boolean;
  description?: string;
}[] = [
  // ── Active + agrément validé + onboardée (cas nominal)
  {
    name: 'Solidarité Quartier République',
    address: '8 rue du Faubourg du Temple',
    city: 'Paris',
    postal_code: '75011',
    lat: 48.868,
    lng: 2.366,
    action_radius_km: 5,
    categories: ['cosmetiques', 'hygiene'],
    pickup_sla_days: 5,
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
    agrement_numero: 'W751000001',
    agrement_valide: true,
    is_onboarded: true,
    description:
      'Association de quartier spécialisée dans le soin aux personnes vulnérables.',
  },
  // ── Active + agrément validé + onboardée + bonne fiabilité (IDF large)
  {
    name: 'Entraide Île-de-France',
    address: '3 avenue de la Résistance',
    city: 'Créteil',
    postal_code: '94000',
    lat: 48.7904,
    lng: 2.4556,
    action_radius_km: 60,
    categories: ['cosmetiques', 'parapharmacie', 'hygiene'],
    pickup_sla_days: 7,
    pickup_windows: [
      { day: 'TUE', start: '10:00', end: '16:00' },
      { day: 'THU', start: '10:00', end: '16:00' },
    ],
    contact_email: 'dons@entraide-idf.org',
    contact_phone: '0140000002',
    rna_or_siren: 'W941000002',
    agrement_numero: 'W941000002',
    agrement_valide: true,
    is_onboarded: true,
    description: "Réseau d'entraide couvrant toute l'Île-de-France.",
  },
  // ── Active + pas d'agrément + onboardée (fiabilité faible — rate ses créneaux)
  {
    name: 'Les Oubliés du Retrait',
    address: '21 boulevard Voltaire',
    city: 'Paris',
    postal_code: '75011',
    lat: 48.863,
    lng: 2.37,
    action_radius_km: 30,
    categories: ['cosmetiques', 'autre'],
    pickup_sla_days: 10,
    contact_email: 'contact@oublies-retrait.org',
    contact_phone: '0140000003',
    rna_or_siren: 'W751000003',
    agrement_valide: false,
    is_onboarded: true,
  },
  // ── Active + agrément manquant + jamais invitée
  {
    name: 'Maison des Aidants 93',
    address: '45 avenue Henri Barbusse',
    city: 'Saint-Denis',
    postal_code: '93200',
    lat: 48.9362,
    lng: 2.3547,
    action_radius_km: 20,
    categories: ['hygiene', 'parapharmacie'],
    contact_email: 'contact@mda93.fr',
    contact_phone: '0148000004',
    agrement_valide: false,
    is_onboarded: false,
  },
  // ── En attente de validation (inscrite via landing page)
  {
    name: 'Partage et Dignité Banlieue',
    address: '12 rue Aristide Briand',
    city: 'Montreuil',
    postal_code: '93100',
    lat: 48.8637,
    lng: 2.4427,
    action_radius_km: 15,
    categories: ['cosmetiques', 'hygiene'],
    contact_email: 'asso@partage-dignite.org',
    contact_phone: '0148000005',
    rna_or_siren: 'W931000005',
    agrement_numero: 'W931000005',
    agrement_valide: false,
    is_onboarded: false,
    status: 'EN_ATTENTE_VALIDATION',
  },
  // ── Active + agrément validé + invitation envoyée mais pas encore onboardée
  {
    name: 'Centre Social Belleville',
    address: '4 rue Rampal',
    city: 'Paris',
    postal_code: '75019',
    lat: 48.8726,
    lng: 2.3765,
    action_radius_km: 10,
    categories: ['cosmetiques', 'parapharmacie', 'hygiene', 'autre'],
    contact_email: 'dons@cs-belleville.fr',
    contact_phone: '0140000006',
    rna_or_siren: 'W751000006',
    agrement_numero: 'W751000006',
    agrement_valide: true,
    is_onboarded: false,
    description: 'Centre social multi-services du 19e arrondissement.',
  },
  // ── Suspendue (2 pickups ratés)
  {
    name: 'Aide & Partage 75',
    address: '88 rue de la Roquette',
    city: 'Paris',
    postal_code: '75011',
    lat: 48.855,
    lng: 2.378,
    action_radius_km: 8,
    categories: ['hygiene', 'autre'],
    contact_email: 'contact@aide-partage75.fr',
    contact_phone: '0140000007',
    agrement_numero: 'W751000007',
    agrement_valide: true,
    is_onboarded: true,
    status: 'SUSPENDUE',
  },
  // ── Active + agrément validé + onboardée (associée à Versailles — rayon large)
  {
    name: 'Croix Verte Versailles',
    address: '15 rue Carnot',
    city: 'Versailles',
    postal_code: '78000',
    lat: 48.8053,
    lng: 2.1346,
    action_radius_km: 40,
    categories: ['cosmetiques', 'parapharmacie'],
    pickup_sla_days: 5,
    pickup_windows: [
      { day: 'MON', start: '09:00', end: '12:00' },
      { day: 'WED', start: '09:00', end: '12:00' },
      { day: 'FRI', start: '09:00', end: '12:00' },
    ],
    contact_email: 'dons@croix-verte-versailles.fr',
    contact_phone: '0139000008',
    rna_or_siren: 'W780000008',
    agrement_numero: 'W780000008',
    agrement_valide: true,
    is_onboarded: true,
    description: "Distribution de produits de soin et d'hygiène en Yvelines.",
  },
];

async function seedAssociations() {
  let created = 0;
  let updated = 0;
  const byName = new Map<string, string>();
  for (const a of DEMO_ASSOCIATIONS) {
    const {
      status,
      agrement_numero,
      agrement_valide,
      is_onboarded,
      description,
      ...rest
    } = a;
    const existing = await prisma.association.findFirst({
      where: { name: a.name },
    });
    if (existing) {
      // Mise à jour idempotente des nouveaux champs admin
      await prisma.association.update({
        where: { association_id: existing.association_id },
        data: {
          agrement_numero: agrement_numero ?? existing.agrement_numero,
          agrement_valide: agrement_valide ?? existing.agrement_valide,
          is_onboarded: is_onboarded ?? existing.is_onboarded,
          description: description ?? existing.description,
          status: status ?? existing.status,
        },
      });
      byName.set(a.name, existing.association_id);
      updated++;
      continue;
    }
    const asso = await prisma.association.create({
      data: {
        ...rest,
        status: status ?? 'ACTIVE',
        email_verified_at: new Date(),
        agrement_numero: agrement_numero ?? null,
        agrement_valide: agrement_valide ?? false,
        is_onboarded: is_onboarded ?? false,
        description: description ?? null,
      },
    });
    byName.set(a.name, asso.association_id);
    created++;
  }
  console.log(
    `✅ Associations : ${created} créée(s), ${updated} mise(s) à jour`
  );

  // Historique de non-fiabilité : 3 retraits manqués pour la 3e asso.
  // Rattaché à la pharmacie admin (toujours présente) — seule la fiabilité
  // (ratio RETIREE / NON_RECUPEREE toutes officines) compte pour le matching.
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
          },
        });
      }
      console.log(
        '✅ Historique de non-fiabilité créé (Les Oubliés du Retrait)'
      );
    }
  }
}

export async function runSeed() {
  console.log('🌱 Démarrage du seed...\n');

  await seedAdmin();

  await seedCategories();

  await seedAssociations();

  // Idempotence : ne pas recréer si déjà présent
  const existing = await prisma.pharmacy.findFirst({
    where: { email: 'demo@cosmorisk.fr' },
  });
  if (existing) {
    // Idempotence corrective : géoloc + créneaux requis par le cycle don
    if (existing.lat == null || existing.donation_pickup_windows == null) {
      await prisma.pharmacy.update({
        where: { pharmacy_id: existing.pharmacy_id },
        data: {
          lat: existing.lat ?? 48.8676,
          lng: existing.lng ?? 2.3631,
          donation_pickup_windows: existing.donation_pickup_windows ?? [
            { day: 'TUE', start: '14:00', end: '17:00' },
            { day: 'THU', start: '09:00', end: '12:00' },
          ],
        },
      });
      console.log('✅ Pharmacie démo réalignée (géoloc + créneaux dons)');
    }
    console.log(
      `✅ Données déjà présentes (pharmacy_id: ${existing.pharmacy_id})`
    );
    return;
  }

  // 1. Créer la pharmacie
  const pharmacy = await prisma.pharmacy.create({
    data: {
      pharmacy_id: DEMO_PHARMACY_ID,
      name: 'Institut Beaute Demo',
      email: 'demo@cosmorisk.fr',
      address: '12 Place de la République, 75011 Paris',
      lat: 48.8676,
      lng: 2.3631,
      // Créneaux de récupération des dons (modifiables dans Paramètres)
      donation_pickup_windows: [
        { day: 'TUE', start: '14:00', end: '17:00' },
        { day: 'THU', start: '09:00', end: '12:00' },
      ],
      subscription_tier: 'pro',
      last_upload_at: new Date(),
    },
  });
  console.log(`✅ Pharmacie créée : ${pharmacy.name}`);

  // 1bis. Créer un utilisateur de démonstration (US-03)
  const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 12);
  await prisma.user.create({
    data: {
      pharmacy_id: pharmacy.pharmacy_id,
      email: DEMO_USER_EMAIL,
      password: passwordHash,
      status: 'ACTIVE',
    },
  });
  console.log(
    `✅ Utilisateur démo créé : ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD}`
  );

  // 2. Créer les produits et les ventes
  const skuToProductId: Record<string, string> = {};
  const skuToSales: Record<string, { dates: Date[]; quantities: number[] }> =
    {};

  for (const p of PRODUCTS) {
    const product = await prisma.product.create({
      data: {
        pharmacy_id: pharmacy.pharmacy_id,
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
    skuToProductId[p.sku] = product.product_id;

    // Générer les ventes : 5 entrées hebdomadaires sur les 30 derniers jours
    const plan = SALES_PLAN[p.sku] ?? [];
    const salesDates: Date[] = [];
    const salesQtys: number[] = [];

    for (let week = 0; week < plan.length; week++) {
      const date = daysAgo(28 - week * 7);
      await prisma.sale.create({
        data: {
          product_id: product.product_id,
          pharmacy_id: pharmacy.pharmacy_id,
          sale_date: date,
          quantity_sold: plan[week],
          unit_price_sold: p.price,
        },
      });
      salesDates.push(date);
      salesQtys.push(plan[week]);
    }

    skuToSales[p.sku] = { dates: salesDates, quantities: salesQtys };
  }
  console.log(`✅ ${PRODUCTS.length} produits et leurs ventes créés`);

  // 3. Calculer et insérer les analyses de risque
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let analysisCount = 0;
  for (const p of PRODUCTS) {
    const productId = skuToProductId[p.sku];
    const { dates, quantities } = skuToSales[p.sku];
    const expiryDate = daysFromNow(p.expiresIn);
    const risk = calculateRisk(
      p.stock,
      p.price,
      p.cost,
      expiryDate,
      dates,
      quantities
    );

    await prisma.riskAnalysis.create({
      data: {
        product_id: productId,
        pharmacy_id: pharmacy.pharmacy_id,
        analysis_date: today,
        ...risk,
      },
    });
    analysisCount++;
  }
  console.log(`✅ ${analysisCount} analyses de risque calculées`);

  // 4. Résumé par niveau de risque
  const analyses = await prisma.riskAnalysis.findMany({
    where: { pharmacy_id: pharmacy.pharmacy_id },
  });
  const byLevel = analyses.reduce<Record<string, number>>((acc, a) => {
    acc[a.risk_level] = (acc[a.risk_level] || 0) + 1;
    return acc;
  }, {});

  console.log('\n📊 Distribution des risques :');
  for (const [level, count] of Object.entries(byLevel)) {
    const bar = '█'.repeat(count);
    console.log(`   ${level.padEnd(10)} ${bar} (${count})`);
  }

  console.log('\n─────────────────────────────────────────────');
  console.log('🏁 Seed terminé avec succès !\n');
  console.log('🔑 Comptes de connexion :');
  console.log(`   Admin     : ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`   Titulaire : ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD}`);
  console.log('─────────────────────────────────────────────\n');
}

// Exécution CLI (`pnpm -F backend prisma:seed`) uniquement : importé depuis
// l'API (module `dev`), le seed ne doit ni fermer la connexion partagée ni
// tuer le process.
if (require.main === module) {
  runSeed()
    .catch((e) => {
      console.error('❌ Erreur seed :', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
