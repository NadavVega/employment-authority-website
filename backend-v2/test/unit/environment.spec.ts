import { describe, expect, it } from 'vitest';

import {
  validateEnvironment,
  validateMigrationEnvironment,
} from '../../src/config/environment';

const validEnvironment = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/backend_v2',
  FIREBASE_PROJECT_ID: 'test-project',
};

describe('environment validation', () => {
  it('applies safe development defaults', () => {
    const environment = validateEnvironment(validEnvironment);

    expect(environment.PORT).toBe(3000);
    expect(environment.DB_POOL_MAX).toBe(10);
    expect(environment.DB_STATEMENT_TIMEOUT_MS).toBe(15_000);
    expect(environment.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS).toBe(30_000);
    expect(environment.DATABASE_SSL).toBe('disable');
  });

  it('fails fast for missing required production configuration', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
      }),
    ).toThrow(/CORS_ALLOWED_ORIGINS, DATABASE_SSL/);
  });

  it('does not include configuration values in validation errors', () => {
    const secretLikeValue = 'postgresql://private-user:private-password@';

    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        DATABASE_URL: secretLikeValue,
      }),
    ).toThrowError(
      expect.objectContaining({
        message: expect.not.stringContaining(secretLikeValue),
      }),
    );
  });

  it.each([
    '*',
    'null',
    'file:///tmp/backend',
    'javascript:alert(1)',
    'https://user:password@example.test',
    'https://example.test/path',
  ])('rejects unsafe CORS origin %s', (origin) => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        CORS_ALLOWED_ORIGINS: origin,
      }),
    ).toThrow(/CORS_ALLOWED_ORIGINS/);
  });

  it('requires HTTPS origins in production', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        DATABASE_SSL: 'verify-full',
        CORS_ALLOWED_ORIGINS: 'http://app.example.test',
      }),
    ).toThrow(/CORS_ALLOWED_ORIGINS/);
  });

  it('allows explicitly approved production loopback origins for smoke environments', () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        DATABASE_SSL: 'verify-full',
        CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:5173',
        CORS_ALLOW_INSECURE_LOCALHOST: 'true',
      }).CORS_ALLOWED_ORIGINS,
    ).toBe('http://127.0.0.1:5173');
  });

  it('accepts only HTTP(S) origin-only CORS values', () => {
    expect(
      validateEnvironment({
        ...validEnvironment,
        CORS_ALLOWED_ORIGINS:
          'http://localhost:5173,https://app.example.test/',
      }).CORS_ALLOWED_ORIGINS,
    ).toBe('http://localhost:5173,https://app.example.test/');
  });
});

describe('migration environment validation', () => {
  it('allows the runtime URL fallback only outside production', () => {
    expect(
      validateMigrationEnvironment({
        NODE_ENV: 'development',
        DATABASE_URL: validEnvironment.DATABASE_URL,
      }),
    ).toMatchObject({
      databaseUrl: validEnvironment.DATABASE_URL,
      sslMode: 'disable',
    });
  });

  it.each([
    {},
    {
      NODE_ENV: 'production',
      DATABASE_URL: validEnvironment.DATABASE_URL,
      DATABASE_SSL: 'verify-full',
    },
    {
      NODE_ENV: 'production',
      MIGRATION_DATABASE_URL: validEnvironment.DATABASE_URL,
    },
    {
      NODE_ENV: 'production',
      MIGRATION_DATABASE_URL: validEnvironment.DATABASE_URL,
      DATABASE_SSL: 'not-a-mode',
    },
    {
      NODE_ENV: 'production',
      MIGRATION_DATABASE_URL: `${validEnvironment.DATABASE_URL}?sslmode=disable`,
      DATABASE_SSL: 'verify-full',
    },
  ])(
    'rejects missing or TLS-invalid production migration configuration',
    (environment) => {
      expect(() => validateMigrationEnvironment(environment)).toThrow(
        /Invalid Backend V2 configuration/,
      );
    },
  );

  it('accepts a separate production owner URL only with verified TLS', () => {
    expect(
      validateMigrationEnvironment({
        NODE_ENV: 'production',
        MIGRATION_DATABASE_URL:
          'postgresql://migration-owner@database.internal/backend_v2',
        DATABASE_SSL: 'verify-full',
      }),
    ).toMatchObject({
      databaseUrl:
        'postgresql://migration-owner@database.internal/backend_v2',
      sslMode: 'verify-full',
    });
  });
});
