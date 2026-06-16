# Savely

Savely aide les pharmacies à récupérer la trésorerie immobilisée dans leur **stock dormant** en transformant leurs exports LGO en un plan d'actions priorisé : écouler (B2C) ou donner (associations, reçu Cerfa).

## Language

**Pharmacy** :
Officine multi-tenant, unité d'isolation de toutes les données.
_Avoid_ : officine, tenant, organisation

**Product** :
Article de parapharmacie ou médicament OTC identifié par son `external_sku` (SKU LGO).
_Avoid_ : article, médicament, item

**Stock dormant** :
Produit dont le `days_of_cover` dépasse 60 jours (high) ou 180 jours / velocity nulle (critical).
_Avoid_ : produit périmé, stock mort, stock excessif

**days_of_cover** :
Métrique cœur : `stock_quantity / velocity_30d`. Infini si velocity = 0.
_Avoid_ : jours de stock, couverture de stock

**capital_immobilisé** :
`stock_quantity × cost_price` pour un produit dormant.
_Avoid_ : valeur immobilisée, perte potentielle

**RiskAnalysis** :
Snapshot quotidien du niveau de dormance d'un produit (calculé par le cron 2h).
_Avoid_ : StockAnalysis (terme cible du pivot, pas encore renommé dans le code)

**Action** :
Décision de remédiation prise par le Titulaire sur un produit dormant (type B2C ou DON, machine à états EN*ATTENTE → VALIDEE / IGNOREE / SNOOZEE).
\_Avoid* : tâche, recommandation

**Offer** :
Publication d'un produit dormant à prix remisé par le Titulaire, visible des Customers (V2 click & collect).
_Avoid_ : promotion, annonce, listing

**Order** :
Réservation d'une Offer par un Customer, avec machine à états : RESERVEE → EN*PREPARATION → PRETE → RETIREE / ANNULEE / EXPIREE.
\_Avoid* : commande, panier, booking

**Customer** :
Compte léger (email + téléphone) d'un acheteur B2C qui réserve des Offers sur Savely.
_Avoid_ : ClientB2C, client, utilisateur B2C, acheteur

**Hold** :
Réservation logique de quantité sur une Offer à la création d'un Order. N'affecte pas `stock_quantity` — c'est un compteur sur l'Offer. Expire après 24 h si le retrait n'est pas effectué (cron horaire).
_Avoid_ : lock, blocage, réservation de stock

**Import** :
Trace persistante d'un dépôt de fichier CSV/XLSX (machine à états EN*ATTENTE → EN_COURS → TERMINÉ / ÉCHOUÉ).
\_Avoid* : upload, dépôt, fichier

**Donation** :
Transfert d'un produit dormant à une Association bénéficiaire, machine à états PROPOSEE → ACCEPTEE → RETIREE / REFUSEE. Génère un reçu Cerfa uniquement si RETIREE.
_Avoid_ : don, cession, transfert

**Association** :
Organisme bénéficiaire de Donations, géolocalisé (≤ 50 km de la Pharmacy).
_Avoid_ : asso, organisme

**Titulaire** :
Rôle décideur de la Pharmacy (RBAC). Voit les finances, publie les Offers, valide les Donations.
_Avoid_ : pharmacien, admin officine

**Préparateur** :
Rôle exécutant terrain (RBAC). Prépare les Orders, valide les retraits. Ne voit jamais les marges.
_Avoid_ : pharmacien adjoint, technicien

## Relationships

- Une **Pharmacy** possède de nombreux **Products**, **Imports**, **Actions**, **Offers**, **Donations**
- Un **Product** a une seule **Action** active à la fois
- Une **Action** de type B2C peut générer une **Offer**
- Une **Offer** peut avoir plusieurs **Orders**
- Un **Order** appartient à un seul **Customer** et une seule **Offer**
- Un **Order** crée un **Hold** sur le stock de l'**Offer** à la réservation
- Une **Action** de type DON génère une **Donation**
- Une **Donation** produit un reçu Cerfa uniquement si son statut est RETIREE

## Flagged ambiguities

- "ClientB2C" dans `ANALYSE-METIER.md` et le schema Prisma = **Customer** (résolu)
- "StockAnalysis" dans `ANALYSE-METIER.md` = **RiskAnalysis** dans le code (pivot non encore appliqué — ne pas renommer avant US-20)
