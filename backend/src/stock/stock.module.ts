/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Module NestJS — Bounded Context Stock/Import (DDD)
 *
 * Injection via tokens symboliques pour respecter l'inversion de dépendance.
 * Le domain/ ne connaît pas NestJS.
 */
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

// Domain
import { CalculateurRisque } from './domain/services/CalculateurRisque';

// Application
import { ImporterStockHandler } from './application/handlers/ImporterStockHandler';
import {
  IMPORTER_STOCK_USE_CASE,
} from './application/ports/ImporterStockUseCase';
import { CSV_PARSER_TOKEN } from './application/ports/CsvParserPort';
import { EVENT_BUS_TOKEN } from './application/ports/EventBusPort';

// Infrastructure
import { PrismaProductRepository } from './infrastructure/persistence/PrismaProductRepository';
import { CsvParserAdapter } from './infrastructure/csv/CsvParserAdapter';
import { StockController } from './infrastructure/http/StockController';
import { PRODUIT_REPOSITORY_TOKEN } from './stock.tokens';

// Shared
import { PrismaClientProvider } from '../database/prisma-client.provider';
import { InMemoryEventBus } from './infrastructure/events/InMemoryEventBus';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [StockController],
  providers: [
    // Infrastructure Prisma
    PrismaClientProvider,

    // Adapter Out — repository
    {
      provide: PRODUIT_REPOSITORY_TOKEN,
      useFactory: (prisma: any) => new PrismaProductRepository(prisma),
      inject: ['PRISMA_CLIENT'],
    },

    // Adapter Out — CSV parser
    {
      provide: CSV_PARSER_TOKEN,
      useClass: CsvParserAdapter,
    },

    // Adapter Out — event bus
    {
      provide: EVENT_BUS_TOKEN,
      useClass: InMemoryEventBus,
    },

    // Domain Service
    CalculateurRisque,

    // Port In — use case
    {
      provide: IMPORTER_STOCK_USE_CASE,
      useFactory: (repo: any, parser: any, calculateur: CalculateurRisque, eventBus: any) =>
        new ImporterStockHandler(repo, parser, calculateur, eventBus),
      inject: [PRODUIT_REPOSITORY_TOKEN, CSV_PARSER_TOKEN, CalculateurRisque, EVENT_BUS_TOKEN],
    },
  ],
})
export class StockModule {}
