import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { checkDatabaseReadiness } from '../../src/database/readiness';
import { assertSafeTestDatabaseUrl } from '../../src/database/test-database-safety';

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) {
  throw new Error('TEST_DATABASE_URL is required for integration tests');
}
const baseUrl = assertSafeTestDatabaseUrl(connectionString);

describe('migration-aware PostgreSQL readiness', () => {
  const pool = new Pool({
    connectionString,
    max: 2,
    application_name: 'backend-v2-readiness-tests',
  });
  const createdDatabases: string[] = [];

  beforeAll(async () => {
    await migrate(drizzle(pool), {
      migrationsFolder: resolve(process.cwd(), 'drizzle'),
    });
  });

  afterAll(async () => {
    for (const databaseName of createdDatabases.reverse()) {
      await pool.query(`drop database ${quoteIdentifier(databaseName)} with (force)`);
    }
    await pool.end();
  });

  it('reports ready for the current compatible database', async () => {
    await expect(checkDatabaseReadiness(pool, 1_000)).resolves.toBe(true);
  });

  it('reports not ready for a reachable but unmigrated database', async () => {
    const isolated = await createIsolatedDatabase('unmigrated');
    try {
      await expect(checkDatabaseReadiness(isolated, 1_000)).resolves.toBe(false);
    } finally {
      await isolated.end();
    }
  });

  it('reports not ready for a reachable stale/incompatible database', async () => {
    const isolated = await createIsolatedDatabase('stale');
    try {
      await isolated.query(`
        create schema drizzle;
        create table drizzle.__drizzle_migrations (
          id serial primary key,
          hash text not null,
          created_at bigint
        );
        insert into drizzle.__drizzle_migrations (hash, created_at)
        values ('stale-schema-hash', 1);
        create schema app;
        create table app.application_users (id integer);
        create table app.auth_identities (id integer);
        create table app.roles (id integer);
        create table app.user_roles (id integer);
        create table app.centers (id integer);
        create table app.employers (id integer);
      `);

      await expect(checkDatabaseReadiness(isolated, 1_000)).resolves.toBe(false);
    } finally {
      await isolated.end();
    }
  });

  async function createIsolatedDatabase(kind: string): Promise<Pool> {
    const baseDatabaseName = decodeURIComponent(baseUrl.pathname.slice(1));
    const databaseName = `${baseDatabaseName}_${kind}_${randomBytes(5).toString(
      'hex',
    )}`;
    const isolatedUrl = new URL(baseUrl);
    isolatedUrl.pathname = `/${databaseName}`;
    assertSafeTestDatabaseUrl(isolatedUrl.toString());

    await pool.query(`create database ${quoteIdentifier(databaseName)}`);
    createdDatabases.push(databaseName);

    return new Pool({
      connectionString: isolatedUrl.toString(),
      max: 1,
      application_name: `backend-v2-readiness-${kind}`,
    });
  }
});

function quoteIdentifier(identifier: string): string {
  if (!/^[a-z0-9_]+$/.test(identifier)) {
    throw new Error('Unsafe generated database identifier');
  }
  return `"${identifier}"`;
}
