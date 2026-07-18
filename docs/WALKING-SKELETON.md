# Walking Skeleton — flux de référence (US-07)

> Le parcours de bout en bout **déjà fonctionnel**, à prendre comme **patron** pour toute nouvelle feature.
> Si tu ajoutes une feature, calque-la sur ce squelette plutôt que d'inventer un nouveau chemin.

## 1. Le flux complet

```
CSV / XLSX (export LGO)
  │  POST /api/upload   (multipart: products, sales)
  ▼
UploadController → UploadService.processUpload(pharmacyId, productsFile?, salesFile?)
  ├─ importProducts → parseFile → validateProductRow
  │     └─ prisma.product.upsert   (clé: pharmacy_id + external_sku)        [idempotent]
  ├─ importSales    → parseFile → validateSaleRow
  │     └─ prisma.sale.upsert      (clé: product_id + sale_date + quantity) [dédup — US-11]
  ├─ prisma.pharmacy.update(last_upload_at)
  └─ AnalysisService.analyzeAllForPharmacy(pharmacyId)
        └─ pour chaque produit → analyzeProduct
              ├─ computeVelocity(sales)         [sales-velocity.ts — fonction PURE]
              ├─ calculateRisk(product, sales)  [risk-calculator.ts — fonction PURE]  ⚠️ US-20: dormance
              └─ prisma.riskAnalysis.upsert     (clé: product_id + analysis_date) [1 analyse/produit/jour]
  ▼
Lecture via API
  ├─ GET /api/analysis/latest?pharmacy_id=…
  ├─ GET /api/products?pharmacy_id=…&risk_level=…&category=…
  └─ GET /api/dashboard?pharmacy_id=…           (KPIs agrégés)
  ▼
Frontend Next.js  (lib/api.ts → dashboard / table / chart)
```

En parallèle : **`AnalysisJob`** (cron **02h00**) appelle `analyzeAllForPharmacy` pour **toutes** les officines.

## 2. Les couches (et la règle de dépendance)

```
HTTP          controllers + guards + interceptors   ← Auth/RBAC/tenant, validation, Swagger
   │ dépend de
Application   services                              ← orchestration, accès Prisma
   │ dépend de
Domaine       fonctions pures                       ← risk-calculator, sales-velocity
   │                                                  (AUCUNE dépendance infra → 100% testable)
Infra         Prisma / PostgreSQL                   ← persistance
```

**Règle d'or** : le domaine ne connaît ni HTTP ni Prisma. C'est précisément pourquoi `calculateRisk` et `computeVelocity` se testent **sans base de données** (cf. `docs/TESTING.md`).

## 3. Cycle d'une requête protégée

```
Request
  → JwtAuthGuard          (identité)
  → RolesGuard            (rôle TITULAIRE / PREPARATEUR / ADMIN)
  → TenantGuard           (pharmacy_id dérivé du TOKEN, jamais du query)
  → Controller → Service → (fonction pure) → Prisma
  → ResponseInterceptor   (format de réponse standard)
  → JSON
```

`MaskFinancialInterceptor` masque les marges / prix d'achat pour le rôle **PREPARATEUR**.

## 4. Points d'extension — où brancher une nouvelle feature

| Besoin                      | Où                                       | Exemple                                      |
| --------------------------- | ---------------------------------------- | -------------------------------------------- |
| Nouvelle métrique de risque | `risk-calculator.ts` (fonction pure)     | `days_of_cover` (US-20)                      |
| Nouveau type d'action       | `deriveAction()`                         | promo B2C / don / retour fournisseur (US-21) |
| Nouveau format d'import LGO | `csv.parser.ts` + `validation.schema.ts` | colonnes Winpharma / LGPI                    |
| Nouvelle entité métier      | `schema.prisma` + module dédié           | `Donation`, `Association` (US-30)            |
| Nouvel endpoint de lecture  | un controller + service                  | dashboard RSE (US-43)                        |
| Règle d'accès               | guard / décorateur dans `auth/`          | nouveau rôle                                 |

## 5. Pourquoi c'est le patron de référence

Chaque feature future suit le **même trajet** : (1) valider l'entrée, (2) orchestrer dans un service, (3) mettre la logique métier dans une **fonction pure testable**, (4) persister via Prisma, (5) exposer derrière les guards. Reproduis ce squelette — il garantit testabilité (domaine isolé), sécurité (guards systématiques) et cohérence (réponse standardisée).

> ⚠️ Rappel pivot : `risk-calculator.ts` calcule encore le risque sur `days_to_expiry`. La cible est `days_of_cover` (US-20, voir `docs/adr/0001-pivot-stock-dormant.md`). Le _squelette_ ne change pas — seule la fonction pure du domaine sera réécrite.
