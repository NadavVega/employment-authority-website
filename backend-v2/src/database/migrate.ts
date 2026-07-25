import 'dotenv/config';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'node:path';
import { Pool, type PoolConfig } from 'pg';

import { validateMigrationEnvironment } from '../config/environment';

export type MigrationPoolFactory = (config: PoolConfig) => Pool;

export function migrationDatabaseConfig(
  rawEnvironment: Record<string, unknown>,
): PoolConfig {
  const environment = validateMigrationEnvironment(rawEnvironment);
  return {
    connectionString: environment.databaseUrl,
    max: 1,
    connectionTimeoutMillis: environment.connectionTimeoutMs,
    application_name: 'employment-authority-backend-v2-migrator',
    ssl:
      environment.sslMode === 'verify-full'
        ? { rejectUnauthorized: true }
        : false,
  };
}

export function createMigrationPool(
  rawEnvironment: Record<string, unknown>,
  poolFactory: MigrationPoolFactory = (config) => new Pool(config),
): Pool {
  const config = migrationDatabaseConfig(rawEnvironment);
  return poolFactory(config);
}

export async function runMigrations(
  rawEnvironment: Record<string, unknown> = process.env,
  poolFactory?: MigrationPoolFactory,
): Promise<void> {
  const pool = createMigrationPool(rawEnvironment, poolFactory);
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: resolve(process.cwd(), 'drizzle'),
    });
    process.stdout.write('Backend V2 migrations applied successfully.\n');
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  void runMigrations().catch((error: unknown) => {
    const errorType =
      error instanceof Error ? error.constructor.name : 'UnknownMigrationError';
    process.stderr.write(`Backend V2 migration failed (${errorType}).\n`);
    process.exitCode = 1;
  });
}
