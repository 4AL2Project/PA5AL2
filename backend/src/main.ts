import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { config } from './core/config';
import { HttpExceptionFilter } from './core/http/http-exception.filter';
import { ResponseEnvelopeInterceptor } from './core/http/response.interceptor';
import { setupSwagger, SWAGGER_PATH } from './core/http/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    })
  );

  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
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
