import { Injectable, type LoggerService } from '@nestjs/common';
import pino, { type Logger } from 'pino';

import { AppConfigService } from '../../config/app-config.service';

type LogFields = Readonly<Record<string, boolean | number | string | undefined>>;

@Injectable()
export class StructuredLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor(config: AppConfigService) {
    this.logger = pino({
      level: config.logLevel,
      base: {
        service: 'employment-authority-backend-v2',
        environment: config.nodeEnvironment,
      },
      redact: {
        paths: [
          '*.authorization',
          '*.cookie',
          '*.password',
          '*.privateKey',
          '*.token',
          '*.idToken',
          '*.providerSecret',
        ],
        censor: '[REDACTED]',
      },
    });
  }

  log(message: unknown, context?: string): void {
    this.logger.info({ context }, this.safeMessage(message));
  }

  error(message: unknown, _trace?: string, context?: string): void {
    this.logger.error({ context }, this.safeMessage(message));
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn({ context }, this.safeMessage(message));
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug({ context }, this.safeMessage(message));
  }

  verbose(message: unknown, context?: string): void {
    this.logger.trace({ context }, this.safeMessage(message));
  }

  infoEvent(event: string, fields: LogFields = {}): void {
    this.logger.info({ event, ...fields }, event);
  }

  warnEvent(event: string, fields: LogFields = {}): void {
    this.logger.warn({ event, ...fields }, event);
  }

  errorEvent(event: string, fields: LogFields = {}): void {
    this.logger.error({ event, ...fields }, event);
  }

  private safeMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }
    if (typeof message === 'number' || typeof message === 'boolean') {
      return String(message);
    }
    return 'Structured log event';
  }
}
