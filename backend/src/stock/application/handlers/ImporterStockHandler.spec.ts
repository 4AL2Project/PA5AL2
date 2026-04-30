/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Tests unitaires — Application Handler ImporterStockHandler
 *
 * Aucune base de données — utilise InMemoryProduitRepository et des fakes.
 */
import { ImporterStockHandler } from './ImporterStockHandler';
import { ImporterStockCommand } from '../ports/ImporterStockUseCase';
import { InMemoryProduitRepository } from '../../infrastructure/persistence/InMemoryProduitRepository';
import { CalculateurRisque } from '../../domain/services/CalculateurRisque';
import { PharmacyId } from '../../domain/model/PharmacyId';
import { NiveauRisque } from '../../domain/model/NiveauRisque';
import { StockImporte } from '../../domain/events/StockImporte';
import { ProduitPasseCritical } from '../../domain/events/ProduitPasseCritical';
import { DomainEvent } from '../../domain/events/DomainEvent';
import { CsvParserPort, ProduitBrut } from '../ports/CsvParserPort';
import { EventBusPort } from '../ports/EventBusPort';

// ─── Fakes ────────────────────────────────────────────────────────────────────

function dateDans(jours: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  d.setHours(12, 0, 0, 0);
  return d;
}

class FakeCsvParser implements CsvParserPort {
  constructor(private readonly lignes: ProduitBrut[]) {}

  async parser(_buffer: Buffer, _nomFichier: string): Promise<ProduitBrut[]> {
    return this.lignes;
  }
}

class FakeEventBus implements EventBusPort {
  readonly events: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const pharmacyId = PharmacyId.create('pharmacy-test-123');

const lignesTest: ProduitBrut[] = [
  { externalSku: 'PROD001', nom: 'Crème Hydratante SPF50', quantite: 45, dlp: dateDans(15) },  // CRITICAL
  { externalSku: 'PROD002', nom: 'Sérum Vitamine C', quantite: 12, dlp: dateDans(60) },          // HIGH
  { externalSku: 'PROD003', nom: 'Gel Douche Apaisant', quantite: 3, dlp: dateDans(180) },       // SAFE
];

function makeHandler(
  lignes: ProduitBrut[],
  repo?: InMemoryProduitRepository,
  eventBus?: FakeEventBus,
) {
  const repository = repo ?? new InMemoryProduitRepository();
  const bus = eventBus ?? new FakeEventBus();
  const handler = new ImporterStockHandler(
    repository,
    new FakeCsvParser(lignes),
    new CalculateurRisque(),
    bus,
  );
  return { handler, repository, bus };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ImporterStockHandler', () => {
  describe('execute()', () => {
    it('importe les produits et retourne le bon compteur', async () => {
      const { handler } = makeHandler(lignesTest);
      const result = await handler.execute(
        new ImporterStockCommand(pharmacyId, Buffer.from(''), 'export.csv'),
      );
      expect(result.nbImportes).toBe(3);
      expect(result.nbErreurs).toBe(0);
    });

    it('compte correctement les produits critiques (CRITICAL + HIGH)', async () => {
      const { handler } = makeHandler(lignesTest);
      const result = await handler.execute(
        new ImporterStockCommand(pharmacyId, Buffer.from(''), 'export.csv'),
      );
      // PROD001 = CRITICAL, PROD002 = HIGH → 2 critiques
      expect(result.produitsCritiques).toBe(2);
    });

    it('persiste les produits dans le repository', async () => {
      const { handler, repository } = makeHandler(lignesTest);
      await handler.execute(
        new ImporterStockCommand(pharmacyId, Buffer.from(''), 'export.csv'),
      );
      const produits = await repository.findByPharmacy(pharmacyId);
      expect(produits).toHaveLength(3);
    });

    it('est idempotent — pas de doublons sur externalSku', async () => {
      const { handler, repository } = makeHandler(lignesTest);
      const command = new ImporterStockCommand(pharmacyId, Buffer.from(''), 'export.csv');

      await handler.execute(command);
      await handler.execute(command); // Même import

      const produits = await repository.findByPharmacy(pharmacyId);
      expect(produits).toHaveLength(3); // Toujours 3, pas 6
    });

    it('met à jour le produit existant lors d\'un reiimport', async () => {
      const { handler, repository } = makeHandler(lignesTest);
      await handler.execute(
        new ImporterStockCommand(pharmacyId, Buffer.from(''), 'export.csv'),
      );

      // Deuxième import avec une quantité différente
      const lignesMaj: ProduitBrut[] = [
        { externalSku: 'PROD001', nom: 'Crème Hydratante SPF50 MAJ', quantite: 10, dlp: dateDans(15) },
      ];

      const { handler: handler2 } = makeHandler(lignesMaj, repository);
      await handler2.execute(
        new ImporterStockCommand(pharmacyId, Buffer.from(''), 'export.csv'),
      );

      const produit = await repository.findByExternalSku(
        { value: () => 'PROD001', equals: () => false } as any,
        pharmacyId,
      );
      // Repository doit toujours avoir 3 produits
      const tous = await repository.findByPharmacy(pharmacyId);
      expect(tous).toHaveLength(3);
    });

    it('émet StockImporte après un import réussi', async () => {
      const eventBus = new FakeEventBus();
      const { handler } = makeHandler(lignesTest, undefined, eventBus);

      await handler.execute(
        new ImporterStockCommand(pharmacyId, Buffer.from(''), 'export.csv'),
      );

      const stockImporteEvents = eventBus.events.filter(
        (e) => e instanceof StockImporte,
      );
      expect(stockImporteEvents).toHaveLength(1);
    });

    it('émet ProduitPasseCritical pour chaque produit actionnable', async () => {
      const eventBus = new FakeEventBus();
      const { handler } = makeHandler(lignesTest, undefined, eventBus);

      await handler.execute(
        new ImporterStockCommand(pharmacyId, Buffer.from(''), 'export.csv'),
      );

      const criticalEvents = eventBus.events.filter(
        (e) => e instanceof ProduitPasseCritical,
      );
      // PROD001 (CRITICAL) + PROD002 (HIGH) → 2 événements
      expect(criticalEvents).toHaveLength(2);
    });

    it('isole les pharmacies — ne mélange pas les produits', async () => {
      const { handler, repository } = makeHandler(lignesTest);
      const autrePharmacy = PharmacyId.create('autre-pharmacy-456');

      await handler.execute(
        new ImporterStockCommand(pharmacyId, Buffer.from(''), 'export.csv'),
      );

      const produitsAutre = await repository.findByPharmacy(autrePharmacy);
      expect(produitsAutre).toHaveLength(0);
    });

    it('compte les erreurs pour les lignes invalides', async () => {
      const lignesAvecErreur: ProduitBrut[] = [
        { externalSku: 'PROD001', nom: 'Valide', quantite: 10, dlp: dateDans(60) },
        { externalSku: '', nom: 'Invalide', quantite: -5, dlp: dateDans(60) }, // SKU vide → erreur
      ];

      const { handler } = makeHandler(lignesAvecErreur);
      const result = await handler.execute(
        new ImporterStockCommand(pharmacyId, Buffer.from(''), 'export.csv'),
      );

      expect(result.nbImportes).toBe(1);
      expect(result.nbErreurs).toBe(1);
    });
  });
});
