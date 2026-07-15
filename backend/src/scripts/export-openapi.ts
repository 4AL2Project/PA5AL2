import 'reflect-metadata';

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';

import { AppModule } from '../app.module';
import { buildSwaggerConfig } from '../core/http/swagger';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = SwaggerModule.createDocument(
    app,
    buildSwaggerConfig() as Parameters<typeof SwaggerModule.createDocument>[1]
  );

  const outputPath = resolve(__dirname, '../../openapi.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));

  await app.close();
  process.stdout.write(`OpenAPI spec written to ${outputPath}\n`);
}

main().catch((err) => {
  process.stderr.write(`Failed to export OpenAPI spec: ${String(err)}\n`);
  process.exit(1);
});
