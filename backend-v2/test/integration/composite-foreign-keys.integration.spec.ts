import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { assertSafeTestDatabaseUrl } from '../../src/database/test-database-safety';

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) {
  throw new Error('TEST_DATABASE_URL is required for integration tests');
}
assertSafeTestDatabaseUrl(connectionString);

type Fixture = {
  adminUserId: string;
  assignmentOneId: string;
  centerOneId: string;
  centerTwoId: string;
  contactOneId: string;
  contactTwoId: string;
  coordinatorOneId: string;
  coordinatorTwoId: string;
  employerOneId: string;
  employerTwoId: string;
  employerUserOneId: string;
  employerUserTwoId: string;
  eventId: string;
  relationshipTwoId: string;
  requestOneId: string;
  requestTwoId: string;
};

describe('approved composite foreign-key relationships', () => {
  const pool = new Pool({
    connectionString,
    max: 2,
    application_name: 'backend-v2-composite-fk-tests',
  });
  let fixture: Fixture;

  beforeAll(async () => {
    await migrate(drizzle(pool), {
      migrationsFolder: resolve(process.cwd(), 'drizzle'),
    });
    fixture = await seedValidCompositeFixture(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('accepts the approved same-employer and same-center tuples', async () => {
    const result = await pool.query<{ grants: string; registrations: string }>(
      `
        select
          (
            select count(*)::text
            from app.privacy_access_grants
            where source_privacy_request_id = $1
          ) as grants,
          (
            select count(*)::text
            from app.event_registrations
            where event_id = $2 and employer_id = $3
          ) as registrations
      `,
      [fixture.requestOneId, fixture.eventId, fixture.employerOneId],
    );

    expect(result.rows[0]).toEqual({ grants: '1', registrations: '1' });
  });

  it('rejects a private-information primary contact from another employer', async () => {
    await expectForeignKeyViolation(
      pool.query(
        `
          insert into app.employer_private_information
            (employer_id, primary_contact_id, notes)
          values ($1, $2, 'must fail')
        `,
        [fixture.employerTwoId, fixture.contactOneId],
      ),
      'fk_employer_private_information_primary_contact',
    );
  });

  it('rejects a contact interaction linked across employers', async () => {
    await expectForeignKeyViolation(
      pool.query(
        `
          insert into app.employer_contact_interactions
            (
              employer_id,
              employer_contact_id,
              interaction_kind,
              summary,
              occurred_at,
              recorded_by_identity
            )
          values ($1, $2, 'note', 'must fail', now(), 'integration-test')
        `,
        [fixture.employerTwoId, fixture.contactOneId],
      ),
      'fk_employer_contact_interactions_contact',
    );
  });

  it('rejects a coordinator assignment with a cross-center relationship tuple', async () => {
    await expectForeignKeyViolation(
      pool.query(
        `
          insert into app.coordinator_assignments
            (
              employer_id,
              coordinator_id,
              center_id,
              center_relationship_id,
              assigned_by_user_id
            )
          values ($1, $2, $3, $4, $5)
        `,
        [
          fixture.employerTwoId,
          fixture.coordinatorOneId,
          fixture.centerOneId,
          fixture.relationshipTwoId,
          fixture.adminUserId,
        ],
      ),
      'fk_coordinator_assignments_center_relationship',
    );
  });

  it('rejects a privacy request with an assignment from another employer', async () => {
    await expectForeignKeyViolation(
      pool.query(
        `
          insert into app.privacy_requests
            (
              requester_coordinator_id,
              employer_id,
              assigned_coordinator_id,
              coordinator_assignment_id,
              purpose,
              expires_at
            )
          values ($1, $2, $3, $4, 'must fail', now() + interval '1 day')
        `,
        [
          fixture.coordinatorTwoId,
          fixture.employerTwoId,
          fixture.coordinatorOneId,
          fixture.assignmentOneId,
        ],
      ),
      'fk_privacy_requests_assignment',
    );
  });

  it('rejects a privacy grant whose employer does not match its source request', async () => {
    await expectForeignKeyViolation(
      pool.query(
        `
          insert into app.privacy_access_grants
            (
              employer_id,
              grantee_coordinator_id,
              source_privacy_request_id,
              granted_by_user_id,
              expires_at
            )
          values ($1, $2, $3, $4, now() + interval '1 day')
        `,
        [
          fixture.employerOneId,
          fixture.coordinatorOneId,
          fixture.requestTwoId,
          fixture.adminUserId,
        ],
      ),
      'fk_privacy_access_grants_source',
    );
  });

  it('rejects cross-center event ownership', async () => {
    await expectForeignKeyViolation(
      pool.query(
        `
          insert into app.events
            (
              center_id,
              creator_user_id,
              owner_coordinator_id,
              title,
              description,
              starts_at,
              ends_at
            )
          values (
            $1,
            $2,
            $3,
            'Cross-center event',
            'must fail',
            now() + interval '1 day',
            now() + interval '2 days'
          )
        `,
        [
          fixture.centerOneId,
          fixture.adminUserId,
          fixture.coordinatorTwoId,
        ],
      ),
      'fk_events_owner_coordinator_center',
    );
  });

  it('rejects a registration submitted by another employer contact', async () => {
    await expectForeignKeyViolation(
      pool.query(
        `
          insert into app.event_registrations
            (
              event_id,
              employer_id,
              cycle_number,
              submitted_by_contact_id,
              submitted_by_user_id,
              status,
              confirmed_at
            )
          values ($1, $2, 1, $3, $4, 'confirmed', now())
        `,
        [
          fixture.eventId,
          fixture.employerTwoId,
          fixture.contactOneId,
          fixture.employerUserOneId,
        ],
      ),
      'fk_event_registrations_submitting_contact',
    );
  });
});

async function seedValidCompositeFixture(pool: Pool): Promise<Fixture> {
  const suffix = randomUUID();
  const adminUserId = await insertId(
    pool,
    `
      insert into app.application_users (primary_email, status)
      values ($1, 'active')
      returning id
    `,
    [`composite-admin-${suffix}@example.test`],
  );
  const coordinatorUserOneId = await insertId(
    pool,
    `
      insert into app.application_users (primary_email, status)
      values ($1, 'active')
      returning id
    `,
    [`composite-coordinator-one-${suffix}@example.test`],
  );
  const coordinatorUserTwoId = await insertId(
    pool,
    `
      insert into app.application_users (primary_email, status)
      values ($1, 'active')
      returning id
    `,
    [`composite-coordinator-two-${suffix}@example.test`],
  );
  const employerUserOneId = await insertId(
    pool,
    `
      insert into app.application_users (primary_email, status)
      values ($1, 'active')
      returning id
    `,
    [`composite-employer-one-${suffix}@example.test`],
  );
  const employerUserTwoId = await insertId(
    pool,
    `
      insert into app.application_users (primary_email, status)
      values ($1, 'active')
      returning id
    `,
    [`composite-employer-two-${suffix}@example.test`],
  );
  const centerOneId = await insertId(
    pool,
    `
      insert into app.centers (code, name)
      values ($1, $2)
      returning id
    `,
    [`composite-center-one-${suffix}`, `Composite center one ${suffix}`],
  );
  const centerTwoId = await insertId(
    pool,
    `
      insert into app.centers (code, name)
      values ($1, $2)
      returning id
    `,
    [`composite-center-two-${suffix}`, `Composite center two ${suffix}`],
  );
  const coordinatorOneId = await insertId(
    pool,
    `
      insert into app.coordinators (application_user_id, center_id)
      values ($1, $2)
      returning id
    `,
    [coordinatorUserOneId, centerOneId],
  );
  const coordinatorTwoId = await insertId(
    pool,
    `
      insert into app.coordinators (application_user_id, center_id)
      values ($1, $2)
      returning id
    `,
    [coordinatorUserTwoId, centerTwoId],
  );
  const employerOneId = await insertId(
    pool,
    `
      insert into app.employers (display_name, status, created_by_user_id)
      values ($1, 'active', $2)
      returning id
    `,
    [`Composite employer one ${suffix}`, adminUserId],
  );
  const employerTwoId = await insertId(
    pool,
    `
      insert into app.employers (display_name, status, created_by_user_id)
      values ($1, 'active', $2)
      returning id
    `,
    [`Composite employer two ${suffix}`, adminUserId],
  );
  const contactOneId = await insertId(
    pool,
    `
      insert into app.employer_contacts
        (employer_id, application_user_id, full_name, can_manage_employer)
      values ($1, $2, 'Employer contact one', true)
      returning id
    `,
    [employerOneId, employerUserOneId],
  );
  const contactTwoId = await insertId(
    pool,
    `
      insert into app.employer_contacts
        (employer_id, application_user_id, full_name, can_manage_employer)
      values ($1, $2, 'Employer contact two', true)
      returning id
    `,
    [employerTwoId, employerUserTwoId],
  );
  const relationshipOneId = await insertId(
    pool,
    `
      insert into app.employer_center_relationships
        (employer_id, center_id, created_by_user_id)
      values ($1, $2, $3)
      returning id
    `,
    [employerOneId, centerOneId, adminUserId],
  );
  const relationshipTwoId = await insertId(
    pool,
    `
      insert into app.employer_center_relationships
        (employer_id, center_id, created_by_user_id)
      values ($1, $2, $3)
      returning id
    `,
    [employerTwoId, centerTwoId, adminUserId],
  );
  const assignmentOneId = await insertId(
    pool,
    `
      insert into app.coordinator_assignments
        (
          employer_id,
          coordinator_id,
          center_id,
          center_relationship_id,
          assigned_by_user_id
        )
      values ($1, $2, $3, $4, $5)
      returning id
    `,
    [
      employerOneId,
      coordinatorOneId,
      centerOneId,
      relationshipOneId,
      adminUserId,
    ],
  );
  const requestOneId = await insertId(
    pool,
    `
      insert into app.privacy_requests
        (
          requester_coordinator_id,
          employer_id,
          assigned_coordinator_id,
          coordinator_assignment_id,
          purpose,
          expires_at
        )
      values ($1, $2, $3, $4, 'valid source request', now() + interval '2 days')
      returning id
    `,
    [
      coordinatorTwoId,
      employerOneId,
      coordinatorOneId,
      assignmentOneId,
    ],
  );
  const requestTwoId = await insertId(
    pool,
    `
      insert into app.privacy_requests
        (requester_coordinator_id, employer_id, purpose, expires_at)
      values ($1, $2, 'second source request', now() + interval '2 days')
      returning id
    `,
    [coordinatorOneId, employerTwoId],
  );
  const eventId = await insertId(
    pool,
    `
      insert into app.events
        (
          center_id,
          creator_user_id,
          owner_coordinator_id,
          title,
          description,
          starts_at,
          ends_at
        )
      values (
        $1,
        $2,
        $3,
        'Valid composite event',
        'Valid composite event description',
        now() + interval '1 day',
        now() + interval '2 days'
      )
      returning id
    `,
    [centerOneId, adminUserId, coordinatorOneId],
  );

  await pool.query(
    `
      insert into app.employer_private_information
        (employer_id, primary_contact_id, notes)
      values ($1, $2, 'valid private tuple')
    `,
    [employerOneId, contactOneId],
  );
  await pool.query(
    `
      insert into app.employer_contact_interactions
        (
          employer_id,
          employer_contact_id,
          interaction_kind,
          summary,
          occurred_at,
          recorded_by_user_id,
          recorded_by_coordinator_id,
          recorded_by_identity
        )
      values ($1, $2, 'note', 'valid interaction tuple', now(), $3, $4, $5)
    `,
    [
      employerOneId,
      contactOneId,
      coordinatorUserOneId,
      coordinatorOneId,
      `integration-coordinator-${suffix}`,
    ],
  );
  await pool.query(
    `
      insert into app.privacy_access_grants
        (
          employer_id,
          grantee_coordinator_id,
          source_privacy_request_id,
          granted_by_user_id,
          expires_at
        )
      values ($1, $2, $3, $4, now() + interval '1 day')
    `,
    [employerOneId, coordinatorTwoId, requestOneId, adminUserId],
  );
  await pool.query(
    `
      insert into app.event_registrations
        (
          event_id,
          employer_id,
          cycle_number,
          submitted_by_contact_id,
          submitted_by_user_id,
          status,
          confirmed_at
        )
      values ($1, $2, 1, $3, $4, 'confirmed', now())
    `,
    [eventId, employerOneId, contactOneId, employerUserOneId],
  );

  return {
    adminUserId,
    assignmentOneId,
    centerOneId,
    centerTwoId,
    contactOneId,
    contactTwoId,
    coordinatorOneId,
    coordinatorTwoId,
    employerOneId,
    employerTwoId,
    employerUserOneId,
    employerUserTwoId,
    eventId,
    relationshipTwoId,
    requestOneId,
    requestTwoId,
  };
}

async function insertId(
  pool: Pool,
  sql: string,
  values: unknown[],
): Promise<string> {
  const result = await pool.query<{ id: string }>(sql, values);
  const id = result.rows[0]?.id;
  if (!id) {
    throw new Error('Failed to create composite foreign-key fixture');
  }
  return id;
}

async function expectForeignKeyViolation(
  operation: Promise<unknown>,
  constraint: string,
): Promise<void> {
  try {
    await operation;
    throw new Error(`Expected ${constraint} to reject the tuple`);
  } catch (error: unknown) {
    expect(error).toMatchObject({
      code: '23503',
      constraint,
    });
  }
}
