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

## ADR-007 — Privacy access is explicit, expiring, and revocable

**Status:** Required by findings

**Decision:** Use request, decision, and grant tables. An active grant has a
scope, validity interval, status, source request, and revocation evidence.

**Why:**

- Current grants have no expiry, revocation, or deletion.
- Decisions and current access are different facts.
- Assignment changes must be able to revoke access immediately.

**Consequences:**

- Policy checks current time as well as persisted status.
- Expiry jobs improve state hygiene but are not the security boundary.
- Grant creation is atomic with final approval.

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

**Decision:** Store one registration row per event/user. Payment records and
attempts are separate. Only trusted server logic confirms payment and
registration.

**Why:**

- Current client-influenced status can bypass trusted confirmation.
- Event UID arrays expose identities and duplicate subcollection state.
- PostgreSQL uniqueness, row locks, and idempotency handle concurrency.

**Consequences:**

- Free registration confirms transactionally.
- Paid registration remains pending until a signed webhook/admin
  reconciliation succeeds.
- Event counts are SQL aggregates, not stored UID arrays.

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

## Assumptions used in the design

- One active coordinator assignment per employer matches current product
  behavior.
- One active primary center relationship per employer is the initial model.
- One active employer-contact organization per authenticated employer user
  matches the current role model.
- An unassigned employer can complete privacy approval without coordinator
  approval, matching documented intended behavior.
- Event registration uniqueness is per event/user, not per entire company.
- Admin is the moderation authority for coordinator events and content.
- PostgreSQL 14+ features/extensions used by the schema are available in the
  selected environment.

If an assumption is rejected, update the SQL, policies, API, and migration
mapping together before implementation.

## Open decisions

### OPEN DECISION — Admin access to employer private data

Should admin have routine private-data access, a separate permission, a
break-glass workflow with reason, or no access? Recommendation: no role-only
blanket access; require explicit privileged permission/reason and audit if
operationally necessary.

### OPEN DECISION — Center cardinality and cross-center behavior

Can a coordinator belong to multiple centers? Can an employer have multiple
simultaneous center relationships? May a coordinator request privacy access
across centers? The schema supports secondary employer-center relationships but
uses one coordinator center and one primary employer center initially.

### OPEN DECISION — Assignment authority

Recommendation: only admin assigns an existing unassigned employer; a
coordinator may be atomically assigned only to an employer they create. Decide
whether an assignment-request/approval workflow is required.

### OPEN DECISION — Employer/contact deduplication and ownership

Define what constitutes one employer organization, how duplicate company names
and registration numbers merge, whether one user may represent multiple
employers, and who becomes the primary/manageable contact.

### OPEN DECISION — Registration uniqueness

Is registration per authenticated contact (recommended current-compatible
model), per employer organization, or does an employer submit multiple
attendees? This changes uniqueness and participant tables.

### OPEN DECISION — Event moderation after edits

Must material coordinator edits to an already published event return to
`pending_approval`? Recommendation: yes for title/time/location/payment/content;
define which minor fields can remain published.

### OPEN DECISION — Event archive eligibility and retention

Can only ended/cancelled events be archived? Can published future events be
hidden by archive? Define restore and long-term deletion policy.

### OPEN DECISION — Payment product/provider

Select provider(s), checkout mode, fee/currency rules, webhook behavior,
refund/cancellation policy, reconciliation authority, receipt requirements,
financial retention, and PCI/legal responsibilities. `external_link`/Bit may
not provide trusted automated confirmation without a provider callback.

### OPEN DECISION — Privacy duration, revocation, and retention

Set request/grant expiry defaults, employer self-revocation behavior,
assignment-change behavior, notification schedule, renewal, and retention of
rejected/expired requests.

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

### OPEN DECISION — Content permissions

Should coordinator-authored articles always require admin review
(recommended), can admins publish directly, and can coordinators edit rejected
or published items?

### OPEN DECISION — Analytics definitions

Approve metric definitions for active/finished events, registrations vs
participants, pending/cancelled/refunded payments, center attribution, date
timezone, and historical reassignment.

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
