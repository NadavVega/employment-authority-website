import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PoolConfig } from 'pg';

import type { Environment } from './environment';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  get nodeEnvironment(): Environment['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  get logLevel(): Environment['LOG_LEVEL'] {
    return this.config.get('LOG_LEVEL', { infer: true });
  }

  get requestBodyLimit(): string {
    return this.config.get('REQUEST_BODY_LIMIT', { infer: true });
  }

  get corsAllowedOrigins(): string[] {
    const configured = this.config.get('CORS_ALLOWED_ORIGINS', { infer: true });
    const values =
      configured
        ?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean) ?? [];

    if (values.length > 0) {
      return [...new Set(values.map((origin) => new URL(origin).origin))];
    }

    return this.nodeEnvironment === 'production'
      ? []
      : ['http://localhost:5173'];
  }

  get firebaseProjectId(): string {
    return this.config.get('FIREBASE_PROJECT_ID', { infer: true });
  }

  get databaseReadinessTimeoutMs(): number {
    return this.config.get('DB_READINESS_TIMEOUT_MS', { infer: true });
  }

  get databasePoolConfig(): PoolConfig {
    const sslMode = this.config.get('DATABASE_SSL', { infer: true });

    return {
      connectionString: this.config.get('DATABASE_URL', { infer: true }),
      max: this.config.get('DB_POOL_MAX', { infer: true }),
      connectionTimeoutMillis: this.config.get('DB_CONNECTION_TIMEOUT_MS', {
        infer: true,
      }),
      idleTimeoutMillis: this.config.get('DB_IDLE_TIMEOUT_MS', { infer: true }),
      statement_timeout: this.config.get('DB_STATEMENT_TIMEOUT_MS', {
        infer: true,
      }),
      idle_in_transaction_session_timeout: this.config.get(
        'DB_IDLE_IN_TRANSACTION_TIMEOUT_MS',
        { infer: true },
      ),
      application_name: 'employment-authority-backend-v2',
      ssl: sslMode === 'verify-full' ? { rejectUnauthorized: true } : false,
    };
  }
}
