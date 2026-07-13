import { Global, Module } from '@nestjs/common';

import { StorageService } from './storage.service';

/**
 * Module global exposant `StorageService` (S3/CloudFront ou disque local) à
 * l'ensemble de l'application sans réimport dans chaque module consommateur.
 */
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
