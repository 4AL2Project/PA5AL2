/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description ACL — détecte le format LGO d'un CSV (Winpharma, LGPI, Smart RX)
 */
import { FormatCSVInconnuException } from '../../domain/exceptions/FormatCSVInconnuException';

export enum LgoFormat {
  WINPHARMA = 'WINPHARMA',
  LGPI = 'LGPI',
  SMART_RX = 'SMART_RX',
}

/** Colonnes connues par format LGO */
const SIGNATURES: Record<LgoFormat, string[]> = {
  [LgoFormat.WINPHARMA]: ['SKU', 'NOM_PRODUIT', 'QUANTITE', 'DATE_PEREMPTION'],
  [LgoFormat.LGPI]: ['code_article', 'libelle', 'qte_stock', 'dluo'],
  [LgoFormat.SMART_RX]: ['ref_produit', 'designation', 'stock', 'date_expiration'],
};

export class LgoFormatDetector {
  detect(colonnes: string[]): LgoFormat {
    const normalized = colonnes.map((c) => c.trim());

    for (const [format, signature] of Object.entries(SIGNATURES)) {
      const matches = signature.filter((col) => normalized.includes(col));
      if (matches.length === signature.length) {
        return format as LgoFormat;
      }
    }

    throw new FormatCSVInconnuException(normalized);
  }

  /** Mapping colonne → champ normalisé selon le format */
  mapLigne(
    row: Record<string, string>,
    format: LgoFormat,
  ): { externalSku: string; nom: string; quantite: string; dlp: string } {
    switch (format) {
      case LgoFormat.WINPHARMA:
        return {
          externalSku: row['SKU'],
          nom: row['NOM_PRODUIT'],
          quantite: row['QUANTITE'],
          dlp: row['DATE_PEREMPTION'],
        };
      case LgoFormat.LGPI:
        return {
          externalSku: row['code_article'],
          nom: row['libelle'],
          quantite: row['qte_stock'],
          dlp: row['dluo'],
        };
      case LgoFormat.SMART_RX:
        return {
          externalSku: row['ref_produit'],
          nom: row['designation'],
          quantite: row['stock'],
          dlp: row['date_expiration'],
        };
    }
  }
}
