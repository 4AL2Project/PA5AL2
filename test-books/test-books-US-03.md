# Cahier de test — US-03 : Authentification JWT

> **User Story** : En tant qu'utilisateur d'une officine, je veux me connecter de façon sécurisée, afin que mes données ne soient accessibles qu'à moi.

## Pré-requis

- Stack démarrée via `docker compose up` (cf. US-01) ou backend lancé en local.
- Outils disponibles : `curl` / Postman / Swagger pour appeler l'API, accès `psql` ou Prisma Studio pour inspecter la base.

## Critères d'acceptation couverts

- Endpoints `POST /api/auth/register` et `POST /api/auth/login`.
- Mot de passe hashé en base avec **bcrypt (12 rounds)**.
- JWT **access token** d'une durée de **15 minutes**.
- JWT **refresh token** d'une durée de **7 jours** + endpoint `POST /api/auth/refresh`.
- Toute route protégée retourne **401** si le token est absent / invalide / expiré.

---

## TC-01 — Inscription d'un nouvel utilisateur d'officine

**Objectif** : un utilisateur peut créer son compte et son mot de passe n'est jamais stocké en clair.

| #   | Étape                                                      | Résultat attendu                                                                            |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1   | `POST /api/auth/register` avec `email`, `password` valides | Réponse `201` avec l'utilisateur créé (sans le mot de passe)                                |
| 2   | Inspecter la table `User` en base                          | Le champ `password` contient un hash bcrypt (préfixe `$2b$12$…`), jamais la valeur en clair |
| 3   | Tenter de réinscrire le même email                         | Réponse `409` (conflit), aucun second compte créé                                           |

**Critère de réussite** : aucun mot de passe n'est lisible en base et un email ne peut être utilisé qu'une seule fois.

---

## TC-02 — Connexion réussie retourne un access + refresh token

**Objectif** : un utilisateur déjà inscrit récupère ses deux tokens en se connectant.

| #   | Étape                                                     | Résultat attendu                                          |
| --- | --------------------------------------------------------- | --------------------------------------------------------- |
| 1   | `POST /api/auth/login` avec les bons `email` / `password` | Réponse `200` contenant `access_token` et `refresh_token` |
| 2   | Décoder l'`access_token` (jwt.io ou équivalent)           | `exp - iat` ≈ **900 s** (15 min)                          |
| 3   | Décoder le `refresh_token`                                | `exp - iat` ≈ **604 800 s** (7 jours)                     |

**Critère de réussite** : les durées de vie des deux tokens correspondent strictement à la spécification.

---

## TC-03 — Connexion refusée avec mauvais mot de passe

**Objectif** : protéger les comptes contre les essais de mots de passe erronés.

| #   | Étape                                                                 | Résultat attendu                                                                              |
| --- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | `POST /api/auth/login` avec le bon `email` mais un mauvais `password` | Réponse `401`, message générique (pas de fuite « email inconnu » vs « mauvais mot de passe ») |
| 2   | `POST /api/auth/login` avec un email inexistant                       | Réponse `401`, même message qu'à l'étape 1                                                    |

**Critère de réussite** : aucune information ne permet de deviner si l'email existe en base.

---

## TC-04 — Route protégée accessible avec un access token valide

**Objectif** : un utilisateur authentifié accède à ses données.

| #   | Étape                                                                                            | Résultat attendu               |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------ |
| 1   | Récupérer un `access_token` via `/api/auth/login` (TC-02)                                        | —                              |
| 2   | Appeler `GET /api/dashboard?pharmacy_id=…` avec l'en-tête `Authorization: Bearer <access_token>` | Réponse `200` avec les données |
| 3   | Appeler la même route **sans** en-tête `Authorization`                                           | Réponse `401`                  |

**Critère de réussite** : la protection est effective sur les routes métier.

---

## TC-05 — Access token expiré → 401 sur route protégée

**Objectif** : un token expiré n'ouvre plus l'accès aux données (critère d'acceptation explicite).

| #   | Étape                                                                                                           | Résultat attendu |
| --- | --------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | Générer un `access_token` puis attendre > 15 min (ou forger un token avec `exp` passé en environnement de test) | —                |
| 2   | Appeler `GET /api/dashboard?pharmacy_id=…` avec ce token expiré                                                 | Réponse `401`    |
| 3   | Refaire l'appel avec un token volontairement malformé                                                           | Réponse `401`    |

**Critère de réussite** : toute requête avec un token expiré ou invalide est rejetée en `401`.

---

## TC-06 — Refresh : obtenir un nouvel access token sans se reconnecter

**Objectif** : la session reste utilisable pendant 7 jours sans ressaisir le mot de passe.

| #   | Étape                                                                    | Résultat attendu                                             |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 1   | Se connecter (TC-02) puis attendre l'expiration de l'access token        | L'access token n'ouvre plus les routes protégées (cf. TC-05) |
| 2   | `POST /api/auth/refresh` avec le `refresh_token` valide                  | Réponse `200` avec un nouvel `access_token` (durée 15 min)   |
| 3   | Réappeler `GET /api/dashboard?pharmacy_id=…` avec ce nouvel access token | Réponse `200`                                                |
| 4   | `POST /api/auth/refresh` avec un refresh token invalide / expiré         | Réponse `401`                                                |

**Critère de réussite** : un refresh token valide prolonge la session ; un refresh token invalide est rejeté.
