import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrincipalRepository } from '../../src/auth/principal.repository';
import type { DatabaseService } from '../../src/database/database.service';
import { assertSafeTestDatabaseUrl } from '../../src/database/test-database-safety';
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
assertSafeTestDatabaseUrl(connectionString);

const EXPECTED_COMPOSITE_FOREIGN_KEYS = {
  fk_coordinator_assignments_center_relationship:
    'FOREIGN KEY (center_relationship_id, employer_id, center_id) REFERENCES app.employer_center_relationships(id, employer_id, center_id) ON DELETE RESTRICT',
  fk_employer_contact_interactions_contact:
    'FOREIGN KEY (employer_contact_id, employer_id) REFERENCES app.employer_contacts(id, employer_id) ON DELETE RESTRICT',
  fk_employer_private_information_primary_contact:
    'FOREIGN KEY (primary_contact_id, employer_id) REFERENCES app.employer_contacts(id, employer_id) ON DELETE RESTRICT',
  fk_event_registrations_submitting_contact:
    'FOREIGN KEY (submitted_by_contact_id, employer_id, submitted_by_user_id) REFERENCES app.employer_contacts(id, employer_id, application_user_id) ON DELETE RESTRICT',
  fk_events_owner_coordinator_center:
    'FOREIGN KEY (owner_coordinator_id, center_id) REFERENCES app.coordinators(id, center_id) ON DELETE RESTRICT',
  fk_privacy_access_grants_source:
    'FOREIGN KEY (source_privacy_request_id, employer_id, grantee_coordinator_id) REFERENCES app.privacy_requests(id, employer_id, requester_coordinator_id) ON DELETE RESTRICT',
  fk_privacy_requests_assignment:
    'FOREIGN KEY (coordinator_assignment_id, employer_id, assigned_coordinator_id) REFERENCES app.coordinator_assignments(id, employer_id, coordinator_id) ON DELETE RESTRICT',
} as const;

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

  it('matches the approved PostgreSQL definitions for all seven composite foreign keys', async () => {
    const result = await pool.query<{
      definition: string;
      name: keyof typeof EXPECTED_COMPOSITE_FOREIGN_KEYS;
    }>(
      `
        select
          constraint_name.conname as name,
          pg_get_constraintdef(constraint_name.oid, true) as definition
        from pg_constraint constraint_name
        join pg_namespace namespace
          on namespace.oid = constraint_name.connamespace
        where namespace.nspname = 'app'
          and constraint_name.conname = any($1::text[])
        order by constraint_name.conname
      `,
      [Object.keys(EXPECTED_COMPOSITE_FOREIGN_KEYS)],
    );

    expect(result.rows).toHaveLength(7);
    for (const row of result.rows) {
      expect(normalizeSql(row.definition)).toBe(
        normalizeSql(EXPECTED_COMPOSITE_FOREIGN_KEYS[row.name]),
      );
    }
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
    } as unknown as DatabaseService);

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

function normalizeSql(value: string): string {
  return value.replaceAll('"', '').replace(/\s+/g, ' ').trim();
}
