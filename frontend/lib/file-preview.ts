/**
 * Parsing client-side de fichiers CSV/XLSX pour l'aperçu avant import.
 * Retourne les en-têtes et les N premières lignes sans envoyer le fichier au serveur.
 */
import Papa from 'papaparse';

export interface ParsedPreview {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

const PREVIEW_ROWS = 5;

export async function previewFile(file: File): Promise<ParsedPreview> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    return previewExcel(file);
  }

  return previewCsv(file);
}

function previewCsv(file: File): Promise<ParsedPreview> {
  return new Promise((resolve, reject) => {
    const previewRows: Record<string, string>[] = [];
    let headers: string[] = [];
    let totalRows = 0;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      step(result) {
        if (headers.length === 0 && result.meta.fields) {
          headers = result.meta.fields;
        }
        totalRows++;
        if (previewRows.length < PREVIEW_ROWS) {
          previewRows.push(result.data);
        }
      },
      complete(results) {
        resolve({
          headers: results.meta.fields ?? headers,
          rows: previewRows,
          totalRows,
        });
      },
      error: reject,
    });
  });
}

async function previewExcel(file: File): Promise<ParsedPreview> {
  const arrayBuffer = await file.arrayBuffer();
  const { read, utils } = await import('xlsx');
  const workbook = read(arrayBuffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const all = utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: '',
    raw: false,
  });

  const headers = all.length > 0 ? Object.keys(all[0]) : [];

  return {
    headers,
    rows: all.slice(0, PREVIEW_ROWS),
    totalRows: all.length,
  };
}
