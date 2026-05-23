# Pharma Risk Backend

REST API for pharmacy expiry-risk analysis.

## Stack

- **NestJS** — framework
- **Prisma** — ORM
- **PostgreSQL 16** — via Docker
- **csv-parser / xlsx** — file ingestion

## Setup

```bash
# 1. Start the database
docker compose up -d

# 2. Configure environment
cp .env.example .env   # default values already match docker-compose

# 3. Install dependencies
npm install

# 4. Run migrations and generate Prisma client
npx prisma migrate dev --schema src/database/prisma/schema.prisma --name init

# 5. Start dev server
npm run dev
```

Server runs on `http://localhost:3000`.

## API

All routes accept `?pharmacy_id=<uuid>` as a required query parameter.

| Method | Path                   | Query params                              | Description                        |
| ------ | ---------------------- | ----------------------------------------- | ---------------------------------- |
| POST   | `/api/upload`          | `pharmacy_id`                             | Upload products/sales CSV or Excel |
| GET    | `/api/analysis/latest` | `pharmacy_id`                             | Latest risk analysis per product   |
| GET    | `/api/products`        | `pharmacy_id`, `risk_level?`, `category?` | Products with risk data            |
| GET    | `/api/dashboard`       | `pharmacy_id`                             | Aggregated pharmacy summary        |

## File format — products CSV

| Column         | Required | Notes               |
| -------------- | -------- | ------------------- |
| name           | yes      |                     |
| expiry_date    | yes      | ISO 8601            |
| stock_quantity | yes      | integer             |
| unit_price     | yes      | float               |
| external_sku   | no       | used to match sales |
| category       | no       |                     |
| brand          | no       |                     |
| cost_price     | no       | float               |

## File format — sales CSV

| Column          | Required |
| --------------- | -------- |
| external_sku    | yes      |
| sale_date       | yes      |
| quantity_sold   | yes      |
| unit_price_sold | no       |

## Cron

Daily job at 02:00 recalculates risk scores for all pharmacies.
