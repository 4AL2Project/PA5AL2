#!/bin/sh
set -e

echo "→ Application des migrations Prisma..."
npx prisma migrate deploy

echo "→ Application du seed (idempotent)..."
npx prisma db seed

echo "→ Démarrage de l'API..."
exec node dist/main.js
