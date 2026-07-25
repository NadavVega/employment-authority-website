import 'dotenv/config';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'node:path';
import { Pool, type PoolConfig } from 'pg';

function databaseConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const url = new URL(connectionString);
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must be a PostgreSQL URL');
  }

  return {
    connectionString,
    max: 1,
    application_name: 'employment-authority-backend-v2-migrator',
    ssl:
      process.env.DATABASE_SSL === 'verify-full'
        ? { rejectUnauthorized: true }
        : false,
  };
}

async function run(): Promise<void> {
  const pool = new Pool(databaseConfig());
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: resolve(process.cwd(), 'drizzle'),
    });
    process.stdout.write('Backend V2 migrations applied successfully.\n');
  } finally {
    await pool.end();
  }
}

void run().catch((error: unknown) => {
  const errorType =
    error instanceof Error ? error.constructor.name : 'UnknownMigrationError';
  process.stderr.write(`Backend V2 migration failed (${errorType}).\n`);
  process.exitCode = 1;
});
