# Savely — Refonte Backend en DDD Tactique
## Support de soutenance — Partie technique / Code

---

## 1. Contexte et problématique

La version initiale de Savely était un backend NestJS classique : des controllers qui appellent des services, des services qui appellent Prisma directement. Ça fonctionnait, mais le code métier était mélangé avec la technique. La règle "un produit périmé ne peut pas être SAFE" vivait dans un fichier `risk-calculator.ts` couplé à la base de données. Impossible de la tester sans Prisma. Impossible de la réutiliser. Impossible de l'expliquer à quelqu'un de non-technique.

**L'objectif de cette branche** : refondre le use case central — l'import de stock CSV — en appliquant les patterns DDD tactiques complets, pour servir de modèle à toute l'équipe.

---

## 2. Architecture retenue : Hexagonale + DDD Tactique

On a structuré le code autour du concept de **Bounded Context**. Deux BC sont délimités :

- **BC Stock/Import** — le cœur métier : importer un stock, calculer le risque
- **BC Actions** — les recommandations générées pour les produits à risque

```
src/
├── stock/
│   ├── domain/        ← Le cœur. Zéro dépendance externe.
│   ├── application/   ← Orchestration. Dépend uniquement du domain.
│   └── infrastructure/ ← Technique. NestJS, Prisma, CSV.
└── actions/
    ├── domain/
    └── application/
```

La règle d'or : **les dépendances ne vont que vers l'intérieur.**

```
Infrastructure → Application → Domain → rien
```

Vérifiable en une commande :
```bash
grep -r "from '@nestjs" src/stock/domain/   # → vide
grep -r "from '@prisma" src/stock/domain/   # → vide
```

---

## 3. Les Value Objects

Un Value Object est un objet immuable, auto-validant, comparable par valeur.

### Exemple concret : DLP (Date Limite de Péremption)

```typescript
export class DLP {
  private constructor(private readonly _value: Date) {}

  static create(date: Date | string): DLP {
    const parsed = date instanceof Date ? date : new Date(date);
    if (isNaN(parsed.getTime())) {
      throw new DLPInvalideException(`Date invalide : ${date}`);
    }
    return new DLP(parsed);
  }

  joursRestants(): number { /* calcul exact minuit à minuit */ }
  estPerime(): boolean { return this.joursRestants() < 0; }

  niveauRisque(): NiveauRisque {
    const jours = this.joursRestants();
    if (jours <= 30) return NiveauRisque.CRITICAL;
    if (jours <= 90) return NiveauRisque.HIGH;
    return NiveauRisque.SAFE;
  }

  equals(other: DLP): boolean {
    return this._value.getTime() === other._value.getTime();
  }

  toDate(): Date {
    return new Date(this._value); // Copie défensive
  }
}
```

**Pourquoi c'est mieux qu'un simple `Date` ?**

- On ne peut pas construire une DLP invalide — elle se valide à la construction
- `joursRestants()`, `estPerime()`, `niveauRisque()` : le comportement est colocalisé avec la donnée
- La copie défensive dans `toDate()` garantit l'immuabilité
- Testable en isolation totale, sans base de données

**Les 7 Value Objects implémentés :**

| VO | Garantie |
|---|---|
| `ProduitId` | UUID valide, généré via `crypto.randomUUID()` |
| `PharmacyId` | UUID non vide — isolation multi-tenant garantie |
| `ExternalSku` | String non vide — identifiant LGO |
| `DLP` | Date parseable, méthodes `joursRestants()` / `niveauRisque()` |
| `Quantite` | Entier ≥ 0 — lève `QuantiteNegativeException` sinon |
| `NiveauRisque` | Enum `SAFE / HIGH / CRITICAL` avec `estActionnable()` |
| `ScoreRisque` | Score 0–100 + niveau associé |

---

## 4. L'Aggregate Root : Produit

L'aggregate est la brique la plus importante du DDD tactique. Il protège les invariants métier et contrôle l'accès à ses données internes.

```typescript
export class Produit {
  private _domainEvents: DomainEvent[] = [];

  // Constructeur privé — on passe toujours par les factories
  private constructor(
    private readonly _id: ProduitId,
    private readonly _pharmacyId: PharmacyId,
    private readonly _externalSku: ExternalSku,
    private _nom: string,
    private _quantite: Quantite,
    private _dlp: DLP,
    private _scoreRisque: ScoreRisque | null,
  ) {}
```

### Deux factories, deux intentions différentes

```typescript
// Création : génère un ID, valide les invariants
static create(params: { ... }): Produit

// Reconstitution depuis la DB : on fait confiance à la persistance
static reconstituer(params: { id: ProduitId; ... }): Produit
```

Cette distinction est critique : lors d'une reconstitution, on ne régénère pas d'ID et on n'émet pas d'événements.

### Le comportement métier principal

```typescript
calculerRisque(calculateur: CalculateurRisque): void {
  const score = calculateur.calculer(this._dlp, this._quantite);

  // Invariant protégé : un produit périmé ne peut pas être SAFE
  if (this._dlp.estPerime() && score.niveau === NiveauRisque.SAFE) {
    throw new Error('Invariant violé : produit périmé classé SAFE');
  }

  this._scoreRisque = score;

  if (score.niveau === NiveauRisque.CRITICAL || score.niveau === NiveauRisque.HIGH) {
    this.recordEvent(new ProduitPasseCritical({ ... }));
  }
}
```

L'aggregate **décide** lui-même quand émettre un événement. Ni le controller, ni le service, ni le repository ne prennent cette décision.

---

## 5. Le Domain Service : CalculateurRisque

Certaines règles métier ne peuvent pas vivre dans un aggregate — soit parce qu'elles impliquent plusieurs entités, soit parce qu'elles dépendent de règles configurables. C'est le rôle du Domain Service.

```typescript
export class CalculateurRisque {
  // Règles métier Savely :
  // CRITICAL : DLP ≤ 30 jours ou périmé
  // HIGH     : DLP entre 31 et 90 jours
  // SAFE     : DLP > 90 jours

  calculer(dlp: DLP, quantite: Quantite): ScoreRisque {
    const jours = dlp.joursRestants();
    const niveau = dlp.niveauRisque();

    let score: number;
    if (jours <= 0)       score = 100;             // Périmé → urgence max
    else if (jours <= 30) score = 99 - ...;        // CRITICAL : 70–99
    else if (jours <= 90) score = 69 - ...;        // HIGH : 31–69
    else                  score = max(0, 30 - ...); // SAFE : 0–30

    // Rupture de stock : risque financier nul
    if (quantite.estRupture() && niveau !== NiveauRisque.CRITICAL) {
      score = Math.min(score, 20);
    }

    return ScoreRisque.create(score, niveau);
  }
}
```

**Pourquoi pas directement dans Produit ?** Parce que les seuils (30j, 90j) sont des règles métier qui pourraient devenir configurables par pharmacie. Le Domain Service est l'endroit naturel pour accueillir cette évolution.

---

## 6. Les Domain Events

Les événements de domaine représentent des faits passés, immuables, horodatés.

```typescript
export class ProduitPasseCritical implements DomainEvent {
  readonly occurredOn: Date = new Date(); // Horodatage automatique

  constructor(public readonly payload: {
    produitId: ProduitId;
    pharmacyId: PharmacyId;
    nom: string;
    niveau: NiveauRisque;
    dlp: DLP;
    quantite: Quantite;
  }) {}
}
```

**Pattern outbox dans l'aggregate :**

```typescript
private recordEvent(event: DomainEvent): void {
  this._domainEvents.push(event);
}

releaseEvents(): DomainEvent[] {
  const events = [...this._domainEvents];
  this._domainEvents = [];  // ← Vide la liste après lecture
  return events;
}
```

L'aggregate accumule ses événements. L'application service les collecte après chaque save et les dispatch via l'EventBus. Ce pattern garantit que les événements ne sont émis qu'après persistance réussie.

**Les 3 événements implémentés :**

| Event | Émetteur | Consommateurs (futurs) |
|---|---|---|
| `ProduitPasseCritical` | `Produit.calculerRisque()` | BC Actions, Dashboard |
| `StockImporte` | `ImporterStockHandler` | Dashboard, Notifications |
| `ActionGeneree` | `Action.creer()` | Dashboard |

---

## 7. L'Application Service : ImporterStockHandler

C'est le chef d'orchestre. Il ne contient aucune logique métier — il coordonne.

```typescript
export class ImporterStockHandler implements ImporterStockUseCase {
  constructor(
    private readonly produitRepo: ProduitRepository,  // Port Out
    private readonly csvParser: CsvParserPort,        // Port Out
    private readonly calculateur: CalculateurRisque,  // Domain Service
    private readonly eventBus: EventBusPort,          // Port Out
  ) {}

  async execute(command: ImporterStockCommand): Promise<ImporterStockResult> {
    // 1. Parser le CSV via le port (ACL vers LGO)
    const lignes = await this.csvParser.parser(command.fichier, command.nomFichier);

    for (const ligne of lignes) {
      // 2. Upsert : créer ou mettre à jour le Produit
      let produit = await this.produitRepo.findByExternalSku(sku, command.pharmacyId);
      if (produit) {
        produit.mettreAJour({ nom, quantite, dlp });
      } else {
        produit = Produit.create({ pharmacyId, externalSku, nom, quantite, dlp });
      }

      // 3. Calculer le risque — le Produit émet ses propres events
      produit.calculerRisque(this.calculateur);

      // 4. Persister
      await this.produitRepo.save(produit);

      // 5. Collecter les events
      allEvents.push(...produit.releaseEvents());
    }

    // 6. Dispatcher tous les events + StockImporte
    await this.eventBus.publishAll(allEvents);

    return new ImporterStockResult(nbImportes, nbErreurs, produitsCritiques);
  }
}
```

**L'handler ne connaît ni Prisma, ni NestJS, ni csv-parser.** Il travaille exclusivement avec des interfaces (ports). Cela rend le use case testable sans infrastructure.

---

## 8. L'Anti-Corruption Layer : détection des formats LGO

Les LGO (Winpharma, LGPI, Smart RX) exportent des CSV dans des formats hétérogènes. L'ACL isole cette complexité du domaine.

```typescript
// Signatures de colonnes par format
const SIGNATURES = {
  WINPHARMA: ['SKU', 'NOM_PRODUIT', 'QUANTITE', 'DATE_PEREMPTION'],
  LGPI:      ['code_article', 'libelle', 'qte_stock', 'dluo'],
  SMART_RX:  ['ref_produit', 'designation', 'stock', 'date_expiration'],
};
```

Le `CsvParserAdapter` détecte automatiquement le format à partir des en-têtes CSV, puis normalise vers un `ProduitBrut[]`. Le domaine ne voit jamais les colonnes brutes.

Formats de date supportés : `YYYY-MM-DD`, `DD/MM/YYYY`, `DD/MM/YY`.

---

## 9. Les tests

**Philosophie adoptée : tester les comportements, pas les implémentations.**

### Tests du domain (zéro infrastructure)

```typescript
describe('Produit', () => {
  it('émet ProduitPasseCritical quand le risque est CRITICAL', () => {
    const produit = Produit.create({ dlp: DLP.create(dans15jours), ... });
    produit.calculerRisque(new CalculateurRisque());
    const events = produit.releaseEvents();
    expect(events[0]).toBeInstanceOf(ProduitPasseCritical);
  });

  it('ne génère PAS d\'événement si le risque est SAFE', () => {
    const produit = Produit.create({ dlp: DLP.create(dans180jours), ... });
    produit.calculerRisque(new CalculateurRisque());
    expect(produit.releaseEvents()).toHaveLength(0);
  });
});
```

### Tests du use case (sans base de données)

On remplace les adapters réels par des fakes :

```typescript
handler = new ImporterStockHandler(
  new InMemoryProduitRepository(), // ← pas de Prisma
  new FakeCsvParser(lignes),       // ← pas de fichier réel
  new CalculateurRisque(),         // ← le vrai domain service
  new FakeEventBus(),              // ← pas de broker externe
);
```

Le test du use case est aussi rapide qu'un test unitaire, mais couvre tout l'orchestration.

### Résultats

```
Test Suites: 8 passed
Tests:       92 passed
Coverage:    89% global (cible : >80% sur domain/ et application/)
```

---

## 10. Ce que cette architecture rend possible pour la suite

**Branchement zéro-modification** — les modules futurs écoutent les events sans toucher ce code :

```typescript
// BC Notifications (futur) — aucune modification du BC Stock
eventBus.subscribe(ProduitPasseCritical, (e) => notifier(e.payload));
eventBus.subscribe(StockImporte, (e) => dashboard.refresh(e.payload));
```

**Remplacement d'infrastructure transparent** — passer de Prisma à MongoDB n'implique que de réécrire `PrismaProductRepository`, pas une ligne de domaine.

**Règles métier versionnables** — si les seuils de risque changent (ex : CRITICAL passe de 30 à 45 jours), la modification est localisée dans `CalculateurRisque.ts` et les tests le valident immédiatement.

---

## 11. Récapitulatif des livrables

| Livrable | Statut |
|---|---|
| 7 Value Objects auto-validants | ✅ |
| Aggregate Root `Produit` avec invariants | ✅ |
| Domain Service `CalculateurRisque` | ✅ |
| 3 Domain Events immuables | ✅ |
| Port In `ImporterStockUseCase` | ✅ |
| Application Handler `ImporterStockHandler` | ✅ |
| ACL LGO (Winpharma, LGPI, Smart RX) | ✅ |
| Adapter `PrismaProductRepository` | ✅ |
| Adapter `InMemoryProduitRepository` (tests) | ✅ |
| Controller `POST /stock/import` | ✅ |
| BC Actions (stub) | ✅ |
| 92 tests — couverture 89% | ✅ |
| Zéro import NestJS/Prisma dans `domain/` | ✅ |
| README équipe | ✅ |

---

*Branche : `feat/ddd-tactical-refactor`*
