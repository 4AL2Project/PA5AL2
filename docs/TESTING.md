# Tests (backend)

Guide d'écriture et d'exécution des tests pour l'équipe. Exigence projet : **TDD** sur le backend.

## Stack & emplacement

- **Jest + ts-jest**. Config : `backend/jest.config.js`.
- Les specs vivent **à côté du code** : `xxx.ts` → `xxx.spec.ts`.

## Lancer les tests

```bash
pnpm -F backend test                     # toute la suite
pnpm -F backend test:watch               # mode watch (TDD)
pnpm -F backend test chemin/du/fichier.spec.ts   # un seul fichier
```

## ⚠️ Piège Prisma — à lire avant de crier au bug

Après un `git pull` qui touche le schéma (ou un changement de branche), **régénère le client Prisma**, sinon les tests **ne compilent pas** :

```bash
pnpm -F backend prisma:generate
```

Le client généré vit dans `node_modules` (non versionné) : un client périmé provoque des erreurs TS du type
`'product_id_sale_date_quantity_sold' does not exist in type 'SaleWhereUniqueInput'`.
La CI le régénère automatiquement ; **ta machine, non**. En cas de doute : `prisma:generate` puis relance.

## Conventions

- **Une spec par unité**, colocalisée.
- **Fonctions pures** (ex. `sales-velocity.ts`, le futur moteur de dormance) → tests unitaires rapides, sans DB. Couvre les **cas limites** : velocity = 0, stock = 0, `cost_price` absent.
- **Services avec Prisma** → mocker le client (modèle : `upload.service.spec.ts`).
- **Guards / interceptors** → modèles : `auth/guards/*.spec.ts`, `auth/interceptors/mask-financial.interceptor.spec.ts`.
- **Cycle TDD** : écris le test qui échoue (**rouge**) → implémente le minimum (**vert**) → refactore.

## CI

`.github/workflows/deploy.yml` lance **lint + format + typecheck + test** sur chaque **push** et chaque **PR** vers `main`/`dev` (le client Prisma est régénéré avant). Le **déploiement** (Render) ne se fait que sur **push** (après merge), jamais sur une PR.
