import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { provisionRuntimeRole } from '../../src/database/provision-runtime-role';
import { REQUIRED_SCHEMA_MIGRATION } from '../../src/database/readiness';
import { assertSafeTestDatabaseUrl } from '../../src/database/test-database-safety';

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) {
  throw new Error('TEST_DATABASE_URL is required for integration tests');
}
assertSafeTestDatabaseUrl(connectionString);

describe('runtime database least-privilege provisioning', () => {
  const pool = new Pool({
    connectionString,
    max: 2,
    application_name: 'backend-v2-privilege-tests',
  });
  const runtimeRole = `backend_v2_runtime_test_${randomBytes(5).toString('hex')}`;

  beforeAll(async () => {
    await migrate(drizzle(pool), {
      migrationsFolder: resolve(process.cwd(), 'drizzle'),
    });
    await pool.query(
      `create role ${quoteIdentifier(
        runtimeRole,
      )} nologin nosuperuser nocreatedb nocreaterole nobypassrls`,
    );
    const client = await pool.connect();
    try {
      await provisionRuntimeRole(client, runtimeRole);
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    await pool.query(`drop owned by ${quoteIdentifier(runtimeRole)}`);
    await pool.query(`drop role ${quoteIdentifier(runtimeRole)}`);
    await pool.end();
  });

  it('allows normal runtime DML without granting application-schema DDL', async () => {
    const privileges = await pool.query<{
      can_create: boolean;
      can_insert: boolean;
      can_select: boolean;
    }>(
      `
        select
          has_schema_privilege($1, 'app', 'create') as can_create,
          has_table_privilege(
            $1,
            'app.application_users',
            'insert'
          ) as can_insert,
          has_table_privilege(
            $1,
            'app.application_users',
            'select'
          ) as can_select
      `,
      [runtimeRole],
    );

    expect(privileges.rows[0]).toEqual({
      can_create: false,
      can_insert: true,
      can_select: true,
    });

    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`set local role ${quoteIdentifier(runtimeRole)}`);
      await client.query(
        `
          insert into app.application_users (primary_email)
          values ($1)
        `,
        [`least-privilege-${randomBytes(6).toString('hex')}@example.test`],
      );
      await expect(
        client.query('create table app.runtime_must_not_create (id integer)'),
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await client.query('rollback').catch(() => undefined);
      client.release();
    }
  });

  it('keeps audit/history rows append-only for the runtime role', async () => {
    const result = await pool.query<{
      can_delete_audit: boolean;
      can_insert_audit: boolean;
      can_update_audit: boolean;
      can_update_interactions: boolean;
    }>(
      `
        select
          has_table_privilege(
            $1,
            'app.audit_logs',
            'insert'
          ) as can_insert_audit,
          has_table_privilege(
            $1,
            'app.audit_logs',
            'update'
          ) as can_update_audit,
          has_table_privilege(
            $1,
            'app.audit_logs',
            'delete'
          ) as can_delete_audit,
          has_table_privilege(
            $1,
            'app.employer_contact_interactions',
            'update'
          ) as can_update_interactions
      `,
      [runtimeRole],
    );

    expect(result.rows[0]).toEqual({
      can_delete_audit: false,
      can_insert_audit: true,
      can_update_audit: false,
      can_update_interactions: false,
    });
  });

  it('denies runtime access to migration evidence tables', async () => {
    const result = await pool.query<{
      can_read_migration_version: boolean;
      can_select_migration_evidence: boolean;
    }>(
      `
        select
          has_table_privilege(
            $1,
            'app.data_migration_runs',
            'select'
          ) as can_select_migration_evidence,
          has_table_privilege(
            $1,
            'drizzle.__drizzle_migrations',
            'select'
          ) as can_read_migration_version
      `,
      [runtimeRole],
    );

    expect(result.rows[0]).toEqual({
      can_read_migration_version: true,
      can_select_migration_evidence: false,
    });
  });

  it('allows only the migration metadata needed by readiness', async () => {
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(`set local role ${quoteIdentifier(runtimeRole)}`);
      const result = await client.query<{ compatible: boolean }>(
        `
          select
            exists (
              select 1
              from drizzle.__drizzle_migrations
              where hash = $1 and created_at = $2::bigint
            )
            and to_regclass('app.application_users') is not null
            as compatible
        `,
        [
          REQUIRED_SCHEMA_MIGRATION.sha256,
          REQUIRED_SCHEMA_MIGRATION.createdAt,
        ],
      );

      expect(result.rows[0]?.compatible).toBe(true);
    } finally {
      await client.query('rollback').catch(() => undefined);
      client.release();
    }
  });
});

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(identifier)) {
    throw new Error('Unsafe generated role identifier');
  }
  return `"${identifier}"`;
}
