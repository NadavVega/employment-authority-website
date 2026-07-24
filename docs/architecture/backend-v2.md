# Employment Authority Backend V2

Status: canonical target architecture
Related: [database design](database-design.md), [API design](api-design.md),
[Firebase migration](firebase-migration-plan.md), and
[architecture decisions](decisions.md)

## 1. Recommended target architecture

Backend V2 is a modular monolith:

```text
React/Vite browser
    |
    | HTTPS REST / session cookie or transition bearer token
    v
NestJS API (default Express adapter)
    |
    | Controller -> Service -> Policy -> Drizzle transaction/query
    v
PostgreSQL

NestJS API -> S3-compatible object storage (Cloudflare R2 initially)
NestJS API -> payment provider / email provider / external scraper sources
```

The existing React application remains. Product domains move from Firebase to
the REST API one at a time. `backend/functions` and Firestore remain available
until their individual replacements have cut over and passed a rollback/soak
period.

This is one API deployment and one relational database, not microservices.
Modules establish code ownership and policy boundaries without introducing
network boundaries.

## 2. Responsibility boundaries

### Frontend responsibilities

- Render role-appropriate UI and route users to valid workflows.
- Collect input and perform convenience validation.
- Call typed domain API clients.
- Hold local UI state and bounded server-state caches.
- Upload an approved object directly to a presigned R2 URL.
- Display API errors without exposing server internals.

The frontend is not trusted to choose its role, center, employer identity,
assignment, notification recipient, moderation result, payment result, or
privacy grant.

### Trusted backend responsibilities

- Resolve authentication into one `ApplicationPrincipal`.
- Validate all external input.
- Load authoritative resource and relationship state.
- Apply role, center, ownership, assignment, consent/grant, and workflow
  policies.
- Execute state transitions and audit writes transactionally.
- Select notification recipients.
- Verify payment webhooks and object uploads.
- Return purpose-specific response DTOs; never return raw database rows.

### PostgreSQL responsibilities

- Primary/foreign-key integrity and deletion behavior.
- Structural uniqueness, including duplicate registration prevention.
- Valid time ranges, non-negative values, and state field consistency.
- Same-center structural relationships where composite foreign keys can prove
  them.
- Efficient indexed access paths.
- Durable current state, history, idempotency, migration mapping, and audit
  evidence.

PostgreSQL does not pretend to prove dynamic business authorization such as
“the current caller is the employer owner.” NestJS policies prove that using
the authenticated principal and current rows.

### Drizzle responsibilities

- Typed representation of the project-owned PostgreSQL schema.
- Explicit SQL queries and transactions.
- Drizzle Kit generated, reviewed, forward migrations.
- No generic repository layer over Drizzle.

## 3. NestJS module layout

| Module | Ownership |
|---|---|
| `auth` | Better Auth integration, Firebase transition verifier, principal resolution |
| `users` | Application users, profiles, role grants, `/me` |
| `centers` | Center reference data and center membership boundaries |
| `employers` | Employer public data, contacts, CRM data, center relationships, assignments |
| `privacy` | Requests, decisions, grants, revocation, expiry |
| `events` | Event lifecycle, moderation, archive, media links |
| `registrations` | Eligibility, capacity, registration/cancellation |
| `payments` | Checkout, attempts, signed webhooks, refunds/reconciliation |
| `notifications` | Recipient-safe creation, inbox, read/dismiss |
| `content` | Articles, promotional content, sources, scraper runs, moderation |
| `analytics` | Role-scoped aggregate queries and exports |
| `media` | Upload intent, presigning, verification, metadata, cleanup |
| `audit` | Append-only audit writer and admin query surface |
| `database` | PostgreSQL pool, Drizzle instance, migrations/transaction support |
| `health` | Liveness, readiness, build/version metadata |

Cross-domain writes remain owned by the initiating service. For example,
`PrivacyService.approve()` writes the decision, grant, audit row, and
notification in one transaction. It does not expose four unrelated CRUD calls
to the controller.

## 4. Request flow and code structure

```text
Controller
  -> DTO validation / authentication guard
  -> Domain service
      -> load authoritative rows
      -> Policy.require(operation, principal, resource)
      -> Drizzle query or transaction
      -> audit + server-selected notifications
  -> response mapper
```

Controllers translate HTTP into application operations. They do not contain
SQL, role matrices, or state machines.

Services coordinate business operations and transactions. Small private query
helpers are acceptable. Do not create repositories, factories, interfaces, or
command buses unless an observed testing/ownership problem justifies them.

Policies are explicit classes or cohesive functions named after domains:

- `EmployerPolicy`
- `EventPolicy`
- `PrivacyPolicy`
- `RegistrationPolicy`
- `NotificationPolicy`
- `ContentPolicy`
- `AnalyticsPolicy`
- `MediaPolicy`

Policies return/throw a decision; they do not mutate data. A policy receives an
already authenticated principal plus the minimal loaded resource/relationship
facts it needs.

## 5. Authentication architecture

### Domain separation

Authentication identity answers “who authenticated?” Application/domain
identity answers “which user, roles, center, coordinator, and employer
relationships are active?”

Better Auth will own authentication records and sessions. Backend V2 owns:

- `application_users`
- `auth_identities`
- `user_profiles`
- `user_roles`
- coordinator and employer-contact relationships

After session verification, `AuthService` resolves Better Auth's user ID through
`auth_identities` and builds:

```ts
type ApplicationPrincipal = {
  applicationUserId: string;
  authProvider: 'firebase' | 'better_auth';
  authSubject: string;
  roles: Array<'admin' | 'coordinator' | 'employer'>;
  coordinator?: { id: string; centerId: string };
  employerContacts: Array<{
    contactId: string;
    employerId: string;
    canManageEmployer: boolean;
  }>;
};
```

The API ignores role, center, employer ID, and user ID claims supplied in a
request body.

### Transition phase

Firebase Auth should remain temporarily while data and API domains migrate.
For a migrated endpoint:

1. React obtains the current Firebase ID token.
2. The API verifies it server-side with Firebase Admin.
3. The Firebase UID resolves through `auth_identities`.
4. NestJS loads application roles/relationships from PostgreSQL.
5. The same policy/service code used after Better Auth executes.

This lets data/API migration happen without a simultaneous session migration.
Firebase custom claims and the Firestore user role are not the new
authorization source.

### Better Auth cutover

- Pin Better Auth and selected plugins.
- Generate its exact Drizzle schema from that version; do not hand-invent it.
- Prefer a separate authentication schema/boundary in the same PostgreSQL
  database.
- Link each Better Auth user ID to the existing `application_users` row in
  `auth_identities`.
- Preserve application UUIDs so all domain foreign keys remain unchanged.
- Support invitation/password setup or SSO linking instead of migrating
  passwords.
- Run a short dual-login acceptance period only if support requirements demand
  it; do not maintain two indefinite auth systems.

The official Better Auth NestJS integration is community-maintained and may
require Nest body-parser configuration. The first implementation PR must spike
and pin either that adapter or a small reviewed Express handler integration.
This is an implementation choice at the auth boundary, not permission to move
domain roles into Better Auth tables.

For separate frontend/API hosts, prefer subdomains of the same organizational
site and `Secure`, `HttpOnly`, appropriately scoped cookies. Configure exact
trusted origins and credentialed CORS; never use wildcard credentialed CORS.

## 6. Authorization architecture

Authentication is applied globally, with explicit anonymous routes for health,
published content/events if product-approved, Better Auth endpoints, and signed
payment webhooks. Authentication alone never grants domain access.

### Where checks occur

| Check | Location |
|---|---|
| Session/token validity | global auth guard |
| Broad role eligibility | controller metadata/guard and policy defense-in-depth |
| Center relationship | domain policy using PostgreSQL rows |
| Resource ownership | domain policy |
| Active coordinator assignment | domain policy, structurally supported by FKs/indexes |
| Employer contact ownership | domain policy |
| Consent/grant validity | `PrivacyPolicy` |
| Workflow transition | owning domain service/state machine |
| Structural integrity/uniqueness | PostgreSQL |

### `EmployerPolicy`

- Public directory: active authenticated application users receive only the
  approved public DTO, filtered/paginated by policy.
- Employer profile management: active contact with
  `can_manage_employer`, active assigned coordinator, or admin.
- CRM data: assigned coordinator within the active employer-center
  relationship, or admin with explicit permission.
- Private data: employer contact for self, active assigned coordinator, or
  active consent grant. Admin access is an open product/security decision and,
  if allowed, must be audited as a privileged access.
- Existing unassigned employer assignment: admin only by default.
- New employer creation by coordinator: may atomically create the center
  relationship and assignment to the creator if product retains that workflow.

### `EventPolicy`

- Employers see only published, non-archived, non-deleted events allowed for
  their audience.
- Coordinators see public events plus events owned by their center/identity.
- Coordinators edit only their own event and cannot publish it.
- Admins moderate/publish/reject/cancel/archive/restore.
- Center and owner are derived from the principal/server relationship, not the
  request body.

### `PrivacyPolicy`

- Only active coordinators may request access.
- Assigned coordinators already have assignment-based access and cannot request
  a grant to themselves.
- Employer decisions require an active manageable employer-contact
  relationship.
- Assigned-coordinator decisions require the captured assignment to remain
  active/current.
- Request lists are participant-scoped.
- Grants require active status, current time inside the validity interval, and
  active coordinator status.
- Assignment/center changes revoke affected grants and cancel stale pending
  requests in the same server operation.

### `RegistrationPolicy`

- Caller has an active employer contact and employer role.
- Event is published, not archived/cancelled/ended, and registration is open.
- Duplicate registration is rejected by policy and database uniqueness.
- Capacity is checked under a row lock/transaction.
- Employer cannot select another employer/user or confirm payment.
- Event owner/admin may view participant DTOs; public event DTOs never contain
  registrant identifiers.

### `NotificationPolicy`

- Recipient may list/read/dismiss only their own notifications.
- Domain services—not a generic browser endpoint—select recipients and create
  notifications.
- Admin broadcast, if later required, is a separate audited operation with
  bounded audiences.

### `ContentPolicy`

- Coordinators may create/edit their own draft and submit it.
- Coordinator and scraper submissions enter `pending_review`.
- Only admin publishes, rejects, archives, configures sources/keywords, or
  triggers a manual scrape.
- Scheduled scraper runs use a system principal and remain pending review.

## 7. Workflow state machines

All sensitive transitions are named service methods, authorized against the
current database state, written transactionally, and recorded in domain
history/audit.

### Event publication

```text
draft
  -- coordinator submit --> pending_approval
  -- admin publish -------> published

pending_approval
  -- admin publish -------> published
  -- admin reject --------> rejected

rejected
  -- owner revise --------> draft

published
  -- admin cancel --------> cancelled
```

Admins may publish an admin-created draft directly. Whether material edits to a
published event return it to approval is an open product decision; the secure
default is yes for coordinator edits.

### Event archive/restore

Archive is not a publication status.

- Admin archives an ended/cancelled event by setting archive fields.
- Admin restores by clearing archive fields.
- Publication status remains unchanged.
- Archive cannot resurrect a cancelled/rejected event or overwrite moderation
  history.

### Privacy requests and grants

```text
awaiting_employer
  -- employer rejects --------------------> rejected
  -- employer approves, no assignment ----> approved + active grant
  -- employer approves, assignment exists -> awaiting_coordinator

awaiting_coordinator
  -- assigned coordinator rejects --------> rejected
  -- assigned coordinator approves -------> approved + active grant

either pending
  -- requester/admin cancels -------------> cancelled
  -- expiry process ----------------------> expired

active grant
  -- expiry process ----------------------> expired
  -- employer/admin/assignment change ----> revoked
```

### Event registration

```text
free registration request -> confirmed
paid registration request -> pending_payment
capacity exhausted         -> waitlisted (if enabled) or conflict
pending_payment            -> confirmed only after trusted payment success
pending/confirmed/waitlist -> cancelled by eligible employer or admin
```

### Payment

```text
created -> pending|requires_action
pending|requires_action -> succeeded|failed|cancelled
succeeded -> partially_refunded -> refunded
succeeded -> refunded
```

Only signed provider webhooks or an audited admin reconciliation can record
success. Retry/idempotency keys make repeated requests/events harmless.

### Article moderation

```text
draft -> pending_review
pending_review -> published|rejected
rejected -> draft
published -> archived
archived -> published (admin restore, if product permits)
```

## 8. Object-storage architecture

Cloudflare R2 is accessed through the S3-compatible API. PostgreSQL stores only
`media_assets` metadata/object keys and domain relationships.

Upload flow:

1. Authenticated client requests `POST /api/v1/media/uploads`.
2. `MediaPolicy` validates purpose, content type, size, and owning domain.
3. API creates a random object key and pending asset row.
4. API returns a short-lived presigned PUT URL restricted to that object and
   content type.
5. Browser uploads directly to R2.
6. Browser calls completion endpoint; API performs HEAD, verifies size/type,
   checksum where available, and marks `ready`.
7. Domain service links only a ready asset.

Use separate buckets or prefixes for dev/staging/prod, exact-origin CORS,
random/non-user-controlled keys, allowlisted MIME types, image dimension/size
limits, and optional malware scanning/quarantine. Treat presigned URLs as
temporary bearer credentials and never log them.

Public site images may use a public/custom delivery domain. Private assets use
short-lived signed GETs or API authorization. Object deletion is delayed and
idempotent; abandoned pending uploads have a lifecycle cleanup job.

Migration extracts base64 event images, hashes/deduplicates them, uploads the
binary once, and replaces the Firestore field with a `media_assets` reference.

## 9. Analytics architecture

Analytics moves from client-side collection scans to role-scoped SQL endpoints.

Start with live, indexed SQL for:

- upcoming/active/finished event counts;
- registrations by month, event, center, and employer;
- current event capacity/confirmed counts;
- moderation queue counts; and
- unread notification counts.

Use a small number of grouped queries or CTEs, not one query per event.
Coordinator center scope is derived from `coordinators.center_id`.

Precompute only after measurement. Likely candidates are long-range monthly
center dashboards and expensive repeated historical exports. Options are a
materialized view refreshed by a job or an aggregate table updated
transactionally/job-based. Short API caching (for example 30–60 seconds) is
acceptable for non-sensitive dashboard aggregates only after query plans show a
need.

Every metric needs a definition: included registration statuses, event time
zone, cancellation/refund handling, center attribution date, and late data.

## 10. Validation, errors, and API versioning

- Prefix project endpoints with `/api/v1`.
- Better Auth routes remain in a clearly separate `/api/auth/*` boundary unless
  the pinned integration requires another documented prefix.
- Use Nest's global runtime validation pipeline with explicit DTOs, transform
  disabled unless deliberately configured, unknown fields rejected, and
  bounded strings/arrays.
- Validate UUID/path parameters and normalize email/URL/phone input at the API
  edge.
- Drizzle types are compile-time assistance, not input validation.
- Return a consistent Problem Details-style error body containing stable
  application code, safe message, HTTP status, field errors when relevant, and
  request ID.
- Map policy denial to 403, missing/scoped-away resources to 404 where that
  avoids disclosure, duplicate/idempotency conflicts to 409, validation to 400
  or 422, and capacity conflict to 409.
- Never expose SQL, provider, token, or internal stack details.
- Non-breaking additions remain in v1. Breaking contracts require v2 and a
  measured deprecation period.

## 11. Logging and auditing

Use structured JSON logs with request ID, route, status, latency, deployment
version, authenticated application user ID, and safe domain identifiers.

Do not log:

- passwords, tokens, cookies, authorization headers;
- private employer contact values;
- payment/webhook secrets or raw card data;
- presigned URLs; or
- full untrusted scrape payloads.

Write `audit_logs` in the same transaction as sensitive business changes.
Audit events include role grants, employer assignment, private-data read,
privacy decisions/grants/revocation, event moderation/archive, registration
admin changes, payment reconciliation/refunds, content moderation, and admin
scraper configuration.

Runtime database credentials must not have permission to update/delete audit
rows.

## 12. Testing architecture

### Unit tests

- Pure policy matrices for role/center/owner/assignment/grant combinations.
- State transition functions and validation.
- Mapping/normalization functions and status conversions.
- Payment webhook signature/result mapping with provider fixtures.

### PostgreSQL integration tests

Run against a disposable real PostgreSQL instance, not an in-memory substitute.
Apply all Drizzle migrations and test:

- foreign keys, composite center constraints, checks, and partial uniqueness;
- concurrent registration/capacity behavior;
- idempotency and webhook deduplication;
- privacy approval/grant transaction atomicity; and
- rollback behavior on mid-transaction failure.

Each test runs in an isolated database/schema or truncates only its disposable
database.

### API tests

Boot NestJS with real PostgreSQL and stubbed external providers. Exercise
authentication resolution, response field minimization, policies, workflow
errors, pagination, and audit creation.

Maintain table-driven authorization tests for every sensitive endpoint across
anonymous, employer, unrelated coordinator, assigned coordinator, other-center
coordinator, suspended user, and admin.

### Playwright E2E

Create a permanent suite with seeded, deterministic accounts:

- employer: login, directory-safe view, privacy decisions, event registration,
  reload persistence, payment pending/confirmed presentation;
- coordinator: center-scoped directory/stats, create employer, owned event
  submit/edit, privacy request/assigned review;
- admin: assignment, event/content moderation, archive/restore, scraper admin,
  analytics;
- negative direct-URL/API flows for role and cross-center denial.

Run critical smoke flows per PR and the full suite before domain cutover.

## 13. Performance and scalability

Current evidence includes an approximately 1.81 MB generated JavaScript asset,
a 2.45 MB city image, no route-level lazy imports, full collection listeners,
and sequential per-event registration reads for statistics.

Backend V2 rules:

- keyset pagination for large lists; default 25 and hard maximum 100;
- explicit response projections, never `SELECT *` into public DTOs;
- joins/batched queries instead of N+1 loops;
- database counts instead of storing registrant ID arrays/counts on events;
- bounded connection pool per API instance, sized below database limits across
  all replicas/migration jobs;
- slow-query logging and `EXPLAIN (ANALYZE, BUFFERS)` before adding indexes;
- response compression for suitable JSON;
- conditional GET/short caching for public content if measured;
- direct object-store media with responsive variants and cache headers; and
- route-level React code splitting/media optimization in focused frontend PRs,
  independent of backend migration.

Do not introduce read replicas, Redis, queues, or precomputed analytics until
measured load justifies them.

## 14. Deployment architecture

### Environments

| Environment | Frontend | API | PostgreSQL | Object storage |
|---|---|---|---|---|
| Development | local Vite | local Nest | disposable local Postgres | dev R2 prefix/bucket or local S3-compatible emulator |
| Staging | Render static site | Render web service | separate Render Postgres | staging R2 bucket |
| Production | Render static site | Render web service | production Render Postgres | production R2 bucket |

The API and PostgreSQL should be in the same Render region/workspace and use the
private/internal database URL. The static site reaches the public HTTPS API.
Production data, secrets, buckets, and Better Auth tables are never shared with
staging.

### Environment variables

Frontend contains only public configuration, chiefly `VITE_API_BASE_URL` and
explicit feature/source flags.

API secrets/config include:

- `NODE_ENV`, `PORT`, `APP_ORIGIN`, `API_ORIGIN`, `TRUSTED_ORIGINS`;
- `DATABASE_URL`, pool size, statement/transaction timeouts;
- Better Auth secret/base URL and provider/email settings;
- temporary Firebase project/service credentials during the bridge;
- R2 endpoint, region, bucket, access key, secret key, public delivery base;
- payment provider keys and webhook secret;
- log level and error-reporting destination.

Secrets live in Render environment groups/secret storage and are rotated. They
are never placed in Vite variables or source control.

### Migrations and rollout

- Generate reviewed SQL with Drizzle Kit.
- Run migrations once in a release/pre-deploy job, never independently in every
  API replica.
- Use expand -> backfill -> switch -> contract for breaking changes.
- Keep at least one application release backward-compatible with the current
  schema.
- Take/verify a database backup before risky migrations.
- Application rollback uses the previous immutable build only while database
  changes remain backward-compatible; otherwise use a forward fix or tested
  restore plan.

### Backups and health

- Select a Render PostgreSQL plan with required point-in-time recovery.
- Schedule/export logical backups for longer retention and test restoration.
- Define RPO/RTO and run restore exercises.
- Enable R2 object lifecycle/versioning appropriate to retention.
- `/health/live` proves process/event-loop health.
- `/health/ready` performs a short-timeout database query and reports migration
  compatibility; do not make a transient third-party media/payment outage
  automatically kill a healthy API.
- Expose build commit/version in health metadata without secrets.

## 15. Target repository structure

```text
/
├── frontend/                       # Existing React/Vite application
│   └── src/
│       └── services/
│           ├── firebase/           # Retained only during migration
│           └── api/                # Domain REST clients/adapters
├── backend/
│   ├── functions/                  # Existing Cloud Functions until cutover
│   └── api/                        # New NestJS modular monolith
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── common/
│       │   │   ├── auth/
│       │   │   ├── errors/
│       │   │   ├── pagination/
│       │   │   └── validation/
│       │   ├── database/
│       │   │   ├── schema/
│       │   │   ├── migrations/
│       │   │   └── database.module.ts
│       │   └── modules/
│       │       ├── auth/
│       │       ├── users/
│       │       ├── centers/
│       │       ├── employers/
│       │       ├── privacy/
│       │       ├── events/
│       │       ├── registrations/
│       │       ├── payments/
│       │       ├── notifications/
│       │       ├── content/
│       │       ├── analytics/
│       │       ├── media/
│       │       ├── audit/
│       │       └── health/
│       └── test/
│           ├── integration/
│           └── api/
├── database/
│   └── schema.sql                  # Architectural baseline
├── migrations/
│   └── firebase-to-postgres/       # Idempotent export/transform/import tools
├── e2e/
│   └── playwright/                 # Permanent role-based browser suite
└── docs/
    └── architecture/
        ├── README.md
        ├── backend-v2.md
        ├── database-design.md
        ├── api-design.md
        ├── firebase-migration-plan.md
        └── decisions.md
```

Do not move the existing React files or Firebase code merely to match this tree.
Directories appear as their migration PRs need them.

## 16. Implementation references

- [Better Auth database/schema generation](https://better-auth.com/docs/concepts/database)
- [Better Auth NestJS integration](https://better-auth.com/docs/integrations/nestjs)
- [Drizzle migration workflow](https://orm.drizzle.team/docs/migrations)
- [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [Cloudflare R2 browser CORS](https://developers.cloudflare.com/r2/buckets/cors/)
- [Render deploy/pre-deploy behavior](https://render.com/docs/deploys)
- [Render private networking](https://render.com/docs/private-network)
- [Render PostgreSQL backup/recovery](https://render.com/docs/postgresql-backups)
