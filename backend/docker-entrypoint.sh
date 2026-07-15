#!/bin/sh
set -e

# Les migrations/seed ne sont jouées que par le service porteur du schéma
# (ROLE=api, ou 'all' en mono-service). Les services `worker` et `scheduler`
# démarrent directement pour éviter toute course sur `migrate deploy`.
ROLE="${ROLE:-all}"

if [ "$ROLE" = "api" ] || [ "$ROLE" = "all" ]; then
  echo "→ [ROLE=$ROLE] Application des migrations Prisma..."
  npx prisma migrate deploy

  echo "→ [ROLE=$ROLE] Application du seed (idempotent)..."
  npx prisma db seed
else
  echo "→ [ROLE=$ROLE] Migrations/seed ignorées (portées par le service API)."
fi

echo "→ [ROLE=$ROLE] Démarrage du process..."
exec node dist/main.js
