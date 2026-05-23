# Cahier de test — US-00 : Conventions & structure de dépôt

> **User Story** : En tant que développeur de l'équipe, je veux un dépôt structuré avec des conventions claires, afin de contribuer sans casser le travail des autres.

## Pré-requis

- Dépôt cloné (`git clone`).
- `pnpm` installé (`pnpm -v`).
- Node.js ≥ 20.

## Critères d'acceptation couverts

- Arborescence monorepo documentée (`backend/`, `frontend/`, `mobile/`, `docs/`).
- ESLint + Prettier configurés back & front, commande `lint` qui passe.
- Stratégie GitFlow documentée (`main` / `dev` / `feat/*`).
- README racine : prérequis, lancement, où trouver quoi.

---

## TC-01 — README racine lisible et complet

**Objectif** : un nouveau développeur trouve toutes les informations pour démarrer sans chercher ailleurs.

| # | Étape | Résultat attendu |
|---|-------|------------------|
| 1 | Ouvrir `README.md` à la racine | Le fichier existe et contient : tech stack, prérequis, commandes de lancement, structure du projet |
| 2 | Vérifier la section « Project Structure » | Les répertoires `backend/`, `frontend/`, `docs/` sont listés avec leur rôle |
| 3 | Vérifier la section « Branching / GitFlow » | La stratégie `main` / `dev` / `feat/*` est expliquée |

**Critère de réussite** : un développeur peut démarrer le projet avec les seules informations du README.

---

## TC-02 — ESLint passe sans erreur (backend)

**Objectif** : la configuration ESLint backend est opérationnelle.

| # | Étape | Résultat attendu |
|---|-------|------------------|
| 1 | Depuis la racine : `pnpm lint:backend` | La commande s'exécute et retourne `0` (aucune erreur ESLint) |
| 2 | Vérifier la présence de `backend/eslint.config.mjs` | Le fichier existe et inclut les règles TypeScript |

**Critère de réussite** : `pnpm lint:backend` termine avec code de sortie `0`.

---

## TC-03 — ESLint passe sans erreur (frontend)

**Objectif** : la configuration ESLint frontend est opérationnelle.

| # | Étape | Résultat attendu |
|---|-------|------------------|
| 1 | Depuis la racine : `pnpm lint:frontend` | La commande s'exécute et retourne `0` (aucune erreur ESLint) |
| 2 | Vérifier la présence de `frontend/eslint.config.mjs` | Le fichier existe et inclut les règles React/Next.js |

**Critère de réussite** : `pnpm lint:frontend` termine avec code de sortie `0`.

---

## TC-04 — Prettier vérifie le formatage

**Objectif** : la configuration Prettier est présente et cohérente.

| # | Étape | Résultat attendu |
|---|-------|------------------|
| 1 | Vérifier la présence de `.prettierrc` à la racine | Le fichier existe avec les règles (singleQuote, semi, tabWidth…) |
| 2 | Depuis la racine : `pnpm format:check` | La commande s'exécute sans erreur de formatage |

**Critère de réussite** : `.prettierrc` présent et `pnpm format:check` retourne code `0`.

---

## TC-05 — Stratégie GitFlow documentée

**Objectif** : chaque développeur sait sur quelle branche travailler et comment nommer ses branches.

| # | Étape | Résultat attendu |
|---|-------|------------------|
| 1 | Ouvrir `README.md` | Une section décrit la stratégie : `main` (prod), `dev` (intégration), `feat/US-XX` (features) |
| 2 | Vérifier que les branches `main` et `dev` existent | `git branch -a` montre `main` et `dev` |

**Critère de réussite** : la stratégie de branchement est lisible dans le README sans ambiguïté.
