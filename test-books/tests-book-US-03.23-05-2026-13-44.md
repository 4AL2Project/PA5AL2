# Rapport d'exécution — US-03 (23-05-2026 13:44)

> Source : `test-books/test-books-US-03.md`

## Contexte d'exécution

- **PostgreSQL** : container `pa5al2-postgres-1` UP (seedé via `prisma migrate reset --force`).
- **Backend (port 3005)** : démarré (`pnpm run dev`), AuthController monté avec les routes `/api/auth/{register,login,refresh}` et `JwtAuthGuard` appliqué sur `/api/dashboard`.
- **Frontend (port 3000)** : non démarré.
- US-03 est **purement backend** (auth API). Pas d'UI ajoutée dans le scope de l'US → Playwright (desktop/mobile) ne s'applique pas. Validation end-to-end via cURL contre l'API + lecture du hash bcrypt dans PostgreSQL.

| Outil | Résultat |
|---|---|
| `pnpm exec tsc --noEmit` (backend) | ✅ passe |
| `pnpm exec eslint src/` (backend) | ✅ passe |
| `prisma migrate dev --name us03_user_auth` | ✅ migration appliquée (`20260523114030_us03_user_auth`) |
| `prisma migrate reset --force` (seed inclus) | ✅ user démo créé (`demo@cosmorisk.fr` / `demo1234`) |

---

## TC-01 — Inscription d'un nouvel utilisateur d'officine

**Statut** : ✅ **OK**.

| # | Étape | Résultat |
|---|-------|----------|
| 1 | `POST /api/auth/register` (`bob@cosmorisk.fr`) | ✅ `201` — `{user_id, email, pharmacy_id, created_at}` (pas de `password` dans la réponse) |
| 2 | Inspection `User.password` en base | ✅ hash bcrypt `$2b$12$…` sur 60 caractères (préfixe `$2b$12$` ⇒ **12 rounds**) — vérifié pour `demo`, `alice`, `bob` |
| 3 | Réinscription du même email | ✅ `409 Conflict — "Email already registered"`, aucun second user créé |

---

## TC-02 — Connexion retourne un access + refresh token aux bonnes durées

**Statut** : ✅ **OK**.

| # | Étape | Résultat |
|---|-------|----------|
| 1 | `POST /api/auth/login` (demo) | ✅ `200` avec `{access_token, refresh_token}` |
| 2 | TTL access décodé | ✅ `exp - iat = 900s` (**15 min**) |
| 3 | TTL refresh décodé | ✅ `exp - iat = 604 800s` (**7 jours**) |

---

## TC-03 — Connexion refusée sans fuite d'information

**Statut** : ✅ **OK**.

| # | Étape | Résultat |
|---|-------|----------|
| 1 | Login avec bon email + mauvais password | ✅ `401 — "Invalid credentials"` |
| 2 | Login avec email inexistant | ✅ `401 — "Invalid credentials"` (message **identique** à l'étape 1) |

---

## TC-04 — Route protégée nécessite un access token valide

**Statut** : ✅ **OK**.

| # | Étape | Résultat |
|---|-------|----------|
| 1 | `GET /api/dashboard?pharmacy_id=…` sans header | ✅ `401 — "Missing bearer token"` |
| 2 | Même appel avec `Authorization: Bearer <access_token>` valide | ✅ `200` avec le payload dashboard |

---

## TC-05 — Token expiré ou malformé → 401

**Statut** : ✅ **OK** (critère d'acceptation explicite de l'US).

| # | Étape | Résultat |
|---|-------|----------|
| 1 | Token forgé avec `exp` dans le passé (HS256, secret dev) | ✅ `401 — "Invalid or expired token"` |
| 2 | Token volontairement malformé (`not.a.token`) | ✅ `401 — "Invalid or expired token"` |

---

## TC-06 — Refresh : prolongation de session

**Statut** : ✅ **OK**.

| # | Étape | Résultat |
|---|-------|----------|
| 1 | `POST /api/auth/refresh` avec refresh token valide | ✅ `200` — nouvel `{access_token, refresh_token}` |
| 2 | Réappel `GET /api/dashboard` avec ce nouvel access token | ✅ `200` |
| 3 | `POST /api/auth/refresh` avec un refresh token invalide | ✅ `401 — "Invalid or expired refresh token"` |

---

## Synthèse

| TC | Critère | Statut |
|---|---|---|
| TC-01 | Inscription + bcrypt 12 rounds + email unique | ✅ OK |
| TC-02 | Login → access 15 min + refresh 7 j | ✅ OK |
| TC-03 | Login refusé sans fuite d'info | ✅ OK |
| TC-04 | Route protégée 401 sans token, 200 avec | ✅ OK |
| TC-05 | Token expiré / malformé → 401 | ✅ OK |
| TC-06 | Refresh OK + refresh invalide → 401 | ✅ OK |

**Conclusion** : tous les critères d'acceptation de US-03 sont satisfaits end-to-end. **Aucune correction nécessaire.**
