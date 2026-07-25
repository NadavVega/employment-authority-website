import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrincipalRepository } from '../../src/auth/principal.repository';
import type { DatabaseService } from '../../src/database/database.service';
import {
  applicationUsersInApp,
  authIdentitiesInApp,
  rolesInApp,
  userRolesInApp,
} from '../../src/database/schema';
import * as schema from '../../src/database/schema';

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'TEST_DATABASE_URL is required and must target a disposable PostgreSQL database',
  );
}

describe('initial Backend V2 migration', () => {
  const pool = new Pool({
    connectionString,
    max: 2,
    application_name: 'backend-v2-integration-tests',
  });
  const db = drizzle(pool, { schema });

  beforeAll(async () => {
    await migrate(db, {
      migrationsFolder: resolve(process.cwd(), 'drizzle'),
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('creates the complete approved schema with valid constraints and indexes', async () => {
    const [catalog] = await pool.query<{
      constraints: string;
      foreign_keys: string;
      indexes: string;
      invalid_indexes: string;
      tables: string;
      unvalidated_constraints: string;
    }>(`
      select
        (select count(*) from pg_tables where schemaname = 'app')::text as tables,
        (
          select count(*)
          from pg_indexes
          where schemaname = 'app'
        )::text as indexes,
        (
          select count(*)
          from pg_constraint c
          join pg_namespace n on n.oid = c.connamespace
          where n.nspname = 'app'
        )::text as constraints,
        (
          select count(*)
          from pg_constraint c
          join pg_namespace n on n.oid = c.connamespace
          where n.nspname = 'app' and c.contype = 'f'
        )::text as foreign_keys,
        (
          select count(*)
          from pg_constraint c
          join pg_namespace n on n.oid = c.connamespace
          where n.nspname = 'app' and not c.convalidated
        )::text as unvalidated_constraints,
        (
          select count(*)
          from pg_index i
          join pg_class t on t.oid = i.indrelid
          join pg_namespace n on n.oid = t.relnamespace
          where n.nspname = 'app' and not i.indisvalid
        )::text as invalid_indexes
    `).then((result) => result.rows);

    expect(catalog).toEqual({
      tables: '35',
      indexes: '118',
      constraints: '252',
      foreign_keys: '77',
      unvalidated_constraints: '0',
      invalid_indexes: '0',
    });
  });

  it('seeds the approved application roles', async () => {
    const roles = await db
      .select({ code: rolesInApp.code })
      .from(rolesInApp)
      .orderBy(rolesInApp.code);

    expect(roles).toEqual([
      { code: 'admin' },
      { code: 'coordinator' },
      { code: 'employer' },
    ]);
  });

  it('resolves only a valid active Firebase-to-application principal mapping', async () => {
    const fixtureId = randomUUID();
    const providerSubject = `integration-firebase-${fixtureId}`;
    const [adminRole] = await db
      .select({ id: rolesInApp.id })
      .from(rolesInApp)
      .where(eq(rolesInApp.code, 'admin'))
      .limit(1);
    if (!adminRole) {
      throw new Error('Admin role seed is missing');
    }

    const [user] = await db
      .insert(applicationUsersInApp)
      .values({
        primaryEmail: `active-admin-${fixtureId}@example.test`,
        status: 'active',
      })
      .returning({ id: applicationUsersInApp.id });
    if (!user) {
      throw new Error('Failed to create integration user');
    }

    await db.insert(authIdentitiesInApp).values({
      applicationUserId: user.id,
      provider: 'firebase',
      providerSubject,
    });
    await db.insert(userRolesInApp).values({
      applicationUserId: user.id,
      roleId: adminRole.id,
    });

    const repository = new PrincipalRepository({
      db,
    } as DatabaseService);

    await expect(
      repository.resolveFirebasePrincipal('missing-firebase-uid'),
    ).resolves.toBeNull();
    await expect(
      repository.resolveFirebasePrincipal(providerSubject),
    ).resolves.toMatchObject({
      applicationUserId: user.id,
      authProvider: 'firebase',
      authSubject: providerSubject,
      roles: ['admin'],
    });
  });
});
