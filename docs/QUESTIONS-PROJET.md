# Savely — Questions & Réponses Projet

> Notes de cadrage sur la compréhension et la faisabilité du projet.
> Réponses appuyées sur le code réel (`backend/src/modules`) et le cahier des charges.

---

## Flow d'upload

### Que contient le fichier CSV exactement ?

Le système attend **deux fichiers distincts** (`upload.service.ts`), pas un seul.

**Fichier PRODUITS**
| Colonne | Obligatoire | Rôle |
|---|---|---|
| `external_sku` | non\* | identifiant produit côté LGO — clé anti-doublon |
| `name` | oui | nom produit |
| `category`, `brand` | non | classification |
| `expiry_date` | oui | date de péremption → moteur risque |
| `stock_quantity` | oui | stock actuel |
| `unit_price` | oui | prix de vente |
| `cost_price` | non | prix d'achat → calcul de la perte |

**Fichier VENTES**
| Colonne | Obligatoire | Rôle |
|---|---|---|
| `external_sku` | oui | rattache la vente au produit |
| `sale_date` | oui | calcul vélocité 30j |
| `quantity_sold` | oui | volume écoulé |
| `unit_price_sold` | non | prix réel de vente |

> ⚠️ `external_sku` est optionnel pour les produits mais obligatoire pour les ventes. Un produit sans SKU ne peut pas être relié à ses ventes → classé "critical" à tort. **À verrouiller : rendre le SKU obligatoire.**

### Comment éviter les doublons ?

Upsert idempotent déjà en place pour les **produits** (`upload.service.ts`) : recherche sur `(pharmacy_id + external_sku)` → update si trouvé, sinon create. Ré-importer le même fichier ne crée pas de doublon.

**3 trous connus :**

- **Produits sans SKU** → `existing = null` à chaque fois → doublons garantis.
- **Ventes jamais dédupliquées** (`create` sec) → ré-importer un fichier de ventes **double les ventes** → vélocité faussée. _Bug le plus impactant._
- L'index `[pharmacy_id, external_sku]` n'est pas `@@unique` → la base n'empêche pas physiquement le doublon, seul le code le fait.

> Un produit est un **état** (on remplace), une vente est un **événement** (on accumule). Les exports LGO de ventes contiennent souvent une fenêtre glissante (30 derniers jours) → besoin d'une clé de dédup `external_sku + sale_date + quantity` ou d'un remplacement par fenêtre.

### À quelle fréquence faut-il faire des imports ?

**1×/jour.**

- Cahier des charges : « upload manuel, < 5 min/jour », cron d'analyse à **02h00**.
- La vélocité se calcule sur 30 jours → un grain quotidien suffit, l'intra-journalier n'apporte rien.
- Rituel naturel : export du LGO le matin à l'ouverture.

→ Import quotidien déclenché manuellement par le titulaire, ré-analyse automatique juste après (déjà le cas dans le code).

### Au vu du contexte, une version desktop n'est-elle pas mieux qu'une version web ?

**Non — le web (PWA) est le bon choix.**

| Critère                              | Web PWA                   | Desktop                             |
| ------------------------------------ | ------------------------- | ----------------------------------- |
| Déploiement 2 officines pilotes      | URL, instantané           | installeur par poste, MAJ manuelles |
| Le LGO est déjà l'app desktop lourde | Savely = surcouche légère | redondant                           |
| Offline (F13)                        | Service Workers suffisent | sur-dimensionné                     |
| Multi-poste officine                 | n'importe quel navigateur | licence/poste                       |
| Cahier des charges                   | impose Next.js PWA        | hors stack                          |

Le seul besoin "lourd" (scan matériel) est couvert par l'**app mobile B2B Flutter + Capacitor**, pas par un desktop.

### Comment les produits passent de l'app vers l'app mobile B2C ?

**Ils ne "passent" pas — ils sont déjà au même endroit.** Une seule base PostgreSQL, plusieurs vues filtrées par rôle (RBAC) et feature-flag.

```
        ┌──────────── BACKEND NestJS + PostgreSQL ────────────┐
        │   Une seule base. Tous les produits y vivent déjà.  │
        └──────┬──────────────┬──────────────────┬───────────┘
               │              │                   │
         Web Officine    Mobile B2B          Mobile B2C  ← lit la MÊME base
         (titulaire)    (préparateur)        (clients)      via l'API
```

Quand le moteur classe un produit en `high` → action « Mise en vente B2C » → il devient éligible à la promo. L'app B2C demande à l'API « produits en promo des officines proches ». Pas de transfert, **une seule source de vérité**.

> Manque pour ça : un statut « publié en B2C » sur le produit/action + un endpoint B2C public. Petit ajout, pas une nouvelle architecture.

### Comment obtient-on les images des produits pour l'app B2C ?

🔴 **Vraie friction de faisabilité.** L'export LGO ne contient **aucune image** (cahier des charges : « données produit uniquement »). Le schéma n'a pas de champ image.

| Option                                        | Effort                        | Réaliste pour juillet ? |
| --------------------------------------------- | ----------------------------- | ----------------------- |
| Base CIP/médicaments publique (mapping CIP13) | moyen                         | partiellement           |
| Image par catégorie / placeholder             | faible                        | ✅ pour démo            |
| Upload manuel par l'officine                  | faible (code) / lourd (usage) | non                     |
| API e-commerce / scraping                     | lourd + risqué juridiquement  | non                     |

> Le B2C étant en **V2 / feature-flaggé**, pas besoin de résoudre les vraies images pour la soutenance : un mapping `catégorie → placeholder` suffit, et on documente l'enrichissement via référentiel CIP comme chantier V2 (dette tracée dans un ADR). La donnée produit (stock) ≠ donnée commerciale (visuels) : Savely ne sera jamais la source des images → service séparé.

---

## Module Don (F05)

### En quoi consiste le module des dons ? Quel est son process ?

**Le pourquoi :** un produit invendable a 3 sorties — détruire (perte sèche), solder (récupère une partie), ou **donner** (réduction d'impôt 60-75 % via reçu fiscal Cerfa). Le don est souvent **plus rentable que la destruction**. Le module matérialise cette bascille.

**Quand le don se déclenche** (piloté par le risque + la DLP) :

```
Produit en excès de stock
   ├─ DLP > 3 mois ────────►  PROMO B2C (encore vendable)
   ├─ DLP courte, invendable ►  DON ASSOCIATIF   ◄── module Don
   └─ Déjà périmé ─────────►  DESTRUCTION (vente interdite)
```

Aujourd'hui `risk-calculator.ts` envoie les `critical` vers le label `'Don associatif'`, mais **aucun processus** n'existe derrière.

**Process étape par étape :**

```
1. DÉTECTION    Produit "critical" → candidat au don
2. MATCHING     Associations dans 50 km acceptant la catégorie (géoloc)
3. PROPOSITION  Email auto à l'association (lot dispo, retrait avant le …)
4. SUIVI STATUT proposé → accepté → retiré (pickup confirmé)
5. REÇU FISCAL  PDF Cerfa (n°11580) traçable
6. VALORISATION Dashboard RSE : produits sauvés, valeur donnée, économie 75 %
```

**Données manquantes (vraie charge de travail) — absentes du schéma Prisma :**

| Entité        | Champs clés                                                        | Pourquoi       |
| ------------- | ------------------------------------------------------------------ | -------------- |
| `Association` | nom, adresse, **lat/lng**, catégories acceptées, rayon             | matching 50 km |
| `Donation`    | produit, quantité, association, **statut**, dates, valeur, n° reçu | suivi + Cerfa  |

**Points d'attention :**

- **Matching 50 km = calcul géospatial** (Haversine ou PostGIS). Nécessite un **annuaire d'associations** pré-rempli avec coordonnées (prévu dans l'Admin Global V2).
- **Statut du don = machine à états** : pas de reçu fiscal sans don _retiré_. Règle métier à rendre inviolable (BDD).
- **Dépendance au Portail Asso (F20, V2)** pour la confirmation pickup → pour la V1/démo, statut changé manuellement par le titulaire (feature-flag).

**Minimum démontrable :**

1. Modèle `Association` + `Donation` + seed de quelques assos géolocalisées.
2. Matching par distance (Haversine simple).
3. Création d'un don avec statut manuel.
4. Génération PDF Cerfa.

L'email auto et le portail asso → après / V2.

---

## Points d'action prioritaires identifiés

1. 🔴 **Déduplication des ventes** — fausse le moteur risque (le plus impactant).
2. 🔴 **SKU produit obligatoire** — sinon produits non reliables aux ventes.
3. 🟠 **Modèle de données Don** (`Association` + `Donation`) — fondation du module F05.
4. 🔴 **Auth + RBAC + isolation multi-tenant** (F01) — prérequis sécurité de tout le reste.
