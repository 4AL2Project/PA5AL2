# Pharma Risk Backend

REST API for pharmacy expiry-risk analysis.

## Stack

- **NestJS** — framework
- **Prisma** — ORM (PostgreSQL)
- **Supabase JWT** — authentication
- **csv-parser / xlsx** — file ingestion

## Setup

```bash
cp .env.example .env
# fill DATABASE_URL and SUPABASE_JWT_SECRET

npm install
npx prisma migrate dev --schema src/database/prisma/schema.prisma
npm run dev
```

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload` | Upload products/sales CSV or Excel |
| GET | `/api/analysis/latest` | Latest risk analysis per product |
| GET | `/api/products?risk_level=&category=` | Products with risk data |
| GET | `/api/dashboard` | Aggregated pharmacy summary |

All routes require `Authorization: Bearer <supabase_jwt>`.

The JWT payload must include a `pharmacy_id` claim.

## File format — products CSV

| Column | Required | Notes |
|--------|----------|-------|
| name | yes | |
| expiry_date | yes | ISO 8601 |
| stock_quantity | yes | integer |
| unit_price | yes | float |
| external_sku | no | used to match sales |
| category | no | |
| brand | no | |
| cost_price | no | float |

## File format — sales CSV

| Column | Required |
|--------|----------|
| external_sku | yes |
| sale_date | yes |
| quantity_sold | yes |
| unit_price_sold | no |

## Cron

Daily job at 02:00 recalculates risk scores for all pharmacies.
