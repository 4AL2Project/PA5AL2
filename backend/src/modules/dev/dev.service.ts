import { Injectable, Logger } from '@nestjs/common';

import { prisma } from '../../database/client';
import { runSeed } from '../../database/seed';

// Tables jamais vidées : l'historique des migrations Prisma n'est pas de la
// donnée applicative, le tronquer casserait `migrate deploy`.
const PROTECTED_TABLES = ['_prisma_migrations'];

export interface ResetResult {
  truncated_tables: string[];
  seeded: boolean;
}

@Injectable()
export class DevService {
  private readonly logger = new Logger(DevService.name);

  /** Compte les lignes de chaque table applicative (aperçu avant reset). */
  async counts(): Promise<Record<string, number>> {
    const tables = await this.listTables();
    const entries = await Promise.all(
      tables.map(async (table) => {
        const [row] = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
          `SELECT COUNT(*)::bigint AS count FROM "${table}"`
        );
        return [table, Number(row.count)] as const;
      })
    );
    return Object.fromEntries(entries);
  }

  /**
   * Vide toutes les tables applicatives, puis rejoue le seed si demandé.
   * TRUNCATE ... CASCADE ignore l'ordre des clés étrangères, et RESTART
   * IDENTITY remet les séquences à zéro pour un état vraiment neuf.
   */
  async reset(seed: boolean): Promise<ResetResult> {
    const tables = await this.listTables();
    const quoted = tables.map((t) => `"${t}"`).join(', ');

    this.logger.warn(`Reset base : TRUNCATE de ${tables.length} tables`);
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`
    );

    if (seed) {
      this.logger.warn('Reset base : rejeu du seed');
      await runSeed();
    }

    return { truncated_tables: tables, seeded: seed };
  }

  private async listTables(): Promise<string[]> {
    const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    return rows
      .map((r) => r.tablename)
      .filter((t) => !PROTECTED_TABLES.includes(t))
      .sort();
  }
}
