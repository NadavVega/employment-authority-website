import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { configureApplication } from './application';
import { StructuredLoggerService } from './common/logging/structured-logger.service';
import { AppConfigService } from './config/app-config.service';

export async function bootstrap(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  const logger = app.get(StructuredLoggerService);
  const config = app.get(AppConfigService);

  app.useLogger(logger);
  configureApplication(app);
  app.enableShutdownHooks();
  await app.listen(config.port, '0.0.0.0');
  logger.infoEvent('application_started', { port: config.port });

  return app;
}

if (require.main === module) {
  void bootstrap();
}
