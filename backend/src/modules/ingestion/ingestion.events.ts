export const INGESTION_QUEUE = 'ingestion' as const;
export const IMPORT_STATUS_EVENT = 'import.status' as const;

export type ImportStatus = 'EN_ATTENTE' | 'EN_COURS' | 'TERMINÉ' | 'ÉCHOUÉ';
export type FileType = 'products' | 'sales';

/** Un fichier prêt à transiter dans la file (buffer encodé en base64). */
export interface IngestionFile {
  file_name: string;
  /** Base64-encoded file buffer. For production, use a presigned S3 URL instead. */
  buffer: string;
  mimetype: string;
}

/**
 * Un import regroupe le fichier produits ET le fichier ventes dans une seule
 * unité de traitement (tout-ou-rien). Au moins l'un des deux est présent.
 */
export interface IngestionJobData {
  import_id: string;
  pharmacy_id: string;
  products?: IngestionFile;
  sales?: IngestionFile;
}

export interface ImportStatusPayload {
  import_id: string;
  pharmacy_id: string;
  status: ImportStatus;
  rows_total?: number;
  rows_ok?: number;
  rows_failed?: number;
  errors?: string[];
}
