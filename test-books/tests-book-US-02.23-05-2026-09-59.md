# Rapport d'exécution — US-02 (23-05-2026 09:59)

> Source : `test-books/test-books-US-02.md`

## Contexte d'exécution

- **Docker Desktop** : indisponible (« Docker Desktop is unable to start » lors de `docker compose ps`).
- **PostgreSQL local (port 5432)** : injoignable (`nc -z localhost 5432` → down).
- **Backend (port 3005)** et **frontend (port 3000)** : non démarrés.
- US-02 est **purement backend / base de données** (schéma, migration, seed) → pas d'UI à tester en Playwright. Les TC sont donc validés par lecture du schéma, du fichier de migration, du seed, et par les outils statiques (Prisma generate, `tsc --noEmit`, ESLint).

| Outil                         | Résultat                                    |
| ----------------------------- | ------------------------------------------- |
| `npx prisma generate`         | ✅ Prisma Client v5.22.0 généré sans erreur |
| `npm run typecheck` (backend) | ✅ tsc --noEmit passe                       |
| `npm run lint` (backend)      | ✅ ESLint sans erreur                       |
| `npm run lint` (frontend)     | ✅ ESLint sans erreur                       |

---

## TC-01 — Migration versionnée appliquée sans erreur

**Statut** : ⚠️ **NON EXÉCUTÉ END-TO-END** (Docker/Postgres indisponibles) — ✅ vérifié statiquement.

| #   | Étape                                                               | Résultat                                                                                                  |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | `npx prisma migrate reset …`                                        | ⚠️ non exécuté (DB down)                                                                                  |
| 2   | Migration `20260523095539_us02_schema_socle` présente et versionnée | ✅ fichier créé : `backend/src/database/prisma/migrations/20260523095539_us02_schema_socle/migration.sql` |
| 3   | Inspection schéma                                                   | ✅ Prisma generate accepte le schéma — `external_sku` NOT NULL et `lot_number` présents                   |

**À rejouer** une fois Docker / Postgres opérationnels : `npx prisma migrate reset --schema src/database/prisma/schema.prisma --force`.

---

## TC-02 — `external_sku` est obligatoire sur les produits

**Statut** : ✅ **OK (statique)**.

| #   | Étape             | Résultat                                                                                        |
| --- | ----------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Schéma `Product`  | ✅ `external_sku String` (sans `?`) — `schema.prisma:27`                                        |
| 2   | Migration SQL     | ✅ `ALTER TABLE "Product" ALTER COLUMN "external_sku" SET NOT NULL`                             |
| 3   | Validation upload | ✅ `validation.schema.ts` rejette une ligne sans `external_sku` (`Row N: missing external_sku`) |

---

## TC-03 — Contrainte d'unicité `(pharmacy_id, external_sku)`

**Statut** : ✅ **OK (statique)**.

| #   | Étape            | Résultat                                                                                                                                   |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Schéma `Product` | ✅ `@@unique([pharmacy_id, external_sku])` — `schema.prisma:43`                                                                            |
| 2   | Migration SQL    | ✅ `CREATE UNIQUE INDEX "Product_pharmacy_id_external_sku_key" ON "Product"("pharmacy_id", "external_sku")` ; ancien index simple supprimé |
| 3   | Côté upload      | ✅ `upload.service.ts` utilise `findUnique` puis `update`/`create` via la clé composite — plus de risque d'insertion en doublon            |

---

## TC-04 — Champ `lot_number` disponible sur les produits

**Statut** : ✅ **OK (statique)**.

| #   | Étape                | Résultat                                                                                        |
| --- | -------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Colonne `lot_number` | ✅ ajoutée dans le schéma (`schema.prisma:28`) et la migration (`ADD COLUMN "lot_number" TEXT`) |
| 2   | Valeur fournie       | ✅ le seed alimente un `lot_number` (`LOT-2026-A001`, etc.) pour chaque produit                 |
| 3   | Optionnel            | ✅ colonne nullable (`String?`) — création possible sans valeur                                 |

---

## TC-05 — Seed 1 officine + ~30 produits avec ventes

**Statut** : ✅ **OK (statique)** — exécution end-to-end ⚠️ non rejouée (DB down).

| #   | Étape                 | Résultat                                                                                       |
| --- | --------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | `npm run prisma:seed` | ⚠️ non exécuté (DB down)                                                                       |
| 2   | 1 pharmacie           | ✅ `DEMO_PHARMACY_ID` toujours créé une seule fois (`prisma.pharmacy.findFirst` + idempotence) |
| 3   | ~30 produits          | ✅ 30 produits dans `PRODUCTS` (vérifié : `grep -c "^  { sku:" seed.ts` = 30)                  |
| 4   | Ventes par produit    | ✅ `SALES_PLAN` couvre les 30 SKUs (5 ventes hebdo / produit)                                  |
| 5   | Idempotence           | ✅ garde-fou conservé : `if (existing) { console.log("Données déjà présentes"); return }`      |

**À rejouer** : `npm run prisma:seed` après remontée du stack.

---

## TC-06 — Le seed couvre les trois niveaux de risque

**Statut** : ✅ **OK (statique)** — confirmation API ⚠️ non rejouée.

Distribution attendue d'après les `expiresIn` / `SALES_PLAN` du seed :

- `critical` : 6 produits (CRE-HYD-50, SER-VIT-C, MIC-EAU-400, BB-CREAM-30, FOND-TEINT-30, CREME-MAIN-75).
- `high` : 5 produits (CREME-CORP-200, MASQ-ARG-75, GEL-DOUCHE-250, HUILE-SEC-100, DEMA-YEU-125).
- `safe` (incluant les paliers modéré/faible/sûr) : 19 produits restants.

Chaque niveau est représenté ≥ 1 fois → critère satisfait sur la base des données seedées.

---

## Synthèse

| TC    | Critère                               | Statut                                    |
| ----- | ------------------------------------- | ----------------------------------------- |
| TC-01 | Migration versionnée                  | ⚠️ Statique OK / E2E non rejoué (DB down) |
| TC-02 | `external_sku` obligatoire            | ✅ OK                                     |
| TC-03 | Unicité `(pharmacy_id, external_sku)` | ✅ OK                                     |
| TC-04 | `lot_number` ajouté                   | ✅ OK                                     |
| TC-05 | Seed 1 officine + ~30 produits        | ✅ OK (statique) / E2E à rejouer          |
| TC-06 | Couverture des 3 niveaux de risque    | ✅ OK (statique) / E2E à rejouer          |

**Conclusion** : tous les critères d'acceptation US-02 sont implémentés et validés statiquement. La validation end-to-end (TC-01, TC-05, TC-06) demande de relancer Docker Desktop puis `docker compose up` + `npm run prisma:migrate` + `npm run prisma:seed`. Aucune correction de code n'est nécessaire à ce stade.
