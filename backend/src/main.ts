// Doit rester le premier import — instrumente les modules Node.js avant NestJS
import './instrument';
import 'dotenv/config';
import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';

import { AppModule } from './app.module';
import { config } from './core/config';
import { HttpExceptionFilter } from './core/http/http-exception.filter';
import { LoggingInterceptor } from './core/http/logging.interceptor';
import { ResponseEnvelopeInterceptor } from './core/http/response.interceptor';
import { setupSwagger, SWAGGER_PATH } from './core/http/swagger';
import { UPLOADS_ROOT } from './core/uploads';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  app.enableCors();
  app.useWebSocketAdapter(new IoAdapter(app));

  // En mode stockage `local`, on sert les fichiers uploadés sous /uploads/.
  // En mode `s3`, ils sont diffusés par CloudFront (pas de service statique).
  if (config.storage.driver === 'local') {
    app.useStaticAssets(UPLOADS_ROOT, { prefix: '/uploads/' });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    })
  );

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseEnvelopeInterceptor()
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  setupSwagger(app);

  await app.listen(config.port);
  Logger.log(
    `Server running localy on http://localhost:${config.port}`,
    'Bootstrap'
  );
  Logger.log(
    `Swagger UI available at http://localhost:${config.port}/${SWAGGER_PATH}`,
    'Bootstrap'
  );
}

bootstrap();
