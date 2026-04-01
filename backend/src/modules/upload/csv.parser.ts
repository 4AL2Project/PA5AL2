import * as csvParser from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';

export async function parseCSV(buffer: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    const stream = Readable.from(buffer);

    stream
      .pipe(csvParser())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

export function parseExcel(buffer: Buffer): any[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

export async function parseFile(buffer: Buffer, mimetype: string): Promise<any[]> {
  const excelMimetypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  if (excelMimetypes.includes(mimetype)) {
    return parseExcel(buffer);
  }

  return parseCSV(buffer);
}
