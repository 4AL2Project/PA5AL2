# Cahier de test — US-02 : Schéma de données socle + migrations + seed

> **User Story** : En tant que développeur, je veux un schéma Prisma versionné et des données de démo, afin de travailler sur des données réalistes immédiatement.

## Pré-requis

- Stack démarrée via `docker compose up` (cf. US-01) ou backend lancé en local avec PostgreSQL accessible.
- Outils disponibles : `npx prisma migrate`, `npx prisma studio`, accès `psql` ou Prisma Studio.

## Critères d'acceptation couverts

- Modèles socle figés : `Pharmacy`, `Product`, `Sale`, `RiskAnalysis`.
- Champ `lot_number` ajouté sur `Product` (prérequis Recall — obligation réglementaire).
- Contrainte `@@unique` sur `(pharmacy_id, external_sku)` (anti-doublon en base).
- `external_sku` rendu **obligatoire** sur les produits.
- Migration versionnée appliquée + seed (1 officine, ~30 produits, ventes).

---

## TC-01 — Migration versionnée appliquée sans erreur

**Objectif** : vérifier qu'un nouveau développeur peut appliquer le schéma depuis zéro.

| #   | Étape                                                                                                 | Résultat attendu                                                              |
| --- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | Réinitialiser la base : `npx prisma migrate reset --schema src/database/prisma/schema.prisma --force` | La commande s'exécute sans erreur, toutes les migrations sont rejouées        |
| 2   | Lister les migrations dans `backend/src/database/prisma/migrations/`                                  | Une nouvelle migration (ex. `*_us02_schema_socle`) est présente et versionnée |
| 3   | Inspecter la table `Product` (`\d "Product"` en psql ou Prisma Studio)                                | Les colonnes socle + `lot_number` + `external_sku` (NOT NULL) sont présentes  |

**Critère de réussite** : `prisma migrate reset` recrée intégralement le schéma cible sans intervention manuelle.

---

## TC-02 — `external_sku` est obligatoire sur les produits

**Objectif** : empêcher la création d'un produit sans SKU (cause connue de mauvaise classification en critique).

| #   | Étape                                                                                   | Résultat attendu                                                                |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Tenter de créer un produit sans `external_sku` via Prisma Studio ou un appel SQL direct | La création échoue avec une violation de contrainte NOT NULL sur `external_sku` |
| 2   | Inspecter le schéma Prisma (`schema.prisma`)                                            | Le champ `external_sku` est déclaré `String` (sans `?`)                         |

**Critère de réussite** : la base refuse tout produit sans SKU externe.

---

## TC-03 — Contrainte d'unicité `(pharmacy_id, external_sku)` anti-doublon

**Objectif** : garantir qu'un même SKU ne peut pas exister deux fois pour une même pharmacie.

| #   | Étape                                                                                     | Résultat attendu                                              |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | Créer un produit avec `pharmacy_id = X` et `external_sku = 'CRE-HYD-50'`                  | Création réussie                                              |
| 2   | Tenter de créer un second produit avec **les mêmes** `pharmacy_id` et `external_sku`      | La création échoue avec une violation de contrainte d'unicité |
| 3   | Créer un produit avec **un autre** `pharmacy_id` et le même `external_sku = 'CRE-HYD-50'` | Création réussie (l'unicité est bien scopée par pharmacie)    |

**Critère de réussite** : l'upsert produits par `(pharmacy_id, external_sku)` est protégé en base, plus uniquement en applicatif.

---

## TC-04 — Champ `lot_number` disponible sur les produits (prérequis Recall)

**Objectif** : le numéro de lot, obligatoire pour gérer un futur rappel produit, est traçable sur chaque produit.

| #   | Étape                                                         | Résultat attendu                                                |
| --- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | Inspecter la table `Product`                                  | La colonne `lot_number` existe                                  |
| 2   | Créer un produit en renseignant `lot_number = 'LOT-2026-A42'` | La valeur est correctement persistée et lisible                 |
| 3   | Créer un produit sans `lot_number`                            | La création réussit (champ optionnel, alimenté progressivement) |

**Critère de réussite** : le schéma supporte le numéro de lot sans bloquer les imports legacy qui ne le fournissent pas encore.

---

## TC-05 — Seed produit 1 officine de démo + ~30 produits avec ventes

**Objectif** : un seed prêt à l'emploi alimente une pharmacie de démonstration avec un volume réaliste de produits et de ventes.

| #   | Étape                                                               | Résultat attendu                                                           |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Exécuter `npm run prisma:seed` depuis `backend/`                    | Le script s'exécute sans erreur et affiche un résumé                       |
| 2   | Vérifier en base : `SELECT COUNT(*) FROM "Pharmacy"`                | 1 pharmacie (`Institut Beaute Demo`)                                       |
| 3   | `SELECT COUNT(*) FROM "Product" WHERE pharmacy_id = '3c865b32-...'` | ~30 produits seedés                                                        |
| 4   | `SELECT COUNT(*) FROM "Sale" WHERE pharmacy_id = '3c865b32-...'`    | Plusieurs ventes par produit sur les 30 derniers jours                     |
| 5   | Rejouer `npm run prisma:seed` une seconde fois                      | Le seed est idempotent : aucun doublon, message « Données déjà présentes » |

**Critère de réussite** : le seed fournit 1 officine + ~30 produits + ventes, sans doublon au second lancement.

---

## TC-06 — Le seed couvre les trois niveaux de risque attendus

**Objectif** : valider que les données de démo permettent de tester chaque branche du moteur de risque (`critical`, `high`, `safe`).

| #   | Étape                                                                                       | Résultat attendu                                                           |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Après le seed, appeler `GET /api/products?pharmacy_id=3c865b32-...`                         | La réponse retourne ~30 produits                                           |
| 2   | Compter les produits par `risk_level` (via Prisma Studio ou requête SQL sur `RiskAnalysis`) | Les trois niveaux `critical`, `high`, `safe` sont représentés (chacun ≥ 1) |

**Critère de réussite** : un démarrage à froid suffit pour explorer les trois cas d'usage métier de l'algorithme de risque.
