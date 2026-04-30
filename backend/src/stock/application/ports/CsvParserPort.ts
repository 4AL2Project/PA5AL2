/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Port Out — interface d'analyse des fichiers CSV/XLSX LGO
 */

export interface ProduitBrut {
  externalSku: string;
  nom: string;
  quantite: number;
  dlp: Date;
}

export interface CsvParserPort {
  parser(buffer: Buffer, nomFichier: string): Promise<ProduitBrut[]>;
}

export const CSV_PARSER_TOKEN = Symbol('CSV_PARSER_TOKEN');
