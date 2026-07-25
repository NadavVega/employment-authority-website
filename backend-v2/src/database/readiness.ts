import type { Pool, PoolClient } from 'pg';

export const REQUIRED_SCHEMA_MIGRATION = {
  createdAt: '1784957069605',
  sha256: 'cb03410b276f2adcae7e379bd9e0716adca06658998dc226696c65a108e80bef',
} as const;

const REQUIRED_RELATIONS = [
  'app.application_users',
  'app.auth_identities',
  'app.roles',
  'app.user_roles',
  'app.centers',
  'app.employers',
] as const;

type ReadinessPool = Pick<Pool, 'connect'>;

export async function checkDatabaseReadiness(
  pool: ReadinessPool,
  timeoutMs: number,
): Promise<boolean> {
  let client: PoolClient | undefined;
  let transactionOpen = false;
  let destroyClient = false;

  try {
    client = await pool.connect();
    await client.query('begin');
    transactionOpen = true;
    await client.query('select set_config($1, $2, true)', [
      'statement_timeout',
      String(timeoutMs),
    ]);

    const result = await client.query<{ compatible: boolean }>(
      `
        select
          exists (
            select 1
            from drizzle.__drizzle_migrations
            where hash = $1 and created_at = $2::bigint
          )
          and not exists (
            select 1
            from unnest($3::text[]) as required_relation(name)
            where to_regclass(required_relation.name) is null
          ) as compatible
      `,
      [
        REQUIRED_SCHEMA_MIGRATION.sha256,
        REQUIRED_SCHEMA_MIGRATION.createdAt,
        REQUIRED_RELATIONS,
      ],
    );

    await client.query('rollback');
    transactionOpen = false;
    return result.rows[0]?.compatible === true;
  } catch {
    return false;
  } finally {
    if (client) {
      if (transactionOpen) {
        try {
          await client.query('rollback');
          transactionOpen = false;
        } catch {
          destroyClient = true;
        }
      }
      client.release(destroyClient);
    }
  }
}
