import 'dotenv/config';

import type { Pool, PoolClient } from 'pg';

import { createMigrationPool } from './migrate';

const SAFE_ROLE_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

const APPEND_ONLY_TABLES = [
  'app.audit_logs',
  'app.employer_contact_interactions',
  'app.privacy_request_decisions',
  'app.event_publication_history',
  'app.article_status_history',
] as const;

const MIGRATION_ONLY_TABLES = [
  'app.data_migration_runs',
  'app.legacy_record_mappings',
  'app.data_migration_run_items',
] as const;

type ProvisioningClient = Pick<PoolClient, 'query'>;

export async function provisionRuntimeRole(
  client: ProvisioningClient,
  runtimeRole: string,
): Promise<void> {
  if (!SAFE_ROLE_NAME.test(runtimeRole)) {
    throw new Error('DATABASE_RUNTIME_ROLE must be a safe PostgreSQL role name');
  }

  const roleResult = await client.query<{
    rolbypassrls: boolean;
    rolcreatedb: boolean;
    rolcreaterole: boolean;
    rolsuper: boolean;
  }>(
    `
      select rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
      from pg_roles
      where rolname = $1
    `,
    [runtimeRole],
  );
  const role = roleResult.rows[0];
  if (!role) {
    throw new Error('DATABASE_RUNTIME_ROLE must already exist');
  }
  if (
    role.rolsuper ||
    role.rolcreatedb ||
    role.rolcreaterole ||
    role.rolbypassrls
  ) {
    throw new Error('DATABASE_RUNTIME_ROLE has prohibited elevated privileges');
  }

  const membershipResult = await client.query<{ memberships: string }>(
    `
      select count(*)::text as memberships
      from pg_auth_members membership
      join pg_roles member_role on member_role.oid = membership.member
      where member_role.rolname = $1
    `,
    [runtimeRole],
  );
  if (membershipResult.rows[0]?.memberships !== '0') {
    throw new Error('DATABASE_RUNTIME_ROLE must not inherit other roles');
  }

  const ownershipResult = await client.query<{ owned_objects: string }>(
    `
      select (
        (
          select count(*)
          from pg_class object
          join pg_namespace namespace on namespace.oid = object.relnamespace
          join pg_roles owner_role on owner_role.oid = object.relowner
          where namespace.nspname = 'app' and owner_role.rolname = $1
        )
        + (
          select count(*)
          from pg_namespace namespace
          join pg_roles owner_role on owner_role.oid = namespace.nspowner
          where namespace.nspname = 'app' and owner_role.rolname = $1
        )
        + (
          select count(*)
          from pg_database database
          join pg_roles owner_role on owner_role.oid = database.datdba
          where database.datname = current_database()
            and owner_role.rolname = $1
        )
      )::text as owned_objects
    `,
    [runtimeRole],
  );
  if (ownershipResult.rows[0]?.owned_objects !== '0') {
    throw new Error('DATABASE_RUNTIME_ROLE must not own application objects');
  }

  const quotedRole = quoteIdentifier(runtimeRole);
  const databaseResult = await client.query<{ database_name: string }>(
    'select current_database() as database_name',
  );
  const databaseName = databaseResult.rows[0]?.database_name;
  if (!databaseName) {
    throw new Error('Unable to resolve the current database');
  }

  await client.query('begin');
  try {
    await client.query(
      `grant connect on database ${quoteIdentifier(databaseName)} to ${quotedRole}`,
    );
    await client.query('revoke create on schema public from public');
    await client.query(`revoke create on schema app from ${quotedRole}`);
    await client.query(`revoke create on schema drizzle from ${quotedRole}`);
    await client.query(`grant usage on schema app to ${quotedRole}`);
    await client.query(`grant usage on schema drizzle to ${quotedRole}`);
    await client.query(
      `grant select on table drizzle.__drizzle_migrations to ${quotedRole}`,
    );
    await client.query(
      `grant select, insert, update, delete on all tables in schema app to ${quotedRole}`,
    );
    await client.query(
      `grant usage, select on all sequences in schema app to ${quotedRole}`,
    );
    await client.query(
      `revoke update, delete, truncate on table ${APPEND_ONLY_TABLES.join(
        ', ',
      )} from ${quotedRole}`,
    );
    await client.query(
      `revoke all privileges on table ${MIGRATION_ONLY_TABLES.join(
        ', ',
      )} from ${quotedRole}`,
    );
    await client.query('commit');
  } catch (error: unknown) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  }
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function run(): Promise<void> {
  const runtimeRole = process.env.DATABASE_RUNTIME_ROLE;
  if (!runtimeRole) {
    throw new Error('DATABASE_RUNTIME_ROLE is required');
  }

  const pool: Pool = createMigrationPool(process.env);
  const client = await pool.connect();
  try {
    await provisionRuntimeRole(client, runtimeRole);
    process.stdout.write(
      'Backend V2 runtime database privileges provisioned successfully.\n',
    );
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  void run().catch((error: unknown) => {
    const errorType =
      error instanceof Error
        ? error.constructor.name
        : 'UnknownProvisioningError';
    process.stderr.write(
      `Backend V2 privilege provisioning failed (${errorType}).\n`,
    );
    process.exitCode = 1;
  });
}
