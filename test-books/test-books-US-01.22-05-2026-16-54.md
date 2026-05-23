# Résultats de test — US-01 (22/05/2026 16:54)

Test visuel via Playwright (desktop ≥1024px et mobile <440px) + vérifications API/Docker.
Stack lancée via `docker compose up -d --build` à la racine.

| Test | Cas | Desktop | Mobile | Verdict |
|------|-----|:------:|:------:|:------:|
| TC-01 | Démarrage du stack en une commande | — | — | ✅ OK |
| TC-02 | API accessible + DB migrée + seed appliqué | — | — | ✅ OK |
| TC-03 | Frontend accessible et connecté au backend | ✅ | ✅ | ✅ OK |
| TC-04 | Démarrage à partir du `.env.example` seul | — | — | ✅ OK |
| TC-05 | Persistance et redémarrage propre (idempotence) | — | — | ✅ OK |
| TC-06 | Documentation hébergement OVH France (RGPD) | — | — | ✅ OK |

## Détail

### TC-01 — Démarrage en une commande ✅
`cp .env.example .env` puis `docker compose up -d --build` → 3 services `postgres`,
`backend`, `frontend` démarrés (`docker compose ps` : tous `Up`, postgres `healthy`).

### TC-02 — API + DB migrée + seed ✅
- `GET /api/dashboard?pharmacy_id=3c865b32-…` → `200`, renvoie `total_products: 20`,
  `critical: 8 / high: 5 / safe: 7`, `total_recoverable: 7618.34`.
- Logs backend : 2 migrations appliquées + `✅ Pharmacie créée`.
- **KO au 1er essai** → corrigé (voir corrections #1 et #2).

### TC-03 — Frontend accessible + données ✅
- `http://localhost:3000` → `200` en desktop (1280×900) et mobile (390×844).
- Le dashboard affiche les données seedées (20 produits, distribution des risques,
  7 618 €). Captures : `screenshots/dashboard-desktop.png`, `dashboard-mobile.png`,
  `products-desktop.png`, `products-mobile.png`.
- **KO au 1er essai** (ECONNREFUSED en SSR) → corrigé (correction #3).

### TC-04 — `.env.example` copier-coller ✅
Démarrage réussi avec un simple `cp .env.example .env` sans édition ; chaque
variable est commentée (rôle + valeur par défaut).

### TC-05 — Idempotence ✅
`docker compose restart backend` → logs : `No pending migrations to apply.` +
`✅ Données déjà présentes` ; API toujours `200`, aucun doublon.

### TC-06 — Hébergement OVH France / RGPD ✅
Documenté dans `docs/HEBERGEMENT.md` (datacenters France, souveraineté, RGPD).

## Corrections implémentées pendant le test

1. **Dérive de migration** : la migration `init` créait `RiskAnalysis.suggested_discount`
   alors que le schéma attend `suggested_action` (modèle 3 niveaux). `migrate deploy`
   produisait une DB invalide (API en 500). → Ajout de la migration
   `20260522000000_risk_suggested_action`.
2. **UUID de la pharmacie de démo non déterministe** : le seed générait un UUID aléatoire
   et demandait de le copier manuellement dans `.env.local` (contraire au « zéro config »).
   → Seed aligné sur `NEXT_PUBLIC_PHARMACY_ID = 3c865b32-…`.
3. **SSR injoignable** : le frontend faisait ses fetchs SSR vers `localhost:3005`,
   inaccessible depuis le conteneur. → `INTERNAL_API_URL=http://backend:3005` côté serveur,
   `NEXT_PUBLIC_API_URL` conservé côté navigateur.

## Hors périmètre US-01 (non corrigé)

- Avertissement console React #418 (hydratation, probablement formatage de date) et un
  `404` sur une ressource statique : bugs frontend préexistants, sans rapport avec la
  reproductibilité de l'environnement Docker (objet de l'US-01).
