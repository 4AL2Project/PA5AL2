import * as csvParser from 'csv-parser';
import { Readable } from 'stream';
import * as XLSX from 'xlsx';

/** Ligne brute issue d'un CSV/Excel : clés inconnues, valeurs non typées. */
export type RawRow = Record<string, unknown>;

export async function parseCSV(buffer: Buffer): Promise<RawRow[]> {
  return new Promise((resolve, reject) => {
    const rows: RawRow[] = [];
    const stream = Readable.from(buffer);

    stream
      .pipe(csvParser())
      .on('data', (row: RawRow) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

export function parseExcel(buffer: Buffer): RawRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' });
}

export async function parseFile(
  buffer: Buffer,
  mimetype: string
): Promise<RawRow[]> {
  const excelMimetypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  if (excelMimetypes.includes(mimetype)) {
    return parseExcel(buffer);
  }

  return parseCSV(buffer);
}
