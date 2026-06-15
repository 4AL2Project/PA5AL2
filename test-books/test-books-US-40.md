# Cahier de test — US-40 : Dashboard dormance (KPIs capital immobilisé)

> **User Story** : En tant que titulaire, je veux voir mon capital immobilisé et l'état de mon stock dormant en un coup d'œil, afin de piloter mes actions sans fouiller dans les données brutes.

## Pré-requis

- Backend démarré (`pnpm -F backend dev`)
- Frontend démarré (`pnpm -F frontend dev`)
- Pharmacie seedée avec produits + analyses de risque existants
- Utilisateur `TITULAIRE` authentifié (JWT)

---

## TC-01 — KPI « € immobilisés » = somme du capital_locked des dernières analyses

**Objectif** : la card affiche la somme exacte du capital immobilisé.

| #   | Étape                                                      | Résultat attendu                                                                         |
| --- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | Connecté en tant que TITULAIRE, accéder à `/`              | Dashboard visible                                                                        |
| 2   | Lire la card "Capital immobilisé"                          | Valeur = somme des `capital_locked` de la dernière analyse par produit (ex : 4 250,00 €) |
| 3   | Importer de nouveaux produits avec des `cost_price` élevés | La card se met à jour après import                                                       |

**Critère de réussite** : la valeur affichée correspond à `SELECT SUM(capital_locked) FROM risk_analysis WHERE ... (distinct by product, latest)`.

---

## TC-02 — KPI « Produits dormants » = high + critical

**Objectif** : la card compte uniquement les produits high et critical.

| #   | Étape                                              | Résultat attendu             |
| --- | -------------------------------------------------- | ---------------------------- |
| 1   | Pharmacie avec 3 produits critical, 2 high, 5 safe | Card "Produits dormants" = 5 |
| 2   | Après recalcul (un produit safe → high)            | Card passe à 6               |

---

## TC-03 — KPI « Critique » = nb produits critical

**Objectif** : la card critique n'inclut que les produits à velocity=0 ou days_of_cover ≥ 180.

| #   | Étape                       | Résultat attendu    |
| --- | --------------------------- | ------------------- |
| 1   | 3 produits critical, 2 high | Card "Critique" = 3 |
| 2   | 0 produit critical          | Card affiche 0      |

---

## TC-04 — KPI « Actions en attente » = actions EN_ATTENTE

**Objectif** : la card compte les actions non traitées.

| #   | Étape                                   | Résultat attendu              |
| --- | --------------------------------------- | ----------------------------- |
| 1   | 4 actions EN_ATTENTE, 2 VALIDEE         | Card "Actions en attente" = 4 |
| 2   | Valider une action → aller au dashboard | Card passe à 3                |

---

## TC-05 — Tableau top 10 produits dormants triés par capital desc

**Objectif** : le tableau affiche les 10 produits avec le plus grand capital immobilisé en premier.

| #   | Étape                                | Résultat attendu                                 |
| --- | ------------------------------------ | ------------------------------------------------ |
| 1   | 15 produits dormants (high/critical) | Tableau affiche 10 lignes                        |
| 2   | Vérifier l'ordre                     | Premier produit = `capital_locked` le plus élevé |
| 3   | Produits safe                        | Non inclus dans le tableau                       |

---

## TC-06 — Bandeau d'alerte si dernier import > 7 jours

**Objectif** : avertir l'utilisateur si les données sont obsolètes.

| #   | Étape                             | Résultat attendu                                                 |
| --- | --------------------------------- | ---------------------------------------------------------------- |
| 1   | `last_upload_at` = aujourd'hui    | Pas de bandeau d'alerte                                          |
| 2   | `last_upload_at` = il y a 8 jours | Bandeau orange visible "Données non mises à jour depuis X jours" |
| 3   | `last_upload_at` = null           | Bandeau non visible (état "aucun import" géré par TC-07)         |

---

## TC-07 — CTA « Importer vos données » si aucun produit importé

**Objectif** : guider l'utilisateur sans données vers l'import.

| #   | Étape                                | Résultat attendu                                              |
| --- | ------------------------------------ | ------------------------------------------------------------- |
| 1   | Pharmacie sans aucun produit importé | KPIs affichent 0, bouton "Importer vos données" visible       |
| 2   | Cliquer sur le bouton                | Redirection vers `/upload` ou ouverture de la modale d'import |
| 3   | Après import de produits             | CTA disparaît                                                 |

---

## TC-08 — RBAC : montants masqués pour PREPARATEUR

**Objectif** : un préparateur ne voit pas les montants financiers.

| #   | Étape                                           | Résultat attendu                 |
| --- | ----------------------------------------------- | -------------------------------- |
| 1   | Connecté en tant que PREPARATEUR, accéder à `/` | Dashboard visible                |
| 2   | Lire la card "Capital immobilisé"               | Valeur masquée (—)               |
| 3   | Lire le tableau dormants                        | Colonne "Capital" masquée ou `—` |

---

## TC-09 — Warning si cost_price absent sur certains produits

**Objectif** : avertir que le capital est partiel si des produits n'ont pas de `cost_price`.

| #   | Étape                                   | Résultat attendu                                                     |
| --- | --------------------------------------- | -------------------------------------------------------------------- |
| 1   | Importer des produits sans `cost_price` | Card capital affiche une indication "Partiel" ou icône avertissement |
| 2   | Tous les produits ont `cost_price`      | Aucun avertissement                                                  |

---

## TC-10 — Isolation tenant

**Objectif** : chaque pharmacie ne voit que ses propres données.

| #   | Étape                                 | Résultat attendu                             |
| --- | ------------------------------------- | -------------------------------------------- |
| 1   | Pharmacie A avec 10 produits dormants | Dashboard A : 10 produits dormants           |
| 2   | Connecté en tant que pharmacie B      | Dashboard B : ses propres données uniquement |
