export const INGESTION_QUEUE = 'ingestion' as const;
export const IMPORT_STATUS_EVENT = 'import.status' as const;

export type ImportStatus = 'EN_ATTENTE' | 'EN_COURS' | 'TERMINÉ' | 'ÉCHOUÉ';
export type FileType = 'products' | 'sales';

export interface IngestionJobData {
  import_id: string;
  pharmacy_id: string;
  file_type: FileType;
  /** Base64-encoded file buffer. For production, use a presigned S3 URL instead. */
  buffer: string;
  mimetype: string;
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
