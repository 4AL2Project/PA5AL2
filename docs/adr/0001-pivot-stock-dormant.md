# ADR 0001 — Pivot du moteur de risque vers la détection de stock dormant

- **Statut :** Proposé
- **Date :** 2026-06-01
- **Déciders :** Roger (transverse), Gilles (backend), Clément (mobile)
- **Tags :** `produit`, `architecture`, `pivot`, `data`

---

## Contexte

Savely a été conçu autour de la **détection des produits proches de la péremption** (DLP — Date Limite de Péremption). Tout le moteur de risque, le moteur d'actions et le module de don associatif reposent sur la propriété `expiry_date` du produit.

À la première confrontation avec un **export LGO réel** (Winpharma, LGPI, Smart RX), nous avons constaté que **la DLP ne figure pas dans l'export standard de produits ni de ventes**. Les colonnes disponibles sont :

- **Produits :** `external_sku`, `name`, `category`, `brand`, `stock_quantity`, `unit_price`, `cost_price`
- **Ventes :** `external_sku`, `sale_date`, `quantity_sold`, `unit_price_sold`

La DLP est bien manipulée par les LGO (notamment au scan DataMatrix à la dispensation depuis la directive FMD 2019), mais elle n'est pas exposée dans les exports standards à notre disposition.

**Conséquence directe :** poursuivre l'implémentation actuelle reviendrait à présenter en soutenance un produit qui ne fonctionne que sur **des données fictives**, ce qui est incompatible avec l'engagement client (deux officines pilotes) et avec les exigences académiques d'un projet de Mastère Architecture Logicielle.

## Décision drivers

1. **Livrer un produit fonctionnel sur des données 100 % réelles** d'ici la soutenance finale (semaine du 13 juillet 2026).
2. **Préserver au maximum les fondations** déjà investies (auth, multi-tenant, import, dashboard, mobile).
3. **Conserver une histoire produit cohérente** et chiffrable pour le client pilote.
4. **Démontrer une démarche d'architecte** : confronter le design à la réalité et adapter, plutôt qu'inventer la donnée.

## Options considérées

| Option                                            | Description                                                                                                                              | Verdict                                                                                   |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **A. Continuer sur la DLP avec données fictives** | Maintenir l'architecture telle quelle, peupler `expiry_date` avec un seed inventé.                                                       | Rejetée — incompatible avec l'engagement client et académique.                            |
| **B. Pivot Anti-Stock Dormant** (choisi)          | Remplacer la métrique cœur `days_to_expiry` par `days_of_cover`. Garder l'architecture, l'API, les 3 niveaux et la majorité des actions. | **Retenue**.                                                                              |
| C. Capture DLP via scan mobile DataMatrix         | Demander aux préparateurs de scanner chaque boîte à la réception pour capturer DLP + lot.                                                | Reportée en V2 — demande de la discipline opérationnelle, ne couvre pas la parapharmacie. |
| D. Demander un export enrichi au LGO              | Solliciter Winpharma & co pour exposer la DLP dans l'export.                                                                             | Hors délais — décision commerciale, non maîtrisable côté projet.                          |
| E. Lean Recall + Analytics ventes uniquement      | Couper le moteur de risque, ne garder que les modules qui marchent sans DLP.                                                             | Périmètre trop restreint — perte du narratif anti-gaspillage.                             |

## Décision retenue

**Pivoter le moteur de risque vers la détection de stock dormant** (Option B). La métrique cœur passe de _"jours avant péremption"_ à _"jours de couverture de stock"_. Les niveaux, les actions et l'architecture restent.

### Nouvelle formule

```
days_of_cover    = stock_quantity / velocity_30d        (∞ si velocity = 0)
capital_immobilise = stock_quantity × cost_price

Classification (3 niveaux identiques) :
  days_of_cover < 60j   → safe       (rotation saine)
  days_of_cover < 180j  → high       (excédentaire — promo / transfert)
  days_of_cover ≥ 180j  → critical   (dormant — don associatif)
  velocity_30d == 0     → critical   (rotation nulle)
```

### Nouveau plan d'actions

| Niveau     | Actions disponibles                                                            |
| ---------- | ------------------------------------------------------------------------------ |
| `safe`     | Aucune                                                                         |
| `high`     | Promo B2C · Transfert inter-officines · Réduire prochaine commande             |
| `critical` | Don associatif (reçu fiscal Cerfa) · Retour fournisseur (si contrat le permet) |

L'action _"Destruction"_ disparaît (sans péremption, rien à détruire). L'action _"Réduire prochaine commande"_ apparaît — valeur ajoutée immédiate au pharmacien.

### Reformulation produit

| Avant                                   | Après                                    |
| --------------------------------------- | ---------------------------------------- |
| _"Détectez vos péremptions imminentes"_ | _"Détectez vos stocks dormants"_         |
| _"Réduisez vos destructions"_           | _"Libérez votre capital immobilisé"_     |
| KPI : € en risque de péremption         | KPI : **€ immobilisés en stock dormant** |

Le narratif anti-gaspillage est préservé : il s'agit toujours d'éviter une perte, mais une perte de **capital** plutôt que de **produit**.

## Changements code & schéma

### Schéma Prisma

- `Product.expiry_date` → **devient optionnel** (`DateTime?`).
- `Product.lot_number` → reste prévu (Recall), optionnel.
- `RiskAnalysis.days_to_expiry` → renommé `days_of_cover`.
- `RiskAnalysis` reste — c'est toujours du risque (de dormance).

### Backend

| Fichier                   | Modification                                                     | Effort |
| ------------------------- | ---------------------------------------------------------------- | ------ |
| `risk-calculator.ts`      | Réécriture de `calculateRisk()` selon la nouvelle formule        | ~2h    |
| `sales-velocity.ts`       | Inchangé                                                         | 0      |
| `analysis.service.ts`     | Adaptation noms de champs                                        | 30 min |
| `analysis.job.ts`         | Inchangé                                                         | 0      |
| `dashboard.controller.ts` | KPIs reformulés (`total_capital_locked`, top dormants)           | 1h     |
| `seed.ts`                 | Suppression des DLP fictives, accent sur la variété des vitesses | 30 min |

### Frontend

- Renommage des labels (péremption → dormance, € en risque → € immobilisés).
- Adaptation `stats-card`, `risk-chart`, `risk-table`.

**Effort total estimé : ~1 semaine équipe** pour un pivot complet en TDD.

## Impact sur le backlog (Notion)

| US                   | Impact                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| US-02 Schéma socle   | `expiry_date` devient optionnel                                        |
| US-10 Import         | Inchangé                                                               |
| US-20 Calcul risque  | Réécrit selon nouvelle formule (retourne _À faire_)                    |
| US-21 Moteur actions | Reformulé : par niveau de rotation, pas par DLP                        |
| US-30 Don associatif | Conservé, narratif renforcé (assos préfèrent les non-périssables)      |
| US-31 Recall         | Conservé pour valeur réglementaire (saisie manuelle V1 si pas de scan) |
| US-40 Dashboard      | KPI principal devient _€ immobilisés_                                  |
| Reste du backlog     | Inchangé                                                               |

## Ce que nous décidons explicitement de NE PAS faire

- **Ne pas inventer de DLP fictive** dans le seed pour faire tourner l'ancien moteur.
- **Ne pas attendre** un export LGO enrichi (négociation commerciale hors timing).
- **Ne pas couper** le module Don — il reste pertinent et même plus attractif pour les associations.
- **Ne pas reporter** le scan DataMatrix au point de bloquer la soutenance — il reste en roadmap (V2) comme capture progressive de DLP.

## Conséquences

### Positives

- Le produit tourne sur **données 100 % réelles** dès l'intégration des exports LGO.
- L'architecture (multi-tenant, 3 niveaux, actions, dashboard, mobile) **survit intacte** — preuve d'un design qui supporte le pivot.
- Le narratif **"stock dormant = € immobilisés"** parle directement aux pharmaciens (trésorerie chiffrable).
- L'histoire du pivot devient un **atout de soutenance** (capacité à itérer face au réel).
- Les modules les plus solides (auth, multi-tenant, import, recall) ne sont pas touchés.

### Négatives / risques

- Perte du narratif **"anti-péremption"** viscéral pour la presse / le grand public.
- Le don associatif perd l'urgence d'une date couperet — moins de pression sur l'action.
- Les seuils `60/180 jours` sont posés en dur ; ils devront être validés / calibrés avec le client pilote.
- Le moteur réécrit (US-20) repasse en _À faire_, donc redescend dans le Kanban.
- L'action **"Réduire prochaine commande"** suppose qu'on connaît le cycle de commande — donnée non présente dans l'export, à manipuler comme indicateur, pas comme action automatique.

## Questions ouvertes

1. **Recall (US-31) :** on conserve, mais comment alimenter `lot_number` avant le scan mobile ? Saisie manuelle V1 OU feature reportée ?
2. **Seuils 60/180j :** en dur V1, configurables V2 — ou configurables dès V1 par `pharmacy.subscription_tier` ?
3. **Action "Réduire prochaine commande" :** simple indicateur affiché, ou véritable action persistée avec statut ?
4. **Fenêtre de calcul de la vélocité :** 30 jours comme aujourd'hui, ou 90 jours pour absorber la saisonnalité (été/hiver) ?
5. **Communication client pilote :** comment annoncer le pivot aux officines pilotes — comme évolution naturelle ou comme correction de cap ?

## Liens

- Backlog Notion : _Savely — Suivi de Projet_
- [USER-STORIES.md](../../USER-STORIES.md)
- [QUESTIONS-PROJET.md](../QUESTIONS-PROJET.md)
- Cahier des charges technique V1.0 (avril 2026)
