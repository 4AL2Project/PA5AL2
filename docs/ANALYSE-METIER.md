# Savely — Analyse Métier

> Analyse fonctionnelle complète (acteurs, parcours, périmètre, brief technique).
> Base de conception pour le produit, les fonctionnalités et le CDC.
> S'appuie sur le pivot « stock dormant » acté dans [ADR 0001](adr/0001-pivot-stock-dormant.md).

---

## 1. Compréhension du projet

**🎯 Intention** — Rendre visible et récupérable la trésorerie qu'une officine immobilise sans le savoir dans son **stock dormant**, en transformant ses exports de stock et de ventes en un plan d'actions priorisé : écouler ou donner les produits qui ne tournent pas.

**🌍 Contexte** — Pharmacie d'officine, France métropolitaine. TPE indépendantes (titulaire + préparateurs). Pas d'accès API LGO → export manuel CSV/XLSX. **La DLP n'est pas dans les exports** → moteur basé sur stock + vitesse de vente. Paiement au comptoir (pas de paiement en ligne). RGPD : données produit uniquement.

**Hypothèses validées**

- H1 — écosystème complet cartographié (détection + don + click & collect).
- H2 — client B2C = utilisateur enregistré léger (email/tél).
- H3 — ❌ transfert inter-officines **écarté** (ni acteur, ni parcours, ni action).
- H4 — remise B2C fixée manuellement par le titulaire.

---

## 2. Acteurs

| Acteur          | Rôle                                | Fréquence     | Tech  | Criticité  |
| --------------- | ----------------------------------- | ------------- | ----- | ---------- |
| **Titulaire**   | Décideur officine, bénéficiaire éco | Hebdomadaire  | 🟡    | Primaire   |
| **Préparateur** | Exécutant terrain (fulfillment)     | Quotidienne   | 🔴→🟡 | Primaire   |
| **Client B2C**  | Acheteur final (réserve & retire)   | Ponctuelle    | 🟡    | Primaire   |
| Association     | Bénéficiaire des dons               | Ponctuelle    | 🔴    | Secondaire |
| Admin Savely    | Opérateur de la plateforme          | Quotid./Hebdo | 🟢    | Secondaire |

- Le **LGO** n'est pas un acteur (source de données / dépendance externe).
- Aucun « système » dans la liste : le cron et le moteur sont des **déclencheurs automatiques**.
- La séparation **Titulaire / Préparateur** est la colonne vertébrale du RBAC (le préparateur ne voit jamais les marges).

---

## 3. Parcours métier

### Titulaire

- **T1 · Import des données LGO** — upload CSV/XLSX → preview → upsert idempotent + dédup ventes → recalcul dormance.
- **T2 · Revue du stock dormant & triage** — KPIs → centre d'actions priorisées → Valider / Ignorer / Snooze 48h.
- **T3 · Publier une offre B2C** — produit high/critical → remise manuelle + quantité → offre visible des clients proches.
- **T4 · Gérer un don associatif** — matching asso ≤ 50 km → proposition → accepté → retiré → reçu Cerfa (si retiré).
- **T5 · Bilan dons/RSE & reçu a posteriori** — historique, filtres, re-téléchargement du Cerfa, export compta.

### Préparateur

- **P1 · Préparer une commande B2C** — notif → picking (scan) → marquer « prête » → notifie le client.
- **P2 · Valider le retrait** — scan QR → encaissement au comptoir (hors app) → « retirée » → décrément stock.

### Client B2C

- **C1 · Découvrir & réserver** — compte léger → offres géoloc → réservation + **hold doux** + QR.
- **C2 · Retirer & payer en officine** — notif « prête » → QR au comptoir → paiement physique → récupération.

### Secondaires

- **A1 · Association — répondre à une proposition de don** (email V1 / portail V2) — accepter/refuser → retrait → reçu déclenché.
- **AD1 · Admin — onboarder une officine & administrer** (CRUD officines, CRUD annuaire assos, utilisateurs, supervision).

### Invariants révélés par les cas d'erreur

- Un don **non retiré** ne peut **jamais** générer de reçu Cerfa.
- Un stock **réservé** ne peut pas être re-réservé (hold doux), et **expire après 24 h** (configurable) si pas de retrait.
- Le **décrément réel** du stock n'a lieu **qu'au retrait** (pas à la réservation).

---

## 4. Matrice acteurs × fonctionnalités (priorités)

🔴 Indispensable · 🟠 Important · 🟡 Optionnel/V2

| Cluster       | Fonctionnalité                                  | Acteurs                              | Prio |
| ------------- | ----------------------------------------------- | ------------------------------------ | ---- |
| Socle         | Auth + RBAC multi-tenant                        | Tous                                 | 🔴   |
| Socle         | Notifications (email V1 / push V2)              | Titulaire, Préparateur, Client, Asso | 🟠   |
| Socle         | Paramétrage (seuils dormance, délai 24 h)       | Titulaire/Admin                      | 🟡   |
| Détection     | Import CSV/XLSX + preview + rapport             | Titulaire                            | 🔴   |
| Détection     | Upsert idempotent + dédup ventes                | Titulaire                            | 🔴   |
| Détection     | Moteur dormance (`days_of_cover`) + cron        | _(auto)_                             | 🔴   |
| Détection     | Dashboard KPIs (capital immobilisé)             | Titulaire                            | 🔴   |
| Détection     | Centre d'actions (valider/ignorer/snooze + ROI) | Titulaire                            | 🔴   |
| Don           | Matching assos géoloc (≤ 50 km)                 | Titulaire                            | 🟠   |
| Don           | Machine à états du don                          | Titulaire, Asso                      | 🟠   |
| Don           | Reçu Cerfa PDF (si retiré)                      | Titulaire                            | 🟠   |
| Don           | Bilan RSE + re-téléchargement                   | Titulaire                            | 🟠   |
| Don           | Réponse asso (email V1 / portail V2)            | Association                          | 🟡   |
| Click&Collect | Publication offre B2C                           | Titulaire                            | 🟠   |
| Click&Collect | Catalogue B2C géoloc                            | Client                               | 🟠   |
| Click&Collect | Compte client léger                             | Client                               | 🟠   |
| Click&Collect | Réservation + hold + QR                         | Client                               | 🟠   |
| Click&Collect | Expiration auto (24 h)                          | _(auto)_                             | 🟠   |
| Click&Collect | File de préparation + scan                      | Préparateur                          | 🟠   |
| Click&Collect | Validation retrait + décrément                  | Préparateur                          | 🟠   |
| Admin         | Onboarding + CRUD officines                     | Admin                                | 🟠   |
| Admin         | CRUD annuaire associations                      | Admin                                | 🟠   |
| Admin         | Gestion utilisateurs                            | Admin                                | 🟡   |
| Admin         | Supervision & métriques (MRR)                   | Admin                                | 🟡   |

**Tensions à arbitrer**

1. **Masquage financier (RBAC)** — même entité `Product`, deux vues selon le rôle.
2. **Vérité du stock** _(majeure)_ — LGO (source de vérité ré-importée) vs holds vivants de Savely entre deux imports.
3. **Prix** — remise B2C vs prix normal officine (honoré au comptoir).
4. **Latence** — client veut tout de suite vs temps de préparation.

---

## 5. Périmètre

**✅ V1 (livré, données réelles)**
Détection complète (socle 🔴) · Don associatif (matching, machine à états, Cerfa, bilan RSE, notif email) · Admin minimal (onboarding + CRUD officines + CRUD assos).

**🟡 V2 (développé pour soutenance, feature-flaggé)**
Click & Collect complet (offre B2C, catalogue géoloc, compte client, réservation/hold/QR/expiration, file préparateur, validation retrait) · Portail association · Admin avancé (MRR, supervision, gestion fine des utilisateurs).

**❌ Hors périmètre**
Paiement en ligne (comptoir) · API directe LGO (export manuel) · Gestion DLP/péremption (donnée absente) · Transfert inter-officines (H3) · ML prédictif · Commandes fournisseurs · Facturation auto Savely.

**⚠️ Zones grises**

1. Vérité du stock : modèle « import = base + holds en surcouche » à valider.
2. Ligne V1/V2 du Click & Collect (reco : V2).
3. Suggestion automatique de remise B2C ?
4. Visuels : placeholder catégorie V1, référentiel CIP V2.
5. Localisation des paramètres (env / global / par officine).
6. Multi-rôle d'un même utilisateur.

**🔌 Dépendances externes**
Export LGO · annuaire assos géocodé · service de géocodage · emailing · gabarit Cerfa n°16216 (entreprises) · stockage PDF (5 ans) · FCM (V2) · référentiel CIP (V2) · OVH France (RGPD).

---

## 6. Brief technique

### Le projet en une phrase

Savely transforme les exports de stock et de ventes d'une officine en un plan d'actions priorisé pour récupérer la trésorerie immobilisée dans le stock dormant — en écoulant (B2C) ou en donnant (associations, reçu fiscal) les produits qui ne tournent pas. Multi-tenant, données produit uniquement.

### Acteurs et droits

| Acteur       | Crée                    | Lit                                    | Modifie               | Supprime            |
| ------------ | ----------------------- | -------------------------------------- | --------------------- | ------------------- |
| Titulaire    | imports, offres, dons   | tout sur **sa** officine (+ finances)  | offres, actions, dons | dépublier offres    |
| Préparateur  | (maj statuts)           | commandes + produits **sans finances** | statut commandes      | —                   |
| Client B2C   | compte, réservations    | offres publiques, ses commandes        | annuler réservations  | son compte          |
| Association  | —                       | propositions le concernant             | statut don            | —                   |
| Admin Savely | officines, assos, users | métriques globales                     | config, fiches        | suspendre/supprimer |

### Entités métier

- **Pharmacy** — raison sociale, email, adresse + lat/lng, tier, statut, `last_upload_at`
- **User** — rôle (TITULAIRE/PREPARATEUR/ADMIN_SAVELY), `pharmacy_id`, credentials bcrypt
- **Product** — `external_sku` (**obligatoire**), name, category, brand, `stock_quantity`, `unit_price`, `cost_price`, `lot_number?`, `expiry_date?` _(déprécié)_
- **Sale** — product, `sale_date`, `quantity_sold`, `unit_price_sold?`
- **StockAnalysis** _(ex-RiskAnalysis)_ — product, date, `days_of_cover`, `velocity_30d`, `capital_immobilise`, niveau, action suggérée
- **Action** _(nouvelle)_ — product, type, statut (validé/ignoré/snooze), échéance
- **Association** — nom, adresse + lat/lng, catégories acceptées, contact
- **Donation** — product, quantité, association, statut, valeur, n° reçu, PDF
- _(V2)_ **Offer** — product, prix remisé, quantité offerte, statut, dates, visuel
- _(V2)_ **Order** — client, offer, quantité, statut (réservée→en_prépa→prête→retirée/annulée/expirée), QR, hold
- _(V2)_ **ClientB2C** — email/tél, nom

### Parcours critiques V1

1. Auth + RBAC · 2. T1 Import→détection · 3. T2 Triage/actions · 4. T4 Don + Cerfa · 5. T5 Bilan/reçu.

### Questions ouvertes (tech)

- Vérité du stock (import vs holds) · renommer `RiskAnalysis`→`StockAnalysis` ? · localisation des paramètres · partage types front↔back · géocodage (service vs table) · lib PDF Cerfa + archivage · multi-rôle utilisateur.

### V2

Click & Collect complet · portail association · admin avancé · référentiel CIP · push FCM · UI de paramétrage.
