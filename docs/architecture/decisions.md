# Backend V2 architecture decisions

This document records decisions made for the migration design. “Confirmed”
means supplied as a target requirement or required by verified review findings.
“Recommended” is the design baseline unless superseded by an explicit product,
security, or implementation decision. Unresolved items are labeled
**OPEN DECISION**.

## Confirmed target constraints

- Keep the existing React + Vite frontend.
- Build a NestJS + TypeScript REST API.
- Use NestJS's default Express adapter.
- Use PostgreSQL.
- Use Drizzle ORM and Drizzle Kit migrations.
- Use Better Auth as the eventual authentication/session system.
- Use S3-compatible object storage, initially Cloudflare R2.
- Host frontend, API, and PostgreSQL separately; Render is currently preferred.
- Migrate incrementally and keep the current application usable.
- Never trust frontend guards as authorization.
- Do not remove or rewrite Firebase until each replacement is proven.

## ADR-001 — PostgreSQL instead of Firestore

**Status:** Confirmed

**Decision:** PostgreSQL becomes the Backend V2 application system of record.

**Why:**

- The product has strongly relational concepts: users, employers, contacts,
  centers, assignments, privacy approvals/grants, event registrations,
  payments, and moderation history.
- Foreign keys, uniqueness, checks, composite relationships, and transactions
  prevent structural states currently encoded as duplicated email/string/UID
  fields.
- SQL aggregation replaces client collection scans and N+1 registration reads.
- Purpose-specific API responses prevent exposing an entire `users` document.
- Server-side policies and a relational test database make authorization and
  workflows easier to test.

**Consequences:**

- Schema/migration discipline and PostgreSQL operations become required.
- Firestore realtime behavior is not copied automatically; each live update
  must justify polling, cache revalidation, SSE, or another scoped mechanism.
- Live data needs an idempotent domain-by-domain migration.

## ADR-002 — NestJS modular monolith

**Status:** Confirmed

**Decision:** Implement one NestJS REST API, using the default Express adapter,
organized into domain modules.

**Why:**

- Controllers, validation, guards, DI, exception filters, modules, and testing
  support provide a clear trusted backend boundary.
- A modular monolith is enough for realistic product scale and team size.
- Express has broad middleware/provider compatibility, including the selected
  auth/payment/storage ecosystem.
- Domain modules can own business workflows without premature network
  boundaries.

**Consequences:**

- Avoid microservices, CQRS buses, generic repositories, and interface/factory
  layers unless demonstrated needs arise.
- Cross-domain transactions stay in the initiating domain service.

## ADR-003 — Drizzle ORM and Drizzle Kit

**Status:** Confirmed

**Decision:** Use Drizzle as a typed SQL/query/migration layer, not as a domain
abstraction.

**Why:**

- It keeps PostgreSQL schema and SQL behavior visible.
- It supports PostgreSQL enums, checks, indexes, composite foreign keys,
  transactions, and generated SQL migrations.
- It adds TypeScript safety without hiding query shape behind a heavy ORM.

**Consequences:**

- Production changes use reviewed `drizzle-kit generate` and
  `drizzle-kit migrate`; `push` is local-only.
- Extensions, comments, grants, `citext`, and some partial/composite details may
  need reviewed custom SQL migrations.
- Do not add a repository wrapper that only mirrors Drizzle methods.

## ADR-004 — Better Auth owns authentication; the project owns authorization

**Status:** Confirmed target, recommended boundary

**Decision:** Better Auth owns login identity, accounts, verification, and
sessions. The project owns `application_users`, profiles, roles, centers,
employer relationships, and authorization policies.

**Why:**

- Authentication-provider schema changes should not control the domain model.
- One application UUID can survive Firebase -> Better Auth migration.
- Roles and center/assignment/grant checks are product data, not login claims.
- Better Auth can generate its exact schema for the pinned version/plugin set.

**Consequences:**

- `auth_identities` maps provider subject IDs to `application_users`.
- Better Auth tables are deliberately absent from `database/schema.sql`.
- The API loads current domain relationships after session verification.
- Firebase Auth temporarily remains as an authenticator during data/API
  migration.

## ADR-005 — Explicit server-side authorization policies

**Status:** Required by findings

**Decision:** Each sensitive domain has a named NestJS policy evaluated against
the authenticated principal and current PostgreSQL rows.

**Why:**

- Current role checks are split across React, rules, services, and functions.
- Role alone cannot express center, ownership, assignment, participant, or
  consent boundaries.
- Policies are directly unit/integration testable.

**Consequences:**

- Controllers may perform broad role eligibility, but domain services call the
  policy after loading authoritative state and before mutation/read.
- Response mappers return only operation-specific fields.
- PostgreSQL enforces structure; NestJS enforces caller-dependent business
  authorization.

## ADR-006 — Normalize organization, identity, center, and assignment

**Status:** Recommended

**Decision:** Separate application users, user profiles, employer organizations,
employer contacts, coordinators, centers, employer-center relationships, and
coordinator assignments.

**Why:**

- A contact/directory row may exist without an auth account.
- Email is mutable and should not be a primary key.
- Company and center strings cannot provide consistent authorization.
- Temporal assignments and relationships need revocation/history.

**Consequences:**

- Migration must resolve/flag duplicate organizations and identity collisions.
- Existing free-form center values require a canonical alias dictionary.
- A coordinator relationship is center-specific and historical. One
  application user may have multiple inactive coordinator rows over time, but
  at most one active coordinator row.
- Backend V2 initially permits one active center relationship per employer.
  Simultaneous primary/secondary employer-center relationships are deferred.
- CRM/contact activity is append-only when reliable. Ambiguous legacy
  `contactHistory` is archived as migration evidence rather than collapsed into
  a mutable latest-note field.

## ADR-007 — Privacy access is explicit, expiring, and revocable

**Status:** Required by findings

**Decision:** Use request, decision, and grant tables. The baseline grant has
one meaning—access to one employer's private contact block—and records a
validity interval, status, source request, and revocation/expiration evidence.

**Why:**

- Current grants have no expiry, revocation, or deletion.
- Decisions and current access are different facts.
- Assignment changes must be able to revoke access immediately.

**Consequences:**

- Policy checks current time as well as persisted status.
- Expiry jobs improve state hygiene but are not the security boundary.
- Grant creation is atomic with final approval.
- Expiry and automated lifecycle revocation record a stable system actor.
- Private-data access audits record the authorization basis without copying
  private values into the audit payload.

## ADR-008 — Event archive is orthogonal to publication

**Status:** Recommended

**Decision:** `publication_status` expresses moderation/publication.
`archived_at` expresses archive visibility independently.

**Why:**

- Treating `archived` as another publication status requires a fragile
  `previousStatus` and permits inconsistent restoration.
- Restoring an archive should not publish or change moderation state.

**Consequences:**

- Archive/restore only sets/clears archive fields.
- Publication changes use explicit transition endpoints/history.

## ADR-009 — Registrations and payments are server-owned transitions

**Status:** Required by findings

**Decision:** An event registration belongs to an employer organization. Each
row is one durable registration cycle for `(event, employer)` and records the
authenticated employer contact/user that submitted it. Lifecycle transitions
update that cycle's status/timestamps, but a later registration never reuses
the row. At most one
non-terminal cycle is active for an event/employer pair. A later registration
after cancellation, payment-hold expiry, or completed refund creates a new
cycle instead of overwriting the prior cycle. Payment records and attempts are
separate. Only trusted server logic confirms payment and registration.

**Why:**

- Current client-influenced status can bypass trusted confirmation.
- Event UID arrays expose identities and duplicate subcollection state.
- A user ID is neither an employer organization nor proof of an active
  employer-contact relationship.
- PostgreSQL partial uniqueness, event row locks, expiring capacity holds, and
  idempotency handle concurrency.

**Consequences:**

- Free registration confirms transactionally.
- Paid registration remains pending and consumes capacity only while its
  server-created hold is unexpired. A signed webhook or audited manual
  reconciliation may confirm it.
- Expired holds never become confirmed merely because a late webhook arrives;
  the payment is refunded or sent to manual reconciliation.
- Failed/cancelled payments release the hold. Re-registration creates a new
  cycle only after the previous cycle is terminal and any required refund is
  resolved.
- Event counts are SQL aggregates, not stored UID arrays.
- Historical legacy payment claims are represented as verified,
  legacy-unverified, missing-evidence, or manually reconciled. A Firestore
  `registered` value alone never becomes verified payment evidence.

## ADR-010 — Object storage instead of database/base64 media

**Status:** Confirmed

**Decision:** Store media bytes in R2/S3-compatible storage and metadata/object
references in PostgreSQL.

**Why:**

- Base64 inflates database/document size, transfer, backups, and memory.
- Object storage supports direct upload, cache headers, lifecycle, and media
  delivery.
- Random object keys and presigned operations keep storage credentials off the
  browser.

**Consequences:**

- API creates upload intent and verifies completion.
- Browser uploads directly with short-lived presigned URLs.
- Base64 legacy images are decoded, hashed, uploaded, and referenced during
  migration.

## ADR-011 — Incremental migration instead of big-bang replacement

**Status:** Confirmed

**Decision:** Migrate one domain at a time behind explicit source adapters and
feature flags.

**Why:**

- Authentication, directory, privacy, events, payments, notifications, content,
  and analytics cannot safely change simultaneously.
- Role-based product flows must remain usable.
- Per-domain reconciliation and rollback are tractable.

**Consequences:**

- One authoritative writer per domain.
- No automatic per-request fallback and no browser dual-write.
- Firebase Auth stays temporarily so API/data changes can land first.
- Firebase is removed only after every dependency exits.

## ADR-012 — Live SQL first; precompute only measured analytics

**Status:** Recommended

**Decision:** Replace client scans with indexed aggregate endpoints. Start with
live SQL and add cached/materialized aggregates only when query evidence
requires them.

**Why:**

- Current statistics issue is query placement/N+1, not proven need for a data
  warehouse.
- PostgreSQL can handle realistic grouped counts with correct indexes.

**Consequences:**

- Metric definitions and query plans are reviewed.
- Redis/read replicas/warehouse are not initial dependencies.
- Initial `participation` means confirmed registration, not physical
  attendance.
- Center reporting uses the event's historical center. Event center becomes
  immutable once the event is submitted.
- Pending-payment holds are reported separately from confirmed registrations;
  unexpired holds consume capacity but are not participation.
- Cancellations and refunds follow versioned metric definitions, and all date
  boundaries declare a timezone. The initial server-configured reporting
  timezone is `Asia/Jerusalem`, and responses echo the timezone used.

## ADR-013 — Principal resolution requires active application relationships

**Status:** Required by findings

**Decision:** A valid provider session/token is necessary but not sufficient.
`AuthService` resolves only a non-retired provider identity for an active
application user. It includes only active role grants and, for scoped roles,
active coordinator/employer-contact relationships whose related center or
employer is active.

**Why:**

- Provider sessions can outlive role, contact, center, assignment, or
  application-user changes.
- Separately stored role and domain rows can otherwise drift into an
  authorization escalation.

**Consequences:**

- Suspension or identity retirement is enforced on every request even before a
  provider session is physically revoked.
- Role/domain relationship changes are one trusted transaction with assignment,
  privacy-request, grant, and session side effects.
- Historical rows remain for evidence but are never included in a current
  principal.

## ADR-014 — Migration lineage separates identity from run evidence

**Status:** Required by migration design

**Decision:** Canonical source-to-target mappings and per-run transformation
evidence are separate records. Canonical mapping identity includes source
system, source path, target table, and target primary key. Per-run items record
mapped, unchanged, quarantined, conflicting, rejected, or intentionally
archived outcomes.

**Why:**

- One Firebase document can create multiple target rows.
- Repeated snapshot/delta runs must retain evidence without inventing a new
  canonical identity.
- Ambiguous identity, ownership, status, or payment evidence must be reportable
  without creating a guessed target relationship.

**Consequences:**

- A run can link many evidence items to existing canonical mappings.
- Quarantined/conflicting source items have run evidence but no canonical
  target mapping.
- Reconciliation queries are keyed by migration run.

## ADR-015 — Admin role does not imply private-contact access

**Status:** Required privacy baseline

**Decision:** Admin role alone cannot read or update employer private contact
data. Employer self-access, active assignment, or an active unexpired privacy
grant are the only baseline authorization bases.

**Consequences:**

- There is no admin private-data endpoint bypass.
- Future break-glass access requires a separate explicit permission/design,
  mandatory reason, actor, timestamp, authorization basis, and privileged audit
  record.
- Break-glass access is not implemented in the initial Backend V2.

## ADR-016 — Material published-event edits return to moderation

**Status:** Required moderation baseline

**Decision:** A coordinator edit to a published event's public-facing content
atomically updates the row and transitions `published -> pending_approval`.
Material fields initially include title, description, type/audience,
date/time, location/online/external URLs, accessibility/public contact details,
capacity, payment configuration, center, and media. Event center is immutable
after first submission.

**Consequences:**

- Unreviewed coordinator content is never left published.
- Publication history and audit are written in the same transaction.
- Only internal audit metadata or explicit admin-only operational changes may
  avoid remoderation.

## Assumptions used in the design

- One active coordinator assignment per employer matches current product
  behavior.
- Only admin assigns an existing employer. A coordinator may receive an atomic
  assignment only as part of creating a genuinely new employer.
- One active center relationship per employer is the Backend V2 initial model;
  simultaneous multi-center employers are deferred.
- One application user may have historical coordinator rows but only one active
  coordinator relationship.
- One active employer-contact organization per authenticated employer user
  matches the current role model.
- An unassigned employer can complete privacy approval without coordinator
  approval, matching documented intended behavior.
- Event registration belongs to the employer organization and permits at most
  one active cycle per event/employer pair.
- Re-registration creates a new cycle only after the prior cycle is terminal
  and required refund handling is complete.
- Admin is the moderation authority for coordinator events and content.
- Coordinator-authored and scraped articles require admin review; admins may
  create and separately publish content.
- Admin role alone does not grant access to employer private contact data.
- Cross-center private-data access requires an active, unexpired privacy grant;
  it is not implied by coordinator role.
- Physical attendance/check-in is outside the initial Backend V2 scope.
- PostgreSQL 14+ features/extensions used by the schema are available in the
  selected environment.

If an assumption is rejected, update the SQL, policies, API, and migration
mapping together before implementation.

## Open decisions

### OPEN DECISION — Employer/contact deduplication and ownership

Define what constitutes one employer organization, how duplicate company names
and registration numbers merge, and who becomes the primary/manageable
contact. The initial authorization model still permits only one active employer
organization per authenticated employer user.

### OPEN DECISION — Event archive eligibility and retention

Can only ended/cancelled events be archived? Can published future events be
hidden by archive? Define restore and long-term deletion policy.

### OPEN DECISION — Payment product/provider

Select provider(s), checkout mode, fee/currency rules, webhook behavior,
refund/cancellation policy, reconciliation authority, receipt requirements,
financial retention, and PCI/legal responsibilities. `external_link`/Bit may
not provide trusted automated confirmation without a provider callback.

### OPEN DECISION — Privacy duration and retention

Set request/grant expiry defaults, renewal windows, notification schedule, and
retention of rejected/expired requests. Access is already denied at wall-clock
expiry; the job records the persisted `expired` transition.

### OPEN DECISION — Private-field application encryption

Decide before private-data cutover whether database/storage encryption at rest
is sufficient or selected employer private fields also require
application-level envelope encryption. If selected, define key custody,
rotation, lookup/deduplication behavior, recovery, and audit requirements.

### OPEN DECISION — Better Auth login methods

Choose email/password vs magic link/SSO, invitation flow, email provider,
verified-email requirements, MFA/admin MFA, session duration, account recovery,
and linking support. Also choose/pin the community NestJS adapter versus a
small direct Express integration after a spike.

### OPEN DECISION — Cookie/domain topology

Confirm production custom domains for frontend/API so Better Auth cookie,
SameSite, CORS, CSRF, and trusted-origin settings can be finalized.

### OPEN DECISION — R2 visibility and media processing

Which assets are public, which require signed GET, allowed MIME/size/dimensions,
responsive variants, malware scanning, moderation, copyright retention, and
orphan/deletion windows?

### OPEN DECISION — Retention, RPO/RTO, and hosting tier

Approve retention periods for private data, notifications, audit logs, webhook
payloads, deleted media, and backups. Select Render region/plan, connection
limits, PITR window, RPO/RTO, and restore-test frequency.

### OPEN DECISION — Cutover rollback window

Approve per-domain maintenance windows, soak duration, and whether a temporary
trusted server dual-write/reverse-sync is worth its operational complexity.

## Biggest migration risks

| Risk | Impact | Primary mitigation |
|---|---|---|
| Firebase UID/email and employer/company deduplication is ambiguous | Wrong account, ownership, or private-data linkage | Immutable export, deterministic mapping, conflict quarantine, manual owner approval |
| Checked-in Firebase configuration differs from production | Missing collections/functions/rules during planning | Read-only live inventory and deployed-config comparison before any import |
| Authorization differs during partial migration | Cross-center/private-data disclosure or unexpected denial | One principal model, explicit policies, response DTOs, negative API/E2E matrix, one writer per domain |
| Legacy event/article/privacy statuses are ambiguous | Incorrect publication/access state | Explicit mapping table, never default unknown to permissive, manual disposition |
| Rollback after PostgreSQL receives new writes | Divergent systems and lost updates | Per-domain write pause/final sync, bounded rollback window, tested server reverse-sync where needed |
| Payment cutover handles real money | False confirmation, duplicate charge, unsafe rollback | Provider idempotency, signed webhook deduplication, audit, reconciliation, no UI-confirmed success |
| Better Auth linking/provisioning fails | Users cannot sign in or gain correct profile/center | Keep application UUIDs, staged invitations/linking, support runbook, role-based E2E |
| Base64/external media extraction is incomplete | Broken events/content or oversized database rows | Hash/upload/HEAD verification, source manifest, fallback display during staged cutover |
| No existing durable test baseline | Behavior regressions are discovered late | Build policy/API/PostgreSQL/Playwright safety net before first domain write cutover |
| Operational tier/backup assumptions are wrong | Connection exhaustion or unacceptable recovery | Capacity/pool budget, Render plan decision, restore drill, RPO/RTO sign-off |
