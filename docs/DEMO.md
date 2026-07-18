# Scénario de démo

## Pré-requis

```bash
docker compose up -d postgres
pnpm -F backend prisma:migrate:deploy
pnpm -F backend prisma:seed        # idempotent
pnpm -F backend dev                # API :3005
pnpm -F frontend dev               # Web :3000
```

Comptes seed :

| Rôle      | Email             | Mot de passe |
| --------- | ----------------- | ------------ |
| Admin     | admin@savely.fr   | admin1234    |
| Titulaire | demo@cosmorisk.fr | demo1234     |

> En dev, mettre `EMAIL_TRANSPORT=smtp` (backend/.env) et lancer MailHog
> (`docker compose up -d mailhog`, UI sur http://localhost:8025) pour voir
> tous les emails du cycle don sans clé Resend.

## Scénario don : de la validation au Cerfa

Le seed crée 3 associations autour de la pharmacie démo (République, Paris 11e) :

| Association                    | Rayon d'action | Particularité                                   |
| ------------------------------ | -------------- | ----------------------------------------------- |
| Solidarité Quartier République | 5 km           | asso de quartier, la plus proche                |
| Entraide Île-de-France         | 60 km          | domiciliée à Créteil, couvre toute l'IDF        |
| Les Oubliés du Retrait         | 30 km          | **non fiable** : 3 retraits manqués au compteur |

1. **Validation du don (titulaire)** — Centre d'actions → un produit suggéré
   « Don associatif » → Gérer. Le dialog affiche « N associations éligibles
   dans la zone » : le titulaire ne choisit plus l'asso, il confirme la
   quantité (mode avancé replié : « proposer d'abord à… »). À la validation,
   l'orchestrateur crée le lot et envoie la première proposition — la
   fiabilité fait passer « Les Oubliés du Retrait » derrière les deux autres.

2. **Réponse de l'asso (page publique tokenisée)** — ouvrir l'email
   « proposition de don » dans MailHog, suivre le lien `/don/:token`
   (mobile-first, aucune connexion). Trois choix : tout accepter, accepter
   partiellement (steppers par ligne), refuser (motif optionnel). Le créneau
   de retrait (fenêtres hebdo de l'officine, éditables dans Paramètres) se
   choisit sur la même page — acceptation + créneau = un seul POST.

3. **Cascade automatique** — refuser ou laisser expirer (cron horaire) : le
   système passe à l'asso suivante, sans intervention du titulaire. Une
   acceptation partielle re-propose immédiatement le reliquat. Rejouer le
   lien déjà utilisé → page d'état propre (« proposition remplacée »), jamais
   d'erreur brute.

4. **Retrait et Cerfa** — la page /don/:token acceptée affiche un **QR code**
   que l'asso présente au retrait : le préparateur le scanne (app Flutter,
   endpoint `POST /api/donations/pickup/scan`) pour confirmer — le web
   titulaire reste un fallback (page Dons). Allocation RETIREE → reçu
   **Cerfa 16216** (dons des entreprises, art. 238 bis CGI) généré **par
   allocation**, valorisé au **coût de revient HT** (prix d'achat grossiste,
   jamais le prix catalogue), envoyé à l'asso + téléchargeable. Quand tout le
   lot est retiré → don COMPLETEE. Le bilan RSE affiche l'économie fiscale
   (**60 %** de la valeur donnée, plafond 20 000 € ou 0,5 % du CA HT).

5. **Échec** — si 5 assos sollicitées (ou 21 jours) sans preneur, le don
   passe ECHOUEE : l'action revient au centre d'actions avec le bandeau
   « Le don n'a pas trouvé preneur » et la page détail du don garde toute la
   timeline (audit trail complet, chaque transition horodatée).

## Auto-inscription d'une association

1. Page publique `/associations` : formulaire avec autocomplete d'adresse
   (API Adresse), slider de rayon d'action (5–100 km), catégories acceptées.
   Champ honeypot + rate limit par IP.
2. Email de vérification (48 h) → clic → « demande en cours d'examen ».
3. Back-office admin → Associations : la file « En attente de validation »
   liste la demande avec lien RNA/SIREN vers le répertoire national et la
   case « éligibilité reçu fiscal vérifiée ». Valider → l'asso entre dans le
   matching ; Rejeter (motif) → email de refus.
4. Fiche asso (icône stats) : zone d'action, taux de réponse/récupération,
   score de fiabilité utilisé par le matching, historique des retraits.

## Annuaire des associations (web titulaire)

Menu « Associations » : recherche, filtres catégorie et tri
distance/fiabilité. La fiche détail montre les créneaux de passage déclarés
par l'asso (V1 statiques, croisés avec les fenêtres de l'officine au moment
de planifier un retrait), la fiabilité, l'historique des dons de l'officine
avec les Cerfa téléchargeables, et le total donné avec l'économie fiscale
(60 %). Le bouton « Modifier » ouvre un panneau d'édition (coordonnées,
catégories, créneaux).

## Arbitrage Promo B2C vs Don

Pour un produit **HIGH** avec des assos éligibles, le dialog de validation
affiche l'arbitrage : gain estimé de la promo vs économie fiscale du don
(60 % du coût de revient), avec « Laisser Savely choisir » ou « Choisir
moi-même ». Un produit **CRITICAL** part directement en don ; sans asso
éligible, seule la promo est proposée. Un produit sans prix d'achat ne peut
pas être donné (la valorisation fiscale serait impossible).
