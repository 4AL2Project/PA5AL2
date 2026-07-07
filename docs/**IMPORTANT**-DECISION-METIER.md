# Système de revalorisation du stock dormant — synthèse d'architecture

> Officines / parapharmacies. À partir des fichiers de stock et de ventes d'une pharmacie, le système détecte les produits dont le capital dort, puis propose deux débouchés : vente B2C en click & collect à prix réduit, ou don à une association.

---

## 1. Le vrai périmètre

Le « click & collect » n'est qu'un des deux débouchés. Le cœur du système est ailleurs : c'est un **moteur d'analyse du stock dormant**. Le C&C et le don sont ses deux sorties.

Deux mondes de natures opposées cohabitent, et la qualité de l'architecture tient à les **séparer proprement** :

|            | Monde analytique / batch                             | Monde transactionnel / temps réel         |
| ---------- | ---------------------------------------------------- | ----------------------------------------- |
| Quoi       | Ingestion fichiers, calcul du risque, classification | Le click & collect : offres, réservations |
| Rythme     | Périodique, lourd, ponctuel                          | Continu, petites écritures                |
| Contrainte | Tolérant à la latence                                | Cohérence forte, faible latence           |
| Outil clé  | File de jobs (BullMQ) pour découpler                 | Transaction + verrou pour sérialiser      |

---

## 2. Modèle de données

### 2.1 Nature des produits

Les produits sont des **SKU à quantité** (un code → une quantité entière), pas des pièces uniques. « Revalorisé » = stock qu'on veut faire revivre commercialement, pas objet singulier. Conséquence : réserver = décrémenter logiquement un compteur, comme un C&C classique.

### 2.2 Entités existantes (côté amont, déjà solide)

- `Pharmacy` — ancre multi-tenant ; `pharmacy_id` présent sur toutes les entités.
- `User` / `AuthToken` — le **pharmacien** (rôle `TITULAIRE`…). À ne pas confondre avec le client B2C.
- `Product` — source de vérité : `external_sku`, `stock_quantity`, `unit_price`, `cost_price`. Unique sur `(pharmacy_id, external_sku)`.
- `Sale` — **historique** des ventes passées, importé du fichier. Sert _uniquement_ à l'analyse. Ne jamais réutiliser pour les ventes B2C.
- `RiskAnalysis` — entité **calculée** (bien isolée du référentiel) : `days_of_cover`, `sales_velocity_30d`, `risk_level`, `suggested_action`.
- `Action` — remédiation choisie : `type` ∈ `{B2C, DON}`, `status`.
- `Association` / `Donation` — branche don, jusqu'au Cerfa.

### 2.3 Entités manquantes identifiées

La branche B2C s'arrêtait à `Action (type = B2C)` : aucune entité en aval. À ajouter :

- **`Customer`** — le client de l'app B2C. Population distincte du `User` pharmacien (auth séparée).
- **`Offer`** (ou `Listing`) — la **mise en vente** d'un produit sur l'app : `product_id`, `prix_de_base`, `prix_soldé`, `quantité_offerte`, point de retrait. C'est ce que voit le client, pas le `Product` interne.
- **`Order`** — la **réservation** par un `Customer` sur une `Offer` : `quantité`, cycle de vie `RÉSERVÉ → PRÊT → RETIRÉ` (+ `EXPIRÉ` / `ANNULÉ`).
- **`Import`** (ou `FileUpload` / `IngestionRun`) — trace métier de chaque dépôt de fichier (voir §5).

### 2.4 Chaîne B2C complète

```
Action (B2C)  →  Offer (prix soldé, quantité offerte)  →  Order (Customer réserve k unités)  →  retrait
```

---

## 3. Le point dur : réservation & concurrence

### 3.1 Le piège du compteur

Ne **jamais** stocker un compteur `quantité_restante` que chaque `Order` décrémente. Deux commandes simultanées lisent « 3 », décrémentent, écrivent « 2 » → on vend 4 unités sur 3 (_lost update_).

### 3.2 La bonne modélisation

- `Product.stock_quantity` = stock total réel (jamais touché par le C&C).
- `Offer.quantité_offerte` = quantité exposée, **fixe**.
- Disponible = `quantité_offerte − Σ(Order actifs sur cette Offer)` → **calculé**, jamais un champ écrasé.

### 3.3 Les trois familles de garde-fous (du plus bas au plus haut)

1. **Contrainte en base** — PostgreSQL refuse physiquement plus d'`Order` actifs que la quantité offerte. Impossible à contourner.
2. **Verrou transactionnel** — `SELECT … FOR UPDATE` sur la ligne `Offer` : le 2ᵉ client attend la fin de la 1ʳᵉ transaction au lieu de lire en même temps.
3. **File série** — une seule queue, un seul worker traite les réservations une par une (BullMQ). Plus de simultanéité du tout.

### 3.4 Choix pour ce projet

Trafic modéré, quelques unités par offre → **`FOR UPDATE`** (éventuellement + contrainte base) suffit largement. BullMQ pour _sérialiser_ le C&C = sur-dimensionnement ici.

---

## 4. Architecture applicative : monolithe modulaire

**Décision : monolithe**, pas microservices. Le coût des microservices est opérationnel (déploiement multiplié, observabilité distribuée, réseau faillible, cohérence éclatée) — taxe énorme pour une personne seule, bénéfice nul à cette échelle.

Mais « monolithe » ≠ « tout mélangé ». **Monolithe modulaire** : un déployable, une base, des frontières internes nettes (modules NestJS).

- `IngestionModule` — upload, parsing, normalisation, écriture `Product`/`Sale`.
- `AnalysisModule` — calcul `RiskAnalysis`, classification, suggestion d'action.
- `OfferModule` / `CatalogModule` — mise en vente, `Offer`.
- `OrderModule` — C&C transactionnel, réservation, `FOR UPDATE`.
- `DonationModule` — branche don, Cerfa, `Association`.
- `AuthModule` + transverses.

**Règle d'or** : un module expose une **interface** (service public) ; les autres passent par elle, jamais par les tables d'un autre module. Garde la liberté de découper plus tard _si_ la charge l'exige, sans payer la taxe aujourd'hui.

---

## 5. Flux d'ingestion (le bon usage de BullMQ)

Ici BullMQ sert à **découpler** une tâche lourde du cycle requête/réponse (≠ sérialiser le C&C).

```
Upload (l'API répond immédiatement : « reçu, en cours »)
   → job déposé en file
   → worker : parse le fichier, normalise (voir §6)
   → écrit / met à jour Product + Sale
   → déclenche le calcul des RiskAnalysis
   → met à jour les Action suggérées
```

Gains gratuits : **reprise sur échec** (rejoue sans réupload), **traçabilité** (statut du job), **lissage de charge** (plusieurs pharmacies en parallèle).

Frontière `IngestionModule` ↔ `AnalysisModule` = **asynchrone et explicite** : l'un dépose un job, l'autre le ramasse. Couplage faible.

### Entité `Import` (≠ Job BullMQ)

Le `Job` BullMQ est éphémère (Redis, disparaît une fois traité). L'`Import` est l'**historique métier persistant** d'un dépôt :

- `id`, `pharmacy_id`
- `file_name`, `uploaded_at`
- `status` : `EN_ATTENTE → EN_COURS → TERMINÉ / ÉCHOUÉ`
- `rows_total`, `rows_ok`, `rows_failed`
- `errors` (détail ligne par ligne ou lien vers rapport)

Le `Job` porte juste `import_id`. Remplace le champ `last_upload_at` de `Pharmacy` (qui n'avait pas d'historique). Côté pharmacien : voir l'avancement, les lignes en erreur, corriger et réuploader.

---

## 6. Moteur d'analyse du risque (cœur métier)

### 6.1 Métriques

```
velocity   = ventes_30j / 30          (produits vendus par jour)
couverture = stock / velocity          (jours avant épuisement au rythme actuel)
```

### 6.2 Le cas qui casse la formule : velocity = 0

Très fréquent dans les fichiers réels (stock présent, zéro vente sur la période) — et c'est **le cœur de cible** : le stock le plus dormant est celui qui ne bouge pas. Il faut traiter le cas **avant** de diviser :

- `velocity = 0` et `stock > 0` → couverture = ∞ → `risk_level = critical` d'office.
- `velocity = 0` et `stock = 0` → rien à revaloriser → ignoré / `safe`.
- sinon → `couverture = stock / velocity`, comparée aux seuils.

### 6.3 Seuils (point de départ)

| `risk_level` | Couverture     |
| ------------ | -------------- |
| `safe`       | < 60 jours     |
| `high`       | 60 – 180 jours |
| `critical`   | > 180 jours    |

**Ne pas coder ces nombres en dur.** Les externaliser (config, voire colonne sur `Pharmacy`) → ajustables sans redéploiement. Le `AnalysisModule` _lit_ les seuils, ne les _contient_ pas. Raisons : saisonnalité (solaire en décembre), taille d'officine.

> Réflexe systématique : **confronter les seuils aux données réelles** — est-ce que mes bornes mettent les bons produits dans les bonnes cases sur mes vraies lignes ?

### 6.4 Chaîne métier complète

```
Import → Product + Sale → velocity → couverture (cas v=0 → ∞ → critical)
       → seuils → risk_level → suggested_action → Action validée par le pharmacien (B2C / don)
```

### 6.5 Question ouverte : fenêtre de calcul de la velocity

Les fichiers ont des colonnes mensuelles sur 18 mois (`avr26 … nov24`) + une colonne `Moy.` pré-calculée. 30 jours = court et nerveux ; moyenne longue = lisse mais réagit lentement. **À creuser.**

---

## 7. Le mur de l'hétérogénéité des fichiers (architecture clé)

Les fichiers varient d'une pharmacie à l'autre (logiciels de caisse différents : DIRECTLOG, Winpharma, LGPI, Smart Rx… → noms de colonnes, ordre, formats de date, séparateurs, colonnes présentes ou non).

**Principe** : le **format externe** (chaotique, subi, différent partout) ne doit jamais contaminer le **modèle interne** (`Product`, `Sale`, stable). Une couche de traduction normalise toute donnée entrante vers la **forme canonique** ; tout le reste du système ne connaît que cette forme.

Vit dans `IngestionModule`. Pièce maîtresse : un **mapping par source** (« colonne _Code produit_ → `external_sku`, _Stock_ → `stock_quantity`, _Moy._ → velocity pré-calculée… »). Le parser lit le mapping, ne code pas les colonnes en dur.

**Gouvernance** : les mappings sont créés/validés par l'éditeur (toi), pas par les pharmacies — le coût d'un mauvais mapping (stocks mal lus → analyses fausses → produits bradés à tort) est trop élevé pour du libre-service.

**Évolution** : un LLM pourra _proposer_ le mapping d'un format inconnu (suggestion colonne → champ), validé par un humain. Bon usage : enlève le fastidieux, garde l'humain sur la décision critique. Jamais appliqué les yeux fermés.

---

## 8. Récapitulatif des décisions

| Sujet                  | Décision                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------- |
| Nature produit         | SKU à quantité (pas pièce unique)                                                       |
| Modèle B2C             | Ajouter `Customer`, `Offer`, `Order`                                                    |
| Disponibilité          | Calculée (`offerte − Σ orders actifs`), jamais un compteur                              |
| Concurrence            | `FOR UPDATE` (+ contrainte base) ; pas de file pour ça                                  |
| Architecture           | Monolithe modulaire NestJS, modules à interfaces                                        |
| BullMQ                 | Pour découpler l'ingestion batch (pas pour le C&C)                                      |
| Traçabilité ingestion  | Entité `Import` (≠ Job BullMQ éphémère)                                                 |
| Calcul risque          | `couverture = stock / velocity`, cas `v=0 → ∞ → critical`                               |
| Seuils                 | 60 / 180 j, **externalisés** en config                                                  |
| Hétérogénéité fichiers | Couche de normalisation + mapping par source, géré par l'éditeur, assisté LLM plus tard |

## 9. Restant à creuser

- Fenêtre temporelle du calcul de velocity (30 j vs moyenne longue vs `Moy.` du fichier).
- Cycle de vie détaillé de l'`Order` (expiration d'une réservation non retirée → réintégration de la quantité).
- Modèle complet de données mis au propre (diagramme entité-relation final).
