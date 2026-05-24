import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/docs';

export function buildSwaggerConfig(): Omit<OpenAPIObject, 'paths'> {
  return new DocumentBuilder()
    .setTitle('Savely API')
    .setDescription(
      'Pharmacy expiry risk analysis API. ' +
        'All endpoints (except /api/auth/*) require a Bearer JWT and ' +
        'enforce multi-tenant isolation via the user pharmacy_id.'
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token'
    )
    .addTag('auth', 'Authentication & token refresh')
    .addTag('upload', 'CSV / Excel ingestion')
    .addTag('analysis', 'Risk analysis results')
    .addTag('products', 'Product catalogue with risk data')
    .addTag('dashboard', 'Aggregated pharmacy summary')
    .build();
}

export function setupSwagger(app: INestApplication): OpenAPIObject {
  const config = buildSwaggerConfig();
  const document = SwaggerModule.createDocument(app, config as OpenAPIObject);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
  return document;
}
