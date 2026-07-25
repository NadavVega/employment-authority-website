# Backend V2 foundation

This directory contains the NestJS modular-monolith foundation for the
incremental Firebase-to-PostgreSQL migration. It currently provides
configuration, PostgreSQL/Drizzle, health, safe errors/logging, and the
temporary Firebase identity bridge. It does not expose product-domain APIs or
replace any current React, Firestore, Firebase Auth, Security Rules, or Cloud
Functions behavior.

The authoritative design remains in [`../docs/architecture`](../docs/architecture).

## Prerequisites

- Node.js 22 or newer
- npm 10 or newer
- PostgreSQL 16 (a disposable Docker container is suitable for development)
- Firebase Admin Application Default Credentials for real token verification

## Local setup

Install dependencies and create local configuration:

```bash
cd backend-v2
npm ci
cp .env.example .env
```

Start a local PostgreSQL 16 database:

```bash
docker run --name employment-backend-v2-postgres \
  --env POSTGRES_USER=postgres \
  --env POSTGRES_PASSWORD=postgres \
  --env POSTGRES_DB=employment_authority_v2 \
  --publish 5432:5432 \
  --detach postgres:16-alpine
```

Update `.env` for the local database and the correct Firebase project ID.
Firebase Admin uses Application Default Credentials. In deployments, prefer
workload credentials. For local development outside Google infrastructure,
keep any service-account file outside the repository and point
`GOOGLE_APPLICATION_CREDENTIALS` to that external file. Never commit a private
key.

Apply reviewed migrations and start the API:

```bash
npm run db:migrate
npm run dev
```

`npm run dev` uses the standard Nest CLI TypeScript watch compiler so
decorator metadata required by Nest dependency injection is preserved.

The API uses:

- `GET /api/v1/health` for liveness
- `GET /api/v1/health/ready` for PostgreSQL reachability and migration/schema
  compatibility

## Development commands

```bash
npm run lint
npm run build
npm test
npm run test:integration
npm run test:smoke
npm run test:smoke:production
npm run db:generate
npm run db:check
npm run db:migrate
npm run db:provision-runtime-role
```

`test:integration` requires `TEST_DATABASE_URL` pointing to a clean,
disposable PostgreSQL database. It applies every migration and verifies the
approved table, index, constraint, foreign-key catalog, negative principal
states, readiness states, and runtime privileges.

The integration harness rejects database names that are not explicitly marked
as test databases and always rejects production/staging-looking hosts or
database names. Loopback targets are preferred. A non-production remote test
target additionally requires
`TEST_DATABASE_DESTRUCTIVE_ACK=I_UNDERSTAND:<exact_database_name>` before any
pool is opened.

The reviewed dependency advisory status and intentionally deferred incompatible
audit suggestions are recorded in
[`DEPENDENCY_ADVISORIES.md`](DEPENDENCY_ADVISORIES.md).

Example:

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/backend_v2_test \
  npm run test:integration
```

## Migration policy

`database/schema.sql` is the approved architectural baseline. The initial
versioned migration is its reviewed executable copy. PostgreSQL extensions,
comments, role seeding, and exact constraints remain in SQL because they are
not all represented reliably by generated Drizzle TypeScript.

The Drizzle schema represents all project-owned `app` tables. `citext` uses an
explicit custom type because Drizzle Kit does not infer it automatically.
Future changes use:

```bash
npm run db:generate
```

Review generated SQL before committing it. Use `db:migrate` for versioned
migrations; do not use schema push as a staging or production strategy.

## Database credentials and privileges

Production and staging use separate database concerns:

- `MIGRATION_DATABASE_URL` is the owner/migration credential used only by
  release migration and privilege-provisioning jobs.
- `DATABASE_URL` is the API runtime credential. It must not own the `app`
  schema/tables or have superuser, role-management, database-creation, or
  bypass-RLS capabilities.

`NODE_ENV=production` requires `MIGRATION_DATABASE_URL` and
`DATABASE_SSL=verify-full` before the migration pool can be created. The
runtime uses the same verified-TLS requirement.

Create the runtime role through the deployment platform or an administrator
without hardcoding a password in this repository. Then run, as the migration
owner:

```bash
DATABASE_RUNTIME_ROLE=backend_v2_runtime npm run db:provision-runtime-role
```

Run provisioning after every schema migration so grants for new objects are
reviewed instead of being inherited broadly. The provisioning command grants
runtime DML, denies application-schema DDL, removes runtime access to migration
evidence, grants read-only access to the Drizzle migration version required by
readiness, and denies `UPDATE`, `DELETE`, and `TRUNCATE` on `audit_logs` and
the approved append-only interaction/status-history tables.

Runtime pool defaults apply a 15-second statement timeout and a 30-second idle
transaction timeout; both are configurable. Idle pool errors are logged using
only a safe error type. Readiness runs in a short transaction and destroys the
checked client if rollback/cleanup cannot be proven.

## Temporary Firebase identity bridge

Protected routes use this flow:

```text
Firebase bearer token
  -> Firebase Admin signature/claim verification
  -> active app.auth_identities mapping
  -> active app.application_users row
  -> active roles and required coordinator/employer relationship
  -> ApplicationPrincipal
```

The bridge does not trust Firebase custom claims or request-supplied roles and
does not auto-create users. A valid Firebase token with no active application
mapping is denied.
