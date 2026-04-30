/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Adapter Out — parse les fichiers CSV/XLSX LGO vers ProduitBrut[]
 */
import * as csvParser from 'csv-parser';
import * as XLSX from 'xlsx';
import { Readable } from 'stream';
import { CsvParserPort, ProduitBrut } from '../../application/ports/CsvParserPort';
import { LgoFormatDetector } from './LgoFormatDetector';

export class CsvParserAdapter implements CsvParserPort {
  private readonly detector = new LgoFormatDetector();

  async parser(buffer: Buffer, nomFichier: string): Promise<ProduitBrut[]> {
    const rows = await this.lireRaw(buffer, nomFichier);
    if (rows.length === 0) return [];

    const colonnes = Object.keys(rows[0]);
    const format = this.detector.detect(colonnes);

    return rows.map((row) => {
      const mapped = this.detector.mapLigne(row, format);
      return {
        externalSku: mapped.externalSku,
        nom: mapped.nom,
        quantite: parseFloat(mapped.quantite.replace(',', '.')),
        dlp: this.parseDate(mapped.dlp),
      };
    });
  }

  private async lireRaw(
    buffer: Buffer,
    nomFichier: string,
  ): Promise<Record<string, string>[]> {
    const ext = nomFichier.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      return this.parseExcel(buffer);
    }

    // Détecter le séparateur (Winpharma = ';', LGPI = ',')
    const sample = buffer.slice(0, 200).toString('utf8');
    const sep = sample.includes(';') ? ';' : ',';

    return this.parseCsv(buffer, sep);
  }

  private parseCsv(
    buffer: Buffer,
    separator: string,
  ): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      const rows: Record<string, string>[] = [];
      const stream = Readable.from(buffer);
      stream
        .pipe(csvParser({ separator }))
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve(rows))
        .on('error', reject);
    });
  }

  private parseExcel(buffer: Buffer): Record<string, string>[] {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: '',
      raw: false,
    });
  }

  /**
   * Parse différents formats de dates LGO :
   *   - ISO : 2025-08-15
   *   - FR  : 15/08/2025
   *   - FR  : 15/08/25
   */
  private parseDate(value: string): Date {
    if (!value) throw new Error('Date de péremption manquante');

    const trimmed = value.trim();

    // Format ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return new Date(trimmed);
    }

    // Format FR DD/MM/YYYY ou DD/MM/YY
    const frMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
    if (frMatch) {
      const [, day, month, yearRaw] = frMatch;
      const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
      return new Date(`${year}-${month}-${day}`);
    }

    // Essai natif en dernier recours
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Format de date non reconnu : "${trimmed}"`);
    }
    return parsed;
  }
}
