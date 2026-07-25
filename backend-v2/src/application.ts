import {
  HttpStatus,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';

import { validationExceptionFactory } from './common/errors/validation';
import { AppConfigService } from './config/app-config.service';

export function configureApplication(app: INestApplication): void {
  const config = app.get(AppConfigService);

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(json({ limit: config.requestBodyLimit }));
  app.use(
    urlencoded({
      extended: false,
      limit: config.requestBodyLimit,
      parameterLimit: 100,
    }),
  );
  app.enableCors({
    origin: config.corsAllowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 600,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: false,
      stopAtFirstError: false,
      errorHttpStatusCode: HttpStatus.BAD_REQUEST,
      validationError: {
        target: false,
        value: false,
      },
      exceptionFactory: validationExceptionFactory,
    }),
  );
}
