# Hébergement cible — OVH France (RGPD)

## Cible

Savely traite des données issues d'officines pharmaceutiques. L'hébergement
cible est **OVHcloud, sur des datacenters situés en France** (région
`GRA` Gravelines ou `RBX` Roubaix).

| Composant                     | Service OVH                                       |
| ----------------------------- | ------------------------------------------------- |
| Base de données PostgreSQL 16 | Managed Databases (région France)                 |
| Backend NestJS (`backend`)    | Instance Public Cloud / conteneur (région France) |
| Frontend Next.js (`frontend`) | Instance Public Cloud / conteneur (région France) |

## Conformité RGPD

- **Localisation des données** : l'ensemble des données (base PostgreSQL,
  sauvegardes, journaux) reste hébergé **en France**, sous juridiction de
  l'Union européenne.
- **Souveraineté** : OVHcloud est un hébergeur français, non soumis au
  _Cloud Act_ américain, ce qui limite les risques de transfert hors UE.
- **Données personnelles** : les comptes pharmacie (email) et données de
  stock constituent des données à protéger ; aucune donnée n'est répliquée
  hors des datacenters français.
- **Sauvegardes** : les sauvegardes de la base sont conservées dans la même
  région France.

## Démarrage local équivalent

L'environnement de développement reproduit cette stack via `docker compose up`
(voir `docker-compose.yml` à la racine et `.env.example`). La même image
backend/frontend est déployable sur les instances OVH décrites ci-dessus.
