# Savely

Pharmacy risk analysis system with 3-level risk classification (critical/high/safe).

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, shadcn/ui
- **Backend**: NestJS 10, Prisma ORM, PostgreSQL

## Setup

```bash
# Install dependencies
pnpm install

# Start PostgreSQL (backend)
cd backend && docker compose up -d

# Generate Prisma client & run migrations
cd backend && pnpm prisma:generate && pnpm prisma:migrate

# Seed demo data
cd backend && pnpm prisma:seed
```

## Development

```bash
# Both apps in parallel
pnpm dev

# Frontend only (port 3000)
pnpm -F frontend dev

# Backend only (port 3005)
pnpm -F backend dev
```

## Commands

```bash
# Lint (ESLint + TypeScript)
pnpm lint
pnpm lint --fix        # auto-fix

# Format (Prettier)
pnpm format            # format all files
pnpm format:check     # check only

# TypeScript check
pnpm typecheck

# Backend-specific
cd backend && pnpm prisma:studio    # Database GUI
```

## Project Structure

```
PA5AL2/
├── frontend/          # Next.js 16 (App Router)
├── backend/           # NestJS 10, Prisma, PostgreSQL
├── docs/              # Architecture decisions, hosting notes
├── data/              # Sample CSV files for testing
├── test-books/        # Test case books per user story
├── pnpm-workspace.yaml
└── package.json
```

> The mobile app (React Native / Clément) lives in a separate repository.

## Branching strategy (GitFlow)

| Branch       | Purpose                                                    |
| ------------ | ---------------------------------------------------------- |
| `main`       | Production-ready code — merged only via PR after review    |
| `dev`        | Integration branch — all feature branches merge here first |
| `feat/US-XX` | One branch per user story, branched off `dev`              |

**Workflow**: `feat/US-XX` → PR → `dev` → PR → `main`

Branch naming: `feat-US-01`, `feat-US-02`, etc. (dash separators, US id uppercase).
