# Savely — Backlog User Stories

> Miroir local du backlog Notion. Source de vérité : Notion (page « Savely — Backlog User Stories V1 »).
> Dernière mise à jour : 2026-06-17.

## Légende des statuts

| Statut | Signification |
|--------|---------------|
| ✅ Terminé | Mergé dans `dev` |
| 🔄 En cours | Branche locale en attente de PR |
| 📋 Backlog | À implémenter |

---

## Fondations & Infrastructure

| ID | Titre | Rôle | Statut |
|----|-------|------|--------|
| US-01 | Walking skeleton (upload → analyse → dashboard) | Dev | ✅ Terminé |
| US-02 | expiry_date optionnel (LGO n'exporte pas les DLP) | Dev | ✅ Terminé (US-21) |
| US-03 | Auth JWT + refresh token (pharmacien) | Dev | ✅ Terminé |
| US-04 | RBAC TITULAIRE / PREPARATEUR / ADMIN_SAVELY | Dev | ✅ Terminé |
| US-05 | Magic link email (invitations & connexion) | Dev | ✅ Terminé |
| US-06 | Harness de tests Jest + CI GitHub Actions | Dev | ✅ Terminé |
| US-07 | Walking skeleton end-to-end (upload → dashboard) | Dev | ✅ Terminé |
| US-11 | Déduplication des ventes à l'import | Dev | ✅ Terminé |

## Moteur dormance

| ID | Titre | Rôle | Statut |
|----|-------|------|--------|
| US-20 | Pivot moteur : days_of_cover remplace days_to_expiry | Dev | ✅ Terminé |
| US-21 | expiry_date optionnel dans schema + upload | Dev | ✅ Terminé |

## Centre d'actions & Associations

| ID | Titre | Rôle | Statut |
|----|-------|------|--------|
| US-22 | Centre d'actions (B2C / DON) + machine à états | Dev | ✅ Terminé |
| US-23 | Registre associations bénéficiaires (geoloc) | Dev | ✅ Terminé |
| US-26 | Dashboard KPIs enrichi (dormant, capital_by_level, recent_count) | Dev | 🔄 En cours |
| US-27 | Cron reset automatique des snoozes expirés | Dev | 🔄 En cours |

## Dons médicamenteux

| ID | Titre | Rôle | Statut |
|----|-------|------|--------|
| US-30 | Don associatif — machine à états + bilan RSE | Dev | ✅ Terminé |
| US-32 | Génération PDF Cerfa 60-2012 | Dev | ✅ Terminé |

## Dashboard & UX officine

| ID | Titre | Rôle | Statut |
|----|-------|------|--------|
| US-40 | Dashboard dormance KPIs — capital immobilisé | Dev | ✅ Terminé |
| US-41 | (voir branche feat-US-41) | Dev | ✅ Terminé |
| US-42 | Pagination produits prioritaires + page détail produit | Dev | ✅ Terminé |
| US-61 | Admin officines (CRUD pharmacies + utilisateurs) | Admin | ✅ Terminé |
| US-63 | (voir branche feat-us-63) | Dev | ✅ Terminé |
| US-64 | Améliorations auth (magic link rate limit, …) | Dev | ✅ Terminé |
| US-99 | (voir branche feat-us-99) | Dev | ✅ Terminé |

## Infrastructure transverse

| ID | Titre | Rôle | Statut |
|----|-------|------|--------|
| US-67 | Migration nodemailer → Resend pour les emails transactionnels | Dev | ✅ Terminé |

## B2C — App mobile (Clément Flutter)

> Spec de référence : `docs/API-CONTRACT.md` + spec mobile Clément (`Savely — API v1`).
> Base : PR #37 `feat-b2c-entity-logic` (mergée le 2026-06-16).

### Déjà livrés dans PR #37

| ID | Titre | Rôle | Statut |
|----|-------|------|--------|
| B2C-01 | Modèle Customer (compte B2C léger, JWT séparé) | Dev | ✅ Terminé |
| B2C-02 | Inscription + Connexion Customer (`/api/customers/register`, `/login`, `/me`) | Dev | ✅ Terminé |
| B2C-03 | Modèle Offer + publication pharmacien (CRUD, suspend/resume/terminate) | Dev | ✅ Terminé |
| B2C-04 | Catalogue offres par pharmacie (`GET /api/offers/pharmacy/:id/active`) | Dev | ✅ Terminé |
| B2C-05 | Modèle Order + machine à états complète | Dev | ✅ Terminé |
| B2C-06 | Réservation commande Customer (`POST /api/orders`) | Dev | ✅ Terminé |
| B2C-07 | Transitions preparateur (prepare / ready / withdraw) | Dev | ✅ Terminé |
| B2C-08 | Annulation commande (Customer + Titulaire) | Dev | ✅ Terminé |
| B2C-09 | Expiration automatique 24h (cron horaire → EXPIREE) | Dev | ✅ Terminé |
| B2C-10 | Import asynchrone (BullMQ + audit `Import`) | Dev | ✅ Terminé |
| B2C-11 | Notifications interface (console, pluggable email/SMS) | Dev | ✅ Terminé |

### Gaps API (branche `feat-us-80-b2c-gaps`)

| ID | Titre | Rôle | Critères d'acceptance | Statut |
|----|-------|------|----------------------|--------|
| US-80 | Recherche offres géolocalisée | Customer mobile | `GET /api/offers/nearby?lat=&lng=&radius=3` → liste triée par distance avec `distanceKm` ; pharmacies sans `lat/lng` exclues | 📋 En PR |
| US-81 | Détail d'une offre (Customer) | Customer mobile | `GET /api/offers/:id` → 200 si ACTIVE, 404 si SUSPENDUE/TERMINEE | 📋 En PR |
| US-82 | Détail commande par rôle | Customer + Préparateur | `GET /api/orders/my/:id` → qrToken+pharmacy, masque client ; `GET /api/orders/:id` (JwtAuth) → client, masque qrToken | 📋 En PR |
| US-83 | Refresh token Customer | Customer mobile | `POST /api/customers/refresh { refresh_token }` → `{ access_token, refresh_token }` ; 401 si expiré ou type invalide | 📋 En PR |
| US-84 | Stats profil Customer | Customer mobile | `GET /api/customers/me/stats` → `{ totalSaved, ordersCount, favoritePharmaciesCount: 0, memberSince }` | 📋 En PR |

### Backlog futur (V2)

| ID | Titre | Rôle | Statut |
|----|-------|------|--------|
| B2C-V2-01 | Favoris pharmacies (favoritePharmaciesCount) | Customer | 📋 Backlog |
| B2C-V2-02 | Notifications push (Firebase FCM) | Dev + Customer | 📋 Backlog |
| B2C-V2-03 | Historique imports avec WebSocket (progression en temps réel) | Titulaire | 📋 Backlog |
| B2C-V2-04 | QR token signé HMAC-SHA256 (remplace UUID simple) | Dev | 📋 Backlog |
| B2C-V2-05 | Paiement en ligne (Stripe) | Customer | 📋 Backlog |
