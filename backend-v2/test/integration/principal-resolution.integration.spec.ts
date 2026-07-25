import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AuthenticationService } from '../../src/auth/authentication.service';
import type { FirebaseTokenVerifier } from '../../src/auth/firebase-token-verifier';
import { PrincipalRepository } from '../../src/auth/principal.repository';
import type { ApiException } from '../../src/common/errors/api.exception';
import type { DatabaseService } from '../../src/database/database.service';
import * as schema from '../../src/database/schema';
import { assertSafeTestDatabaseUrl } from '../../src/database/test-database-safety';

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) {
  throw new Error('TEST_DATABASE_URL is required for integration tests');
}
assertSafeTestDatabaseUrl(connectionString);

describe('database-backed application principal resolution', () => {
  const pool = new Pool({
    connectionString,
    max: 2,
    application_name: 'backend-v2-principal-tests',
  });
  const db = drizzle(pool, { schema });
  const repository = new PrincipalRepository({
    db,
  } as unknown as DatabaseService);
  let fixture: Awaited<ReturnType<typeof seedPrincipalFixture>>;

  beforeAll(async () => {
    await migrate(db, {
      migrationsFolder: resolve(process.cwd(), 'drizzle'),
    });
    fixture = await seedPrincipalFixture(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it.each(['admin', 'coordinator', 'employer'] as const)(
    'resolves an active %s principal',
    async (role) => {
      await expect(authenticate(repository, fixture.positive[role])).resolves.toMatchObject(
        {
          authSubject: fixture.positive[role],
          roles: [role],
        },
      );
    },
  );

  it('fails every negative identity/application/domain state closed with one safe response', async () => {
    const failures = await Promise.all(
      Object.values(fixture.negative).map(async (providerSubject) => {
        try {
          await authenticate(repository, providerSubject);
          return { unexpectedSuccess: true };
        } catch (error: unknown) {
          const apiError = error as ApiException;
          return {
            code: apiError.code,
            detail: apiError.detail,
            status: apiError.getStatus(),
          };
        }
      }),
    );

    expect(failures).toEqual(
      Array.from({ length: Object.keys(fixture.negative).length }, () => ({
        code: 'IDENTITY_NOT_LINKED',
        detail: 'The authenticated identity is not active for this application.',
        status: 403,
      })),
    );
  });
});

async function authenticate(
  repository: PrincipalRepository,
  providerSubject: string,
) {
  const verifier: FirebaseTokenVerifier = {
    verifyIdToken: async () => ({ uid: providerSubject }),
  };
  return new AuthenticationService(
    verifier,
    repository,
  ).authenticateFirebaseToken('integration-token');
}

async function seedPrincipalFixture(pool: Pool) {
  const suffix = randomUUID();
  const rolesResult = await pool.query<{ code: string; id: string }>(
    `select id, code from app.roles where code = any($1::text[])`,
    [['admin', 'coordinator', 'employer']],
  );
  const roles = Object.fromEntries(
    rolesResult.rows.map(({ code, id }) => [code, id]),
  ) as Record<'admin' | 'coordinator' | 'employer', string>;
  if (!roles.admin || !roles.coordinator || !roles.employer) {
    throw new Error('Principal fixture requires seeded roles');
  }

  const positive = {
    admin: `positive-admin-${suffix}`,
    coordinator: `positive-coordinator-${suffix}`,
    employer: `positive-employer-${suffix}`,
  };
  const negative = {
    retiredIdentity: `retired-identity-${suffix}`,
    suspendedUser: `suspended-user-${suffix}`,
    revokedRole: `revoked-role-${suffix}`,
    inactiveCoordinator: `inactive-coordinator-${suffix}`,
    inactiveCenter: `inactive-center-${suffix}`,
    deletedEmployerContact: `deleted-contact-${suffix}`,
    inactiveEmployer: `inactive-employer-${suffix}`,
    deletedEmployer: `deleted-employer-${suffix}`,
    missingDomainRelationship: `missing-relationship-${suffix}`,
  };

  const activeAdminUser = await createUserIdentity(
    pool,
    positive.admin,
    suffix,
    'active',
  );
  await grantRole(pool, activeAdminUser, roles.admin);

  const activeCoordinatorUser = await createUserIdentity(
    pool,
    positive.coordinator,
    suffix,
    'active',
  );
  await grantRole(pool, activeCoordinatorUser, roles.coordinator);
  const activeCenter = await createCenter(
    pool,
    `principal-active-${suffix}`,
    'active',
  );
  await createCoordinator(pool, activeCoordinatorUser, activeCenter, true);

  const activeEmployerUser = await createUserIdentity(
    pool,
    positive.employer,
    suffix,
    'active',
  );
  await grantRole(pool, activeEmployerUser, roles.employer);
  const activeEmployer = await createEmployer(
    pool,
    `Principal active employer ${suffix}`,
    'active',
  );
  await createEmployerContact(
    pool,
    activeEmployer,
    activeEmployerUser,
    false,
  );

  const retiredUser = await createUserIdentity(
    pool,
    negative.retiredIdentity,
    suffix,
    'active',
    true,
  );
  await grantRole(pool, retiredUser, roles.admin);

  const suspendedUser = await createUserIdentity(
    pool,
    negative.suspendedUser,
    suffix,
    'suspended',
  );
  await grantRole(pool, suspendedUser, roles.admin);

  const revokedRoleUser = await createUserIdentity(
    pool,
    negative.revokedRole,
    suffix,
    'active',
  );
  await grantRole(pool, revokedRoleUser, roles.admin, true);

  const inactiveCoordinatorUser = await createUserIdentity(
    pool,
    negative.inactiveCoordinator,
    suffix,
    'active',
  );
  await grantRole(pool, inactiveCoordinatorUser, roles.coordinator);
  await createCoordinator(
    pool,
    inactiveCoordinatorUser,
    activeCenter,
    false,
  );

  const inactiveCenterUser = await createUserIdentity(
    pool,
    negative.inactiveCenter,
    suffix,
    'active',
  );
  await grantRole(pool, inactiveCenterUser, roles.coordinator);
  const inactiveCenter = await createCenter(
    pool,
    `principal-inactive-${suffix}`,
    'inactive',
  );
  await createCoordinator(pool, inactiveCenterUser, inactiveCenter, true);

  const deletedContactUser = await createUserIdentity(
    pool,
    negative.deletedEmployerContact,
    suffix,
    'active',
  );
  await grantRole(pool, deletedContactUser, roles.employer);
  const deletedContactEmployer = await createEmployer(
    pool,
    `Principal deleted-contact employer ${suffix}`,
    'active',
  );
  await createEmployerContact(
    pool,
    deletedContactEmployer,
    deletedContactUser,
    true,
  );

  const inactiveEmployerUser = await createUserIdentity(
    pool,
    negative.inactiveEmployer,
    suffix,
    'active',
  );
  await grantRole(pool, inactiveEmployerUser, roles.employer);
  const inactiveEmployer = await createEmployer(
    pool,
    `Principal inactive employer ${suffix}`,
    'inactive',
  );
  await createEmployerContact(
    pool,
    inactiveEmployer,
    inactiveEmployerUser,
    false,
  );

  const deletedEmployerUser = await createUserIdentity(
    pool,
    negative.deletedEmployer,
    suffix,
    'active',
  );
  await grantRole(pool, deletedEmployerUser, roles.employer);
  const deletedEmployer = await createEmployer(
    pool,
    `Principal deleted employer ${suffix}`,
    'active',
    true,
  );
  await createEmployerContact(
    pool,
    deletedEmployer,
    deletedEmployerUser,
    false,
  );

  const missingRelationshipUser = await createUserIdentity(
    pool,
    negative.missingDomainRelationship,
    suffix,
    'active',
  );
  await grantRole(pool, missingRelationshipUser, roles.coordinator);

  return { negative, positive };
}

async function createUserIdentity(
  pool: Pool,
  providerSubject: string,
  suffix: string,
  status: 'active' | 'suspended',
  retired = false,
): Promise<string> {
  const userId = await insertId(
    pool,
    `
      insert into app.application_users (primary_email, status)
      values ($1, $2)
      returning id
    `,
    [`${providerSubject}-${suffix}@example.test`, status],
  );
  await pool.query(
    `
      insert into app.auth_identities
        (application_user_id, provider, provider_subject, retired_at)
      values ($1, 'firebase', $2, $3)
    `,
    [userId, providerSubject, retired ? new Date() : null],
  );
  return userId;
}

async function grantRole(
  pool: Pool,
  applicationUserId: string,
  roleId: string,
  revoked = false,
): Promise<void> {
  await pool.query(
    `
      insert into app.user_roles
        (
          application_user_id,
          role_id,
          granted_at,
          revoked_at,
          revocation_reason
        )
      values (
        $1,
        $2,
        case when $3::boolean then now() - interval '1 second' else now() end,
        case when $3::boolean then now() else null end,
        case when $3::boolean then 'integration negative state' else null end
      )
    `,
    [applicationUserId, roleId, revoked],
  );
}

async function createCenter(
  pool: Pool,
  code: string,
  status: 'active' | 'inactive',
): Promise<string> {
  return insertId(
    pool,
    `
      insert into app.centers (code, name, status, archived_at)
      values ($1, $2, $3, $4)
      returning id
    `,
    [
      code,
      `Center ${code}`,
      status,
      status === 'inactive' ? new Date() : null,
    ],
  );
}

async function createCoordinator(
  pool: Pool,
  applicationUserId: string,
  centerId: string,
  active: boolean,
): Promise<string> {
  return insertId(
    pool,
    `
      insert into app.coordinators
        (application_user_id, center_id, is_active, deactivated_at)
      values ($1, $2, $3, $4)
      returning id
    `,
    [applicationUserId, centerId, active, active ? null : new Date()],
  );
}

async function createEmployer(
  pool: Pool,
  displayName: string,
  status: 'active' | 'inactive',
  deleted = false,
): Promise<string> {
  return insertId(
    pool,
    `
      insert into app.employers (display_name, status, deleted_at)
      values ($1, $2, $3)
      returning id
    `,
    [displayName, status, deleted ? new Date() : null],
  );
}

async function createEmployerContact(
  pool: Pool,
  employerId: string,
  applicationUserId: string,
  deleted: boolean,
): Promise<string> {
  return insertId(
    pool,
    `
      insert into app.employer_contacts
        (employer_id, application_user_id, full_name, deleted_at)
      values ($1, $2, $3, $4)
      returning id
    `,
    [
      employerId,
      applicationUserId,
      `Contact ${applicationUserId}`,
      deleted ? new Date() : null,
    ],
  );
}

async function insertId(
  pool: Pool,
  sql: string,
  values: unknown[],
): Promise<string> {
  const result = await pool.query<{ id: string }>(sql, values);
  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error('Failed to create principal fixture');
  }
  return id;
}
