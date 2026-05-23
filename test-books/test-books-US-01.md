# Cahier de test — US-01 : Environnement reproductible (Docker Compose)

> **User Story** : En tant que développeur, je veux lancer tout le stack (DB + back + front) en une commande, afin de démarrer sans configuration manuelle.

## Pré-requis

- Docker et Docker Compose installés (`docker compose version`).
- Dépôt cloné, aucun service local démarré (ports 3000, 3005, 5432 libres).

## Critères d'acceptation couverts

- `docker-compose.yml` racine avec les services `postgres`, `backend`, `frontend`.
- `.env.example` documenté ; le projet démarre par simple copier-coller.
- `docker compose up` → API accessible + DB migrée + seed appliqué.
- Hébergement cible OVH France documenté (RGPD).

---

## TC-01 — Démarrage du stack en une commande

**Objectif** : valider que toute la stack démarre sans configuration manuelle.

| #   | Étape                                  | Résultat attendu                                                       |
| --- | -------------------------------------- | ---------------------------------------------------------------------- |
| 1   | `cp .env.example .env` à la racine     | Fichier `.env` créé, aucune valeur à modifier pour démarrer            |
| 2   | `docker compose up` (depuis la racine) | Les 3 services `postgres`, `backend`, `frontend` démarrent sans erreur |
| 3   | Attendre la fin du démarrage           | Aucune intervention manuelle requise (migrations + seed automatiques)  |

**Critère de réussite** : un nouveau développeur démarre le projet avec 2 commandes maximum.

---

## TC-02 — API backend accessible et reliée à la DB migrée

**Objectif** : vérifier que l'API répond et que la base est migrée + seedée.

| #   | Étape                                                                                        | Résultat attendu                                              |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | Stack démarrée (TC-01)                                                                       | —                                                             |
| 2   | Appeler `GET /api/dashboard?pharmacy_id=3c865b32-ba84-483d-8256-2b1d7d5e542e` sur le backend | Réponse `200` avec les données de la pharmacie de démo        |
| 3   | Vérifier le contenu                                                                          | Les produits seedés sont présents (DB migrée + seed appliqué) |

**Critère de réussite** : l'API renvoie les données de démo sans étape de migration/seed manuelle.

---

## TC-03 — Frontend accessible et connecté au backend

**Objectif** : vérifier que le frontend se charge et communique avec le backend conteneurisé.

| #   | Étape                          | Résultat attendu                                                                    |
| --- | ------------------------------ | ----------------------------------------------------------------------------------- |
| 1   | Stack démarrée (TC-01)         | —                                                                                   |
| 2   | Ouvrir `http://localhost:3000` | Le dashboard Savely s'affiche                                                       |
| 3   | Observer les données affichées | Les chiffres proviennent du backend conteneurisé (pas de page vide / erreur réseau) |

**Critère de réussite** : le frontend affiche les données issues du backend démarré via Compose.

---

## TC-04 — Démarrage à partir du `.env.example` seul (copier-coller)

**Objectif** : garantir qu'aucune variable secrète/manuelle n'est requise pour un premier lancement.

| #   | Étape                                                           | Résultat attendu                                         |
| --- | --------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | Sur un poste vierge, `cp .env.example .env` sans aucune édition | —                                                        |
| 2   | `docker compose up`                                             | Le stack démarre intégralement                           |
| 3   | Lire `.env.example`                                             | Chaque variable est commentée (rôle + valeur par défaut) |

**Critère de réussite** : démarrage réussi sans connaissance préalable des valeurs à renseigner.

---

## TC-05 — Persistance et redémarrage propre

**Objectif** : vérifier l'idempotence du démarrage (le seed ne casse pas au 2ᵉ run).

| #   | Étape                                                       | Résultat attendu                                                   |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | `docker compose up` une 1ʳᵉ fois puis `docker compose down` | Stack arrêtée, volume DB conservé                                  |
| 2   | `docker compose up` une 2ᵉ fois                             | Redémarrage sans erreur, seed idempotent (pas de doublon ni crash) |

**Critère de réussite** : relancer la stack ne produit ni erreur de migration ni doublon de données.

---

## TC-06 — Documentation hébergement OVH France (RGPD)

**Objectif** : vérifier la présence de la documentation d'hébergement cible.

| #   | Étape                                              | Résultat attendu                                                              |
| --- | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | Ouvrir la documentation projet (`docs/` ou README) | Une section décrit l'hébergement cible OVH France                             |
| 2   | Lire la section                                    | La conformité RGPD (données hébergées en France) est explicitement mentionnée |

**Critère de réussite** : la cible d'hébergement OVH France et la justification RGPD sont documentées.
