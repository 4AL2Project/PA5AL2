/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Port In — interface du use case ImporterStock
 */
import { PharmacyId } from '../../domain/model/PharmacyId';

export class ImporterStockCommand {
  constructor(
    public readonly pharmacyId: PharmacyId,
    public readonly fichier: Buffer,
    public readonly nomFichier: string,
  ) {}
}

export class ImporterStockResult {
  constructor(
    public readonly nbImportes: number,
    public readonly nbErreurs: number,
    public readonly produitsCritiques: number,
  ) {}
}

export interface ImporterStockUseCase {
  execute(command: ImporterStockCommand): Promise<ImporterStockResult>;
}

export const IMPORTER_STOCK_USE_CASE = Symbol('IMPORTER_STOCK_USE_CASE');
