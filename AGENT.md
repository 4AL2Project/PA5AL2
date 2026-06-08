# AGENT.md

Guide d'amorçage pour les agents IA travaillant sur **Savely**. Lis ce fichier en premier.
Pour le détail métier, voir `docs/` (pointeurs en bas). En cas de divergence avec `CLAUDE.md`, **ce fichier fait foi** (CLAUDE.md précède le pivot et contient des sections obsolètes).

---

## 1. Le projet en une phrase

Savely transforme les **exports de stock et de ventes** d'une officine (CSV/XLSX du LGO) en un **plan d'actions priorisé** pour récupérer la trésorerie immobilisée dans le **stock dormant** — en écoulant (B2C) ou en donnant (associations, reçu fiscal Cerfa) les produits qui ne tournent pas. Multi-tenant, **données produit uniquement** (jamais de donnée patient — RGPD).

## 2. ⚠️ Pivot en cours (à connaître avant de toucher au moteur)

Le produit a **pivoté** de la *péremption* (DLP) vers le *stock dormant* — parce que les exports LGO réels ne contiennent pas la date de péremption. Voir `docs/adr/0001-pivot-stock-dormant.md`.

- **Cible** : `days_of_cover = stock / velocity_30d` (seuils <60j safe / <180j high / ≥180j critical / velocity=0 → critical).
- **MAIS le code actuel** (`backend/src/modules/analysis/risk-calculator.ts`) **implémente encore l'ancienne formule** basée sur `days_to_expiry`. La réécriture est la User Story **US-20** (statut *À faire*). Ne te fie pas à la formule du code comme si elle était la cible.

## 3. Architecture & où vit le vrai code

Monorepo **pnpm workspace** :

```
PA5AL2/
├── backend/    # NestJS 10 + Prisma + PostgreSQL — le "cerveau"
├── frontend/   # Next.js (App Router) + Tailwind — dashboard officine
├── packages/
│   └── api-client/   # client/types d'API partagés (front ↔ back)
├── docs/       # ADR, analyse métier, contrats — source de vérité produit
└── data/       # CSV d'exemple pour tests
```

- ✅ **Le vrai code backend est dans `backend/src/modules/`** (`analysis`, `upload`, `product`, `dashboard`).
- ❌ **Ignore `backend/dist/contexts/`** : vestige compilé d'une migration DDD **abandonnée** (c'était un test). Ne pas s'en inspirer, ne pas le réactiver.

## 4. Setup & commandes (depuis la racine)

```bash
pnpm install                      # installe tout le workspace
docker compose up -d              # PostgreSQL (docker-compose.yml racine)

pnpm -F backend prisma:generate   # client Prisma
pnpm -F backend prisma:migrate    # migrations
pnpm -F backend prisma:seed       # données de démo (idempotent)

pnpm -F backend dev               # API sur :3005
pnpm -F frontend dev              # Web sur :3000
```

Qualité (tout le repo) :

```bash
pnpm lint        # eslint -r
pnpm typecheck   # tsc -r
pnpm format      # prettier --write .
```

Schéma Prisma : `backend/src/database/prisma/schema.prisma` (passer `--schema` à toute commande `prisma` directe).

## 5. Conventions & garde-fous

- **Hook pre-commit (husky)** : lance `lint:fix` + `format` + `typecheck`. Les deux premiers **modifient les fichiers après staging** → re-`git add` si besoin ; un échec de typecheck **bloque le commit**.
- **En-tête de fichier** : chaque fichier source porte le nom du développeur + numéro de version (exigence école).
- **GitFlow** : `main` / `dev` / `feat/*`. Branche par dev. Ne jamais committer/pusher sans demande explicite.
- **TDD attendu** sur le backend (Jest). Le moteur de dormance (US-20) doit être couvert de tests (cas limites : velocity=0, stock=0, cost_price absent).
- **Multi-tenant** : aujourd'hui via `?pharmacy_id=<uuid>` en query. ⚠️ **Pas encore d'auth réelle** (JWT/RBAC = US-03/US-04, non faits) → isolation non sécurisée pour l'instant.

## 6. Modèle de domaine (réf. rapide)

Entités actuelles : `Pharmacy`, `Product`, `Sale`, `RiskAnalysis`.
Cible post-pivot (cf. `docs/ANALYSE-METIER.md`) :
- Renommer `RiskAnalysis` → `StockAnalysis` (`days_of_cover`, `capital_immobilise`).
- Nouvelles : `Action`, `Association`, `Donation` (V1) ; `Offer`, `Order`, `ClientB2C` (V2 click & collect).
- `Product.external_sku` doit devenir **obligatoire** ; `expiry_date` optionnel/déprécié ; `lot_number` optionnel.

## 7. Dette & pièges connus

- 🐛 **Déduplication des ventes** : `upload.service.ts` fait un `create` sec sur les ventes → ré-importer un fichier **double les ventes** et fausse la vélocité (US-11). Le plus impactant.
- ⚠️ **Vérité du stock** (tension non tranchée) : la source de vérité est l'export LGO ré-importé, mais le click & collect (V2) pose des *holds* vivants entre deux imports. Décision d'archi à acter (futur ADR 0002).
- **Pas de tests** sur le code existant malgré l'exigence TDD.
- **Périmètre** : V1 = Détection + Don + Admin minimal ; V2 feature-flaggé = Click & Collect. Ne pas démarrer du V2 sans confirmation.

## 8. Documents de référence

| Doc | Contenu |
| --- | --- |
| `docs/adr/0001-pivot-stock-dormant.md` | Le *pourquoi* du pivot (décision d'archi) |
| `docs/ANALYSE-METIER.md` | Acteurs, parcours, périmètre, entités — le *quoi* |
| `USER-STORIES.md` | Backlog (aussi sur Notion : page « Savely — Suivi de Projet ») |
| `docs/QUESTIONS-PROJET.md` | Décisions de cadrage (CSV, doublons, B2C, images…) |
| `docs/RBAC-PATTERN.md`, `docs/API-CONTRACT.md`, `docs/HEBERGEMENT.md` | Patterns transverses |
| `CLAUDE.md` | Guide historique — ⚠️ sections moteur/DDD obsolètes depuis le pivot |

## 9. Équipe (ownership)

- **Gilles** — backend (API, logique métier).
- **Roger** — transverse / fondations (devops, front, back) ; pose les fondations qui débloquent les autres.
- **Clément** — mobile (Flutter, click & collect).
