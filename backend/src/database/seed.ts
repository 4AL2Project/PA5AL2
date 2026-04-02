import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── Données produits ──────────────────────────────────────────────────────────

function daysFromNow(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(23, 59, 0, 0)
  return d
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(12, 0, 0, 0)
  return d
}

const PRODUCTS = [
  // ── Critique (stock élevé, expire très bientôt, ventes faibles)
  { sku: 'DOL-1000',  name: 'Doliprane 1000mg x8',              category: 'Douleur',        brand: 'Doliprane',   expiresIn: 8,   stock: 180, price: 2.50, cost: 1.80 },
  { sku: 'RHI-100',   name: 'Rhinofluimucil Sirop 200ml',        category: 'ORL',            brand: 'Zambon',      expiresIn: 10,  stock: 95,  price: 6.90, cost: 5.00 },
  { sku: 'VIT-C1G',   name: 'Vitamine C 1000mg Effervescent x20',category: 'Vitamines',      brand: 'Bayer',       expiresIn: 13,  stock: 200, price: 4.80, cost: 3.20 },
  { sku: 'CETI-10',   name: 'Cetirizine 10mg x7',                category: 'Allergie',       brand: 'Mylan',       expiresIn: 15,  stock: 130, price: 2.90, cost: 2.00 },
  { sku: 'SER-PHYS',  name: 'Serum Physiologique Unidoses x20',  category: 'ORL',            brand: 'Gilbert',     expiresIn: 17,  stock: 160, price: 3.50, cost: 2.40 },
  // ── Élevé (expire dans 2-4 semaines, stock modéré à fort)
  { sku: 'IBU-400',   name: 'Ibuprofene 400mg x12',              category: 'Douleur',        brand: 'Mylan',       expiresIn: 24,  stock: 110, price: 3.20, cost: 2.20 },
  { sku: 'DOL-PED',   name: 'Doliprane Pediatrique 2,4% Sirop',  category: 'Pediatrie',      brand: 'Doliprane',   expiresIn: 20,  stock: 75,  price: 4.20, cost: 3.00 },
  { sku: 'LACT-12',   name: 'Lacteol Fort 10 sachets',           category: 'Digestion',      brand: 'Lacteol',     expiresIn: 26,  stock: 45,  price: 8.90, cost: 6.20 },
  { sku: 'NIV-HYD',   name: 'Creme Hydratante Intensive 200ml',  category: 'Cosmetique',     brand: 'Nivea',       expiresIn: 28,  stock: 55,  price: 7.50, cost: 5.00 },
  // ── Modéré (1 à 2 mois)
  { sku: 'AMO-500',   name: 'Amoxicilline 500mg x12',            category: 'Antibiotiques',  brand: 'Mylan',       expiresIn: 43,  stock: 60,  price: 5.40, cost: 3.80 },
  { sku: 'OME-3',     name: 'Omega 3 Fort x60',                  category: 'Vitamines',      brand: 'Arkopharma',  expiresIn: 49,  stock: 85,  price: 12.90, cost: 9.00 },
  { sku: 'SHA-AP',    name: 'Shampooing Antipelliculaire 200ml',  category: 'Hygiene',        brand: 'Ducray',      expiresIn: 38,  stock: 40,  price: 9.80, cost: 6.50 },
  { sku: 'CRYO',      name: 'Cryotherapie Spray 300ml',          category: 'Traumatologie',  brand: 'Urgo',        expiresIn: 31,  stock: 35,  price: 14.50, cost: 10.00 },
  // ── Faible (2 à 4 mois, ventes correctes)
  { sku: 'MAG-MAR',   name: 'Magnesium Marin x60',               category: 'Vitamines',      brand: 'Nutrimea',    expiresIn: 75,  stock: 70,  price: 11.50, cost: 8.00 },
  { sku: 'ZINC-15',   name: 'Zinc 15mg x30',                     category: 'Immunite',       brand: 'Nutri & Co',  expiresIn: 61,  stock: 55,  price: 8.50, cost: 6.00 },
  // ── Sûr (4 mois et plus, bonnes ventes)
  { sku: 'ASP-500',   name: 'Aspirine 500mg x20',                category: 'Douleur',        brand: 'Bayer',       expiresIn: 100, stock: 120, price: 2.80, cost: 1.90 },
  { sku: 'PRO-BIO',   name: 'Probiotiques Lactiplus x30',        category: 'Digestion',      brand: 'Lacteol',     expiresIn: 115, stock: 45,  price: 16.90, cost: 12.00 },
  { sku: 'GEL-HYD',   name: 'Gel Hydroalcoolique 500ml',         category: 'Hygiene',        brand: 'Sanytol',     expiresIn: 136, stock: 80,  price: 5.90, cost: 3.50 },
  { sku: 'VIT-D',     name: 'Vitamine D3 1000UI x90',            category: 'Vitamines',      brand: 'Lescuyer',    expiresIn: 153, stock: 60,  price: 9.50, cost: 6.80 },
  { sku: 'BAND-URG',  name: 'Pansements Urgence x10',            category: 'Premiers soins', brand: 'Urgo',        expiresIn: 141, stock: 90,  price: 6.20, cost: 4.00 },
]

// Ventes sur 30 jours par SKU : [quantités sur 5 semaines] — calibrées pour générer tous les niveaux de risque
const SALES_PLAN: Record<string, number[]> = {
  'DOL-1000': [3, 3, 3, 3, 3],     // 0.5/j → critique
  'RHI-100':  [2, 2, 2, 2, 1],     // 0.3/j → critique
  'VIT-C1G':  [6, 6, 6, 6, 6],     // 1.0/j → critique
  'CETI-10':  [4, 4, 4, 5, 4],     // 0.7/j → critique
  'SER-PHYS': [9, 9, 9, 9, 9],     // 1.5/j → critique
  'IBU-400':  [5, 5, 5, 5, 4],     // 0.8/j → élevé
  'DOL-PED':  [3, 3, 3, 3, 3],     // 0.5/j → élevé
  'LACT-12':  [2, 3, 2, 3, 2],     // 0.4/j → élevé
  'NIV-HYD':  [4, 4, 3, 4, 3],     // 0.6/j → élevé
  'AMO-500':  [3, 3, 3, 3, 3],     // 0.5/j → modéré
  'OME-3':    [5, 5, 5, 5, 4],     // 0.8/j → modéré
  'SHA-AP':   [4, 4, 3, 4, 3],     // 0.6/j → modéré
  'CRYO':     [2, 3, 2, 3, 2],     // 0.4/j → modéré
  'MAG-MAR':  [5, 6, 5, 6, 5],     // 0.9/j → faible
  'ZINC-15':  [5, 5, 5, 5, 4],     // 0.8/j → faible
  'ASP-500':  [9, 9, 9, 9, 9],     // 1.5/j → sûr
  'PRO-BIO':  [4, 4, 4, 5, 4],     // 0.7/j → sûr
  'GEL-HYD':  [7, 7, 7, 8, 7],     // 1.2/j → sûr
  'VIT-D':    [4, 4, 3, 4, 3],     // 0.6/j → sûr
  'BAND-URG': [7, 7, 7, 6, 6],     // 1.1/j → sûr
}

// ─── Algorithme de risque (dupliqué pour autonomie du script) ──────────────────

function computeVelocity(saleDates: Date[], quantities: number[]): number {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  let total = 0
  for (let i = 0; i < saleDates.length; i++) {
    if (saleDates[i] >= thirtyDaysAgo) total += quantities[i]
  }
  return total / 30
}

function getDiscount(score: number, days: number): number {
  if (days <= 7 || score >= 0.8) return 50
  if (days <= 14 || score >= 0.6) return 30
  if (days <= 30 || score >= 0.4) return 20
  if (score >= 0.2) return 10
  return 0
}

function classifyRisk(score: number): string {
  if (score <= 0.2) return 'critical'
  if (score <= 0.4) return 'high'
  if (score <= 0.6) return 'moderate'
  if (score <= 0.8) return 'low'
  return 'safe'
}

function calculateRisk(
  stock: number,
  unitPrice: number,
  costPrice: number,
  expiryDate: Date,
  saleDates: Date[],
  quantities: number[],
) {
  const velocity = computeVelocity(saleDates, quantities)
  const now = new Date()
  const days = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000))
  const expected = velocity * days
  const excess = Math.max(0, stock - expected)
  const score = stock > 0 ? Math.min(1, expected / stock) : 0
  const discount = getDiscount(score, days)

  return {
    days_to_expiry: days,
    sales_velocity_30d: velocity,
    expected_sales: expected,
    excess_stock: Math.round(excess),
    risk_score: parseFloat(score.toFixed(4)),
    risk_level: classifyRisk(score),
    suggested_discount: discount,
    recoverable_value: parseFloat((excess * unitPrice * (discount / 100)).toFixed(2)),
    potential_loss: parseFloat((excess * costPrice).toFixed(2)),
  }
}

// ─── Seed principal ────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Démarrage du seed...\n')

  // Idempotence : ne pas recréer si déjà présent
  const existing = await prisma.pharmacy.findFirst({
    where: { email: 'demo@pharmarisk.fr' },
  })
  if (existing) {
    console.log(`✅ Données déjà présentes (pharmacy_id: ${existing.pharmacy_id})`)
    console.log('\n📋 Copiez cette valeur dans frontend/.env.local :')
    console.log(`   NEXT_PUBLIC_PHARMACY_ID=${existing.pharmacy_id}\n`)
    return
  }

  // 1. Créer la pharmacie
  const pharmacy = await prisma.pharmacy.create({
    data: {
      name: 'Pharmacie de la Place',
      email: 'demo@pharmarisk.fr',
      address: '12 Place de la République, 75011 Paris',
      subscription_tier: 'pro',
      last_upload_at: new Date(),
    },
  })
  console.log(`✅ Pharmacie créée : ${pharmacy.name}`)

  // 2. Créer les produits et les ventes
  const skuToProductId: Record<string, string> = {}
  const skuToSales: Record<string, { dates: Date[]; quantities: number[] }> = {}

  for (const p of PRODUCTS) {
    const product = await prisma.product.create({
      data: {
        pharmacy_id: pharmacy.pharmacy_id,
        external_sku: p.sku,
        name: p.name,
        category: p.category,
        brand: p.brand,
        expiry_date: daysFromNow(p.expiresIn),
        stock_quantity: p.stock,
        unit_price: p.price,
        cost_price: p.cost,
      },
    })
    skuToProductId[p.sku] = product.product_id

    // Générer les ventes : 5 entrées hebdomadaires sur les 30 derniers jours
    const plan = SALES_PLAN[p.sku] ?? []
    const salesDates: Date[] = []
    const salesQtys: number[] = []

    for (let week = 0; week < plan.length; week++) {
      const date = daysAgo(28 - week * 7)
      await prisma.sale.create({
        data: {
          product_id: product.product_id,
          pharmacy_id: pharmacy.pharmacy_id,
          sale_date: date,
          quantity_sold: plan[week],
          unit_price_sold: p.price,
        },
      })
      salesDates.push(date)
      salesQtys.push(plan[week])
    }

    skuToSales[p.sku] = { dates: salesDates, quantities: salesQtys }
  }
  console.log(`✅ ${PRODUCTS.length} produits et leurs ventes créés`)

  // 3. Calculer et insérer les analyses de risque
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let analysisCount = 0
  for (const p of PRODUCTS) {
    const productId = skuToProductId[p.sku]
    const { dates, quantities } = skuToSales[p.sku]
    const expiryDate = daysFromNow(p.expiresIn)
    const risk = calculateRisk(p.stock, p.price, p.cost, expiryDate, dates, quantities)

    await prisma.riskAnalysis.create({
      data: {
        product_id: productId,
        pharmacy_id: pharmacy.pharmacy_id,
        analysis_date: today,
        ...risk,
      },
    })
    analysisCount++
  }
  console.log(`✅ ${analysisCount} analyses de risque calculées`)

  // 4. Résumé par niveau de risque
  const analyses = await prisma.riskAnalysis.findMany({
    where: { pharmacy_id: pharmacy.pharmacy_id },
  })
  const byLevel = analyses.reduce<Record<string, number>>((acc, a) => {
    acc[a.risk_level] = (acc[a.risk_level] || 0) + 1
    return acc
  }, {})

  console.log('\n📊 Distribution des risques :')
  for (const [level, count] of Object.entries(byLevel)) {
    const bar = '█'.repeat(count)
    console.log(`   ${level.padEnd(10)} ${bar} (${count})`)
  }

  console.log('\n─────────────────────────────────────────────')
  console.log('🏁 Seed terminé avec succès !\n')
  console.log('📋 Copiez cette valeur dans frontend/.env.local :')
  console.log(`   NEXT_PUBLIC_PHARMACY_ID=${pharmacy.pharmacy_id}`)
  console.log('─────────────────────────────────────────────\n')
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed :', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
