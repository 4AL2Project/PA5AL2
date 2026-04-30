/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Tests unitaires — Adapter InMemoryProduitRepository
 */
import { InMemoryProduitRepository } from './InMemoryProduitRepository';
import { Produit } from '../../domain/model/Produit';
import { PharmacyId } from '../../domain/model/PharmacyId';
import { ExternalSku } from '../../domain/model/ExternalSku';
import { Quantite } from '../../domain/model/Quantite';
import { DLP } from '../../domain/model/DLP';
import { CalculateurRisque } from '../../domain/services/CalculateurRisque';
import { NiveauRisque } from '../../domain/model/NiveauRisque';

function dateDans(jours: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  d.setHours(12, 0, 0, 0);
  return d;
}

function creerProduit(sku: string, joursAvantDlp: number, pharmacyId = 'pharmacy-123'): Produit {
  return Produit.create({
    pharmacyId: PharmacyId.create(pharmacyId),
    externalSku: ExternalSku.create(sku),
    nom: `Produit ${sku}`,
    quantite: Quantite.create(10),
    dlp: DLP.create(dateDans(joursAvantDlp)),
  });
}

describe('InMemoryProduitRepository', () => {
  let repo: InMemoryProduitRepository;
  const pharmacyId = PharmacyId.create('pharmacy-123');

  beforeEach(() => {
    repo = new InMemoryProduitRepository();
  });

  describe('save() et findByExternalSku()', () => {
    it('sauvegarde et retrouve un produit par SKU', async () => {
      const produit = creerProduit('PROD001', 60);
      await repo.save(produit);

      const found = await repo.findByExternalSku(
        ExternalSku.create('PROD001'),
        pharmacyId,
      );
      expect(found).not.toBeNull();
      expect(found!.externalSku().value()).toBe('PROD001');
    });

    it('retourne null si le SKU n\'existe pas', async () => {
      const found = await repo.findByExternalSku(
        ExternalSku.create('INEXISTANT'),
        pharmacyId,
      );
      expect(found).toBeNull();
    });

    it('isole par pharmacyId', async () => {
      const produit = creerProduit('PROD001', 60, 'pharmacy-A');
      await repo.save(produit);

      const found = await repo.findByExternalSku(
        ExternalSku.create('PROD001'),
        PharmacyId.create('pharmacy-B'),
      );
      expect(found).toBeNull();
    });
  });

  describe('findByPharmacy()', () => {
    it('retourne tous les produits d\'une pharmacie', async () => {
      await repo.save(creerProduit('PROD001', 60));
      await repo.save(creerProduit('PROD002', 30));
      await repo.save(creerProduit('PROD003', 180));

      const produits = await repo.findByPharmacy(pharmacyId);
      expect(produits).toHaveLength(3);
    });

    it('retourne un tableau vide pour une pharmacie inconnue', async () => {
      const produits = await repo.findByPharmacy(PharmacyId.create('inconnue'));
      expect(produits).toHaveLength(0);
    });
  });

  describe('findCritiquesParPharmacy()', () => {
    it('retourne uniquement les produits HIGH et CRITICAL', async () => {
      const calculateur = new CalculateurRisque();

      const critical = creerProduit('PROD001', 15);
      const high = creerProduit('PROD002', 60);
      const safe = creerProduit('PROD003', 180);

      critical.calculerRisque(calculateur);
      high.calculerRisque(calculateur);
      safe.calculerRisque(calculateur);

      // Vider les events avant sauvegarde
      critical.releaseEvents();
      high.releaseEvents();
      safe.releaseEvents();

      await repo.save(critical);
      await repo.save(high);
      await repo.save(safe);

      const critiques = await repo.findCritiquesParPharmacy(pharmacyId);
      expect(critiques).toHaveLength(2);

      const niveaux = critiques.map((p) => p.scoreRisque()?.niveau);
      expect(niveaux).toContain(NiveauRisque.CRITICAL);
      expect(niveaux).toContain(NiveauRisque.HIGH);
    });
  });

  describe('nextIdentity()', () => {
    it('génère des IDs uniques', () => {
      const id1 = repo.nextIdentity();
      const id2 = repo.nextIdentity();
      expect(id1.value()).not.toBe(id2.value());
    });
  });
});
