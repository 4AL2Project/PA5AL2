# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Savely** helps pharmacies recover the cash tied up in **dormant stock** (slow-moving parapharmacy/cosmetic products), by turning their LGO stock/sales exports into prioritized actions: B2C resale, charity donation (with Cerfa tax receipt), or no action. It uses a 3-level classification (critical/high/safe).

> **Pivot (2026):** Savely originally targeted product _expiry_ (DLP), but real LGO exports don't contain expiry dates. The product pivoted to **dormant-stock detection** (`days_of_cover`). See `docs/adr/0001-pivot-stock-dormant.md`. New agents should read **`AGENT.md`** first.

## Architecture

```
PA5AL2/                # pnpm workspace (monorepo)
├── frontend/          # Next.js (App Router), React, Tailwind, shadcn/ui
├── backend/           # NestJS 10, Prisma ORM, PostgreSQL 16
├── packages/
│   └── api-client/    # shared API client / types (front ↔ back)
├── data/              # Sample CSV files for testing
├── docs/              # ADR, business analysis, contracts
└── docker-compose.yml # PostgreSQL (root)
```

**Auth & multi-tenant**: JWT + RBAC (`TITULAIRE`/`PREPARATEUR`/`ADMIN_SAVELY`) implemented in `src/modules/auth/` (guards: `jwt-auth`, `roles`, `tenant`; `mask-financial` interceptor). `pharmacy_id` is derived from the token (`TenantGuard`). ⚠️ Some legacy read endpoints still accept `?pharmacy_id=` — verify per controller.

**Login per role**: `TITULAIRE` → magic link · `ADMIN_SAVELY` → password (`POST /api/auth/login`) · `PREPARATEUR` → 6-digit OTP emailed on demand (`POST /api/auth/preparateur/request-code` then `/verify-code`). Préparateurs have **no password**: `User.password` is `NULL` for them and `POST /api/auth/login` rejects the role outright.

**Where the real code lives**: `backend/src/modules/` (`auth`, `analysis`, `upload`, `product`, `dashboard`). **Ignore `backend/dist/contexts/`** — stale build of an abandoned DDD experiment.

## Development Commands

This repo is a **pnpm workspace** (`pnpm@10`). Run commands from the repo root.

```bash
pnpm install                         # install the whole workspace
docker compose up -d                 # PostgreSQL (root docker-compose.yml)

pnpm -F backend prisma:generate      # Prisma client
pnpm -F backend prisma:migrate       # migrations
pnpm -F backend prisma:seed          # seed demo data (idempotent)

pnpm -F backend dev                  # API on :3005
pnpm -F frontend dev                 # Web on :3000
```

Quality (whole repo): `pnpm lint` · `pnpm typecheck` · `pnpm format`.

> A **husky pre-commit hook** runs `lint:fix` + `format` + `typecheck`. The first two **rewrite staged files** (re-`git add` afterwards), and a typecheck failure **blocks the commit**.

### Prisma (direct, from backend/)

```bash
pnpm -F backend exec prisma migrate dev --schema src/database/prisma/schema.prisma --name <migration_name>
pnpm -F backend exec prisma studio --schema src/database/prisma/schema.prisma    # Database GUI
```

## Core Domain: Risk Calculation

The risk engine (`backend/src/modules/analysis/risk-calculator.ts`) is the business-logic heart. Classification stays 3-level (`safe`/`high`/`critical`) → actions (no action / B2C resale / donation).

**Target metric (post-pivot — dormant stock):**

```
days_of_cover  = stock / sales_velocity_30d   (∞ if velocity = 0)
capital_locked = stock × cost_price

  days_of_cover < 60   → 'safe'      → no action
  days_of_cover < 180  → 'high'      → B2C resale
  days_of_cover ≥ 180  → 'critical'  → charity donation
  velocity == 0        → 'critical'
```

> ⚠️ **The current code still implements the OLD expiry-based formula** (`risk_score = velocity × days_to_expiry / stock`). Rewriting it to `days_of_cover` is User Story **US-20** (not done yet). Don't treat the code's formula as the target — see `docs/adr/0001-pivot-stock-dormant.md`.

A daily cron job (2 AM) recalculates risk for all pharmacies.

## Key Files

| File                                              | Purpose                            |
| ------------------------------------------------- | ---------------------------------- |
| `backend/src/modules/analysis/risk-calculator.ts` | Risk classification algorithm      |
| `backend/src/modules/analysis/sales-velocity.ts`  | 30-day velocity calculation        |
| `backend/src/modules/upload/upload.service.ts`    | CSV/Excel import with upsert logic |
| `backend/src/database/prisma/schema.prisma`       | Data models                        |
| `frontend/lib/api.ts`                             | API client with type adapters      |
| `frontend/lib/types.ts`                           | Frontend TypeScript types          |

## API Routes

| Method | Path                   | Description                                                 |
| ------ | ---------------------- | ----------------------------------------------------------- |
| POST   | `/api/upload`          | Upload products/sales CSV or Excel                          |
| GET    | `/api/analysis/latest` | Latest risk analysis per product                            |
| GET    | `/api/products`        | Products with risk data (filters: `risk_level`, `category`) |
| GET    | `/api/dashboard`       | Aggregated pharmacy summary                                 |

## Data Models (Prisma)

- **Pharmacy**: Multi-tenant anchor (email, subscription_tier)
- **User**: belongs to a Pharmacy; role (TITULAIRE/PREPARATEUR/ADMIN_SAVELY), bcrypt password (`NULL` for PREPARATEUR — OTP login), status
- **AuthToken**: magic-link / refresh tokens (hashed)
- **UserOtp**: 6-digit login codes for PREPARATEUR (SHA-256 hashed, TTL 10min, max 5 attempts)
- **Product**: `external_sku` (**required**), `lot_number`, stock, expiry_date, prices
- **Sale**: Historical sales for velocity calculation
- **RiskAnalysis**: Computed risk scores per product per day

Products are upserted by `(pharmacy_id, external_sku)`. Sales are upserted (deduplicated) by `(product_id, sale_date, quantity_sold)` — US-11 done.

**Post-pivot target** (see `docs/ANALYSE-METIER.md`): rename `RiskAnalysis` → `StockAnalysis` (`days_of_cover`, `capital_locked`); add `Action`, `Association`, `Donation` (V1) and `Offer`, `Order`, `ClientB2C` (V2 click & collect). `external_sku` is already required; still TODO: make `expiry_date` optional/deprecated (US-02).

## Environment Variables

**Backend (.env)**

- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — Server port (default: 3005)

**Frontend (.env.local)**

- `NEXT_PUBLIC_API_URL` — Backend URL (default: http://localhost:3005)
- `NEXT_PUBLIC_PHARMACY_ID` — Demo pharmacy UUID: `3c865b32-ba84-483d-8256-2b1d7d5e542e`

## Known Technical Debt

1. **Risk engine not yet pivoted**: code still uses `days_to_expiry`; target is `days_of_cover` (US-20)
2. **Stock-truth tension**: LGO re-import is the source of truth, but click & collect (V2) holds live reservations between imports — unresolved (future ADR 0002)
3. **Legacy `?pharmacy_id=` endpoints**: some read endpoints predate the `TenantGuard` — verify isolation per controller

_Resolved (no longer debt): sales dedup (US-11), test harness + CI (US-06), JWT auth + RBAC + Swagger (US-03/04/05)._

## File Upload Format

**Products CSV**: `external_sku` (req), `name` (req), `stock_quantity` (req), `unit_price` (req), `cost_price` (needed for capital-locked), `lot_number`, `category`, `brand`, `expiry_date` (optional — not in real LGO exports)

**Sales CSV**: `external_sku` (req), `sale_date` (req), `quantity_sold` (req), `unit_price_sold`

## DDD Migration (Abandoned)

An earlier Domain-Driven Design migration (bounded contexts under `src/contexts/`) was **a test and has been abandoned**. Only stale compiled JS remains in `backend/dist/contexts/` — ignore it. The real, active code is in `backend/src/modules/`.

## Reference Docs

- `AGENT.md` — agent quick-start (current source of truth)
- `docs/adr/0001-pivot-stock-dormant.md` — why the engine moves off expiry
- `docs/ANALYSE-METIER.md` — actors, journeys, scope, target entities
- `USER-STORIES.md` — backlog (mirrored in Notion)
- `docs/QUESTIONS-PROJET.md` — scoping decisions
- `docs/WALKING-SKELETON.md` — end-to-end reference flow (US-07)
- `docs/TESTING.md` — how to write & run tests
