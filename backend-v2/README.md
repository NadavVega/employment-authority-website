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

The API uses:

- `GET /api/v1/health` for liveness
- `GET /api/v1/health/ready` for PostgreSQL readiness

## Development commands

```bash
npm run lint
npm run build
npm test
npm run test:integration
npm run db:generate
npm run db:check
npm run db:migrate
```

`test:integration` requires `TEST_DATABASE_URL` pointing to a clean,
disposable PostgreSQL database. It applies every migration and verifies the
approved table, index, constraint, and foreign-key catalog.

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
