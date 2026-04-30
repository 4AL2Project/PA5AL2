/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Provider NestJS — expose le PrismaClient singleton via DI
 */
import { Provider } from '@nestjs/common';
import { prisma } from './client';

export const PrismaClientProvider: Provider = {
  provide: 'PRISMA_CLIENT',
  useValue: prisma,
};
