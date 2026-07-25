import { describe, expect, it } from 'vitest';

import { validateEnvironment } from '../../src/config/environment';

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
});
