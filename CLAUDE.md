# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Savely** is a pharmacy risk analysis system that helps pharmacies detect and manage expiring pharmaceutical/cosmetic products. It uses a 3-level risk classification (critical/high/safe) to suggest actions: donations, B2C promotions, or no action.

## Architecture

```
PA5AL2/
├── frontend/          # Next.js 16 (App Router), React 19, Tailwind, shadcn/ui
├── backend/           # NestJS 10, Prisma ORM, PostgreSQL 16
├── data/              # Sample CSV files for testing
└── docs/              # Project documentation
```

**Multi-tenant design**: All API endpoints require `?pharmacy_id=<uuid>` query parameter.

## Development Commands

### Backend (port 3005)

```bash
cd backend
docker compose up -d                    # Start PostgreSQL
npm install
npm run prisma:generate                 # Generate Prisma client
npm run prisma:migrate                  # Run migrations
npm run prisma:seed                     # Seed demo data (idempotent)
npm run dev                             # Start dev server
```

### Frontend (port 3000)

```bash
cd frontend
npm install
npm run dev                             # Start dev server
npm run build                           # Production build
npm run lint                            # ESLint
```

### Prisma Commands (from backend/)

```bash
npx prisma migrate dev --schema src/database/prisma/schema.prisma --name <migration_name>
npx prisma studio --schema src/database/prisma/schema.prisma    # Database GUI
```

## Core Domain: Risk Calculation

The risk engine (`backend/src/modules/analysis/risk-calculator.ts`) is the business logic heart:

```
Risk Score = Expected Sales / Total Stock  (0.0 to 1.0)

Expected Sales = Sales Velocity (30d) × Days to Expiry

Classification:
  score > 0.70  → 'safe'     → No action
  score > 0.30  → 'high'     → B2C promotion
  score ≤ 0.30  → 'critical' → Donation/disposal
```

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
- **Product**: SKU, stock, expiry_date, prices (linked to Pharmacy)
- **Sale**: Historical sales for velocity calculation
- **RiskAnalysis**: Computed risk scores per product per day

Products are upserted by `(pharmacy_id, external_sku)`. Sales are created (not deduplicated — known bug).

## Environment Variables

**Backend (.env)**

- `DATABASE_URL` — PostgreSQL connection string
- `PORT` — Server port (default: 3005)

**Frontend (.env.local)**

- `NEXT_PUBLIC_API_URL` — Backend URL (default: http://localhost:3005)
- `NEXT_PUBLIC_PHARMACY_ID` — Demo pharmacy UUID: `3c865b32-ba84-483d-8256-2b1d7d5e542e`

## Known Technical Debt

1. **Sales deduplication**: Re-importing sales doubles records → skews velocity
2. **No test coverage**: Zero unit/integration tests
3. **No real auth**: Multi-tenant isolation only via query param (insecure)

## File Upload Format

**Products CSV**: `external_sku` (req), `name` (req), `expiry_date` (req), `stock_quantity` (req), `unit_price` (req), `lot_number`, `category`, `brand`, `cost_price`

**Sales CSV**: `external_sku` (req), `sale_date` (req), `quantity_sold` (req), `unit_price_sold`

## DDD Migration (In Progress)

The backend is transitioning to Domain-Driven Design with:

- `backend/src/core/domain/` — Base classes for value objects and domain events
- Eventual migration of modules to follow aggregate/repository patterns

See `docs/QUESTIONS-PROJET.md` for detailed architectural decisions.
