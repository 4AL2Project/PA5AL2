# BC Stock/Import — Architecture DDD Tactique

Ce module implémente le use case central de Savely : **importer un stock CSV et générer les actions sur les produits à risque**.

---

## Structure

```
stock/
├── domain/               ← Zéro import NestJS, Prisma ou librairie externe
│   ├── model/            ← Aggregat + Value Objects
│   ├── events/           ← Domain Events (immutables, au passé)
│   ├── exceptions/       ← Exceptions métier
│   ├── repository/       ← Interface Port Out (pas d'implémentation ici)
│   └── services/         ← Domain Services (logique orpheline)
├── application/
│   ├── handlers/         ← Use Cases / Application Services
│   └── ports/            ← Interfaces Port In et Port Out
├── infrastructure/
│   ├── persistence/      ← Adapters repository (Prisma, InMemory)
│   ├── csv/              ← Adapters parsing LGO (ACL)
│   ├── events/           ← Adapter event bus
│   └── http/             ← Adapter HTTP (Controller NestJS)
└── tests/fixtures/       ← Données de test CSV par format LGO
```

---

## Règles d'architecture (à ne pas violer)

| Couche         | Peut importer               | Ne peut PAS importer        |
|----------------|-----------------------------|-----------------------------|
| `domain/`      | Rien (TypeScript pur)       | NestJS, Prisma, csv-parser  |
| `application/` | `domain/` uniquement        | NestJS, Prisma               |
| `infrastructure/` | `application/` + `domain/` | Rien d'interdit             |

---

## Flux du use case

```
HTTP POST /stock/import
    │
    ▼
StockController          ← Adapter In : traduit HTTP → Command
    │
    ▼
ImporterStockHandler     ← Port In : orchestre le use case
    │
    ├─► CsvParserAdapter ← Port Out : parse le CSV selon le format LGO
    │       └─► LgoFormatDetector (ACL : Winpharma / LGPI / Smart RX)
    │
    ├─► Produit.create() ou Produit.mettreAJour()   ← Aggregate Root
    │
    ├─► Produit.calculerRisque(CalculateurRisque)   ← Domain Service
    │       └─► Émet ProduitPasseCritical si HIGH ou CRITICAL
    │
    ├─► ProduitRepository.save()   ← Port Out
    │
    └─► EventBus.publishAll()      ← Port Out
            ├─► ProduitPasseCritical → GenererActionHandler (BC Actions)
            └─► StockImporte        → Dashboard (futur)
```

---

## Règles métier de risque

| Niveau    | Condition                         | Action recommandée         |
|-----------|-----------------------------------|----------------------------|
| CRITICAL  | DLP ≤ 30 jours ou produit périmé  | Don à une association      |
| HIGH      | DLP entre 31 et 90 jours          | Vente promotionnelle       |
| SAFE      | DLP > 90 jours                    | Aucune action requise      |

---

## Formats LGO supportés

| Système   | Séparateur | Colonnes clés                                        |
|-----------|-----------|------------------------------------------------------|
| Winpharma | `;`       | `SKU`, `NOM_PRODUIT`, `QUANTITE`, `DATE_PEREMPTION`  |
| LGPI      | `,`       | `code_article`, `libelle`, `qte_stock`, `dluo`        |
| Smart RX  | `,`       | `ref_produit`, `designation`, `stock`, `date_expiration` |

---

## Lancer les tests

```bash
# Tous les tests
npm test

# Avec couverture (cible : >80% sur domain/ et application/)
npm run test:coverage

# En mode watch pendant le développement
npm run test:watch
```

---

## Ajouter un nouveau format LGO

1. Ajouter l'entrée dans `LgoFormat` enum (`LgoFormatDetector.ts`)
2. Ajouter la signature de colonnes dans `SIGNATURES`
3. Ajouter le mapping dans `mapLigne()`
4. Créer une fixture dans `tests/fixtures/`
5. Ajouter les tests de détection

---

## Brancher les notifications (futur)

Le BC Notifications s'abonnera aux Domain Events via l'`EventBusPort`.
Aucune modification de ce module ne sera nécessaire — principe Open/Closed.

```typescript
// Dans NotificationsModule :
eventBus.subscribe(ProduitPasseCritical, (event) => notifier(event.payload));
eventBus.subscribe(StockImporte, (event) => notifier(event.payload));
```
