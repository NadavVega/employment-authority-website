import { describe, expect, it } from 'vitest';

import { assertSafeTestDatabaseUrl } from '../../src/database/test-database-safety';

describe('integration test database safety', () => {
  it.each([
    'postgresql://postgres@127.0.0.1/backend_v2_test',
    'postgresql://postgres@localhost/test_backend_v2',
  ])('accepts an explicit local disposable target', (url) => {
    expect(assertSafeTestDatabaseUrl(url)).toBeInstanceOf(URL);
  });

  it.each([
    'postgresql://postgres@127.0.0.1/backend_v2',
    'postgresql://postgres@127.0.0.1/postgres',
    'postgresql://postgres@prod-db.internal/backend_v2_test',
    'postgresql://postgres@127.0.0.1/backend_v2_production_test',
    'https://127.0.0.1/backend_v2_test',
  ])('rejects unsafe target %s', (url) => {
    expect(() => assertSafeTestDatabaseUrl(url)).toThrow();
  });

  it('requires an exact acknowledgement for a non-production remote test database', () => {
    const url =
      'postgresql://postgres@test-db.internal/employment_authority_test';

    expect(() => assertSafeTestDatabaseUrl(url)).toThrow(
      /exact acknowledgement/,
    );
    expect(
      assertSafeTestDatabaseUrl(url, {
        TEST_DATABASE_DESTRUCTIVE_ACK:
          'I_UNDERSTAND:employment_authority_test',
      }),
    ).toBeInstanceOf(URL);
  });
});
