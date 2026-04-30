/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Application Service — orchestration du use case ImporterStock
 *
 * Flux :
 *   1. Parser le fichier CSV/XLSX via le port (ACL → LGO)
 *   2. Pour chaque ligne : créer ou mettre à jour le Produit (upsert sur externalSku)
 *   3. Calculer le risque sur chaque produit
 *   4. Sauvegarder via le repository
 *   5. Collecter et dispatcher les Domain Events
 *   6. Émettre StockImporte et retourner le résultat
 */
import { Produit } from '../../domain/model/Produit';
import { ExternalSku } from '../../domain/model/ExternalSku';
import { Quantite } from '../../domain/model/Quantite';
import { DLP } from '../../domain/model/DLP';
import { NiveauRisque } from '../../domain/model/NiveauRisque';
import { CalculateurRisque } from '../../domain/services/CalculateurRisque';
import { ProduitRepository } from '../../domain/repository/ProduitRepository';
import { StockImporte } from '../../domain/events/StockImporte';
import { DomainEvent } from '../../domain/events/DomainEvent';
import {
  ImporterStockUseCase,
  ImporterStockCommand,
  ImporterStockResult,
} from '../ports/ImporterStockUseCase';
import { CsvParserPort } from '../ports/CsvParserPort';
import { EventBusPort } from '../ports/EventBusPort';

export class ImporterStockHandler implements ImporterStockUseCase {
  constructor(
    private readonly produitRepo: ProduitRepository,
    private readonly csvParser: CsvParserPort,
    private readonly calculateur: CalculateurRisque,
    private readonly eventBus: EventBusPort,
  ) {}

  async execute(command: ImporterStockCommand): Promise<ImporterStockResult> {
    // 1. Parser le fichier
    const lignes = await this.csvParser.parser(command.fichier, command.nomFichier);

    let nbImportes = 0;
    let nbErreurs = 0;
    let produitsCritiques = 0;
    const allEvents: DomainEvent[] = [];

    // 2. Traiter chaque ligne
    for (const ligne of lignes) {
      try {
        const externalSku = ExternalSku.create(ligne.externalSku);
        const quantite = Quantite.create(Math.round(ligne.quantite));
        const dlp = DLP.create(ligne.dlp);

        // Upsert : chercher le produit existant ou en créer un nouveau
        let produit = await this.produitRepo.findByExternalSku(externalSku, command.pharmacyId);

        if (produit) {
          produit.mettreAJour({ nom: ligne.nom, quantite, dlp });
        } else {
          produit = Produit.create({
            pharmacyId: command.pharmacyId,
            externalSku,
            nom: ligne.nom,
            quantite,
            dlp,
          });
        }

        // 3. Calculer le risque
        produit.calculerRisque(this.calculateur);

        // Compter les produits critiques/high
        const score = produit.scoreRisque();
        if (score && (score.niveau === NiveauRisque.CRITICAL || score.niveau === NiveauRisque.HIGH)) {
          produitsCritiques++;
        }

        // 4. Sauvegarder
        await this.produitRepo.save(produit);

        // 5. Collecter les events
        allEvents.push(...produit.releaseEvents());

        nbImportes++;
      } catch {
        nbErreurs++;
      }
    }

    // Émettre l'event de fin d'import
    allEvents.push(
      new StockImporte({
        pharmacyId: command.pharmacyId,
        nbProduitsImportes: nbImportes,
        nbProduitsErreur: nbErreurs,
      }),
    );

    // 5. Dispatcher tous les events
    await this.eventBus.publishAll(allEvents);

    return new ImporterStockResult(nbImportes, nbErreurs, produitsCritiques);
  }
}
