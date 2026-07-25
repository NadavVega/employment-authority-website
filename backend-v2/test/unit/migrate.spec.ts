import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import {
  createMigrationPool,
  migrationDatabaseConfig,
} from '../../src/database/migrate';

describe('migration database configuration', () => {
  it('fails production startup before constructing a pool when TLS is missing', () => {
    const poolFactory = vi.fn();

    expect(() =>
      createMigrationPool(
        {
          NODE_ENV: 'production',
          MIGRATION_DATABASE_URL:
            'postgresql://migration-owner@database.internal/backend_v2',
        },
        poolFactory,
      ),
    ).toThrow(/DATABASE_SSL/);
    expect(poolFactory).not.toHaveBeenCalled();
  });

  it('fails production startup before constructing a pool for malformed TLS', () => {
    const poolFactory = vi.fn();

    expect(() =>
      createMigrationPool(
        {
          NODE_ENV: 'production',
          MIGRATION_DATABASE_URL:
            'postgresql://migration-owner@database.internal/backend_v2',
          DATABASE_SSL: 'prefer',
        },
        poolFactory,
      ),
    ).toThrow(/DATABASE_SSL/);
    expect(poolFactory).not.toHaveBeenCalled();
  });

  it('constructs a verified owner connection for valid production configuration', () => {
    const pool = {} as Pool;
    const poolFactory = vi.fn(() => pool);
    const environment = {
      NODE_ENV: 'production',
      MIGRATION_DATABASE_URL:
        'postgresql://migration-owner@database.internal/backend_v2',
      DATABASE_SSL: 'verify-full',
    };

    expect(createMigrationPool(environment, poolFactory)).toBe(pool);
    expect(migrationDatabaseConfig(environment)).toMatchObject({
      connectionString:
        'postgresql://migration-owner@database.internal/backend_v2',
      ssl: { rejectUnauthorized: true },
    });
  });
});
