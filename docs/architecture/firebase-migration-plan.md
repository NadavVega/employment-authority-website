# Incremental Firebase to Backend V2 migration plan

Status: canonical migration blueprint
Target: [Backend V2](backend-v2.md) and
[PostgreSQL design](database-design.md)

## 1. Current architecture map

This map describes repository code inspected for this review. It does not claim
that the checked-in rules/functions exactly match the currently deployed
Firebase project or that every production-only collection is represented.
A read-only production inventory/export is required before migration.

### Runtime topology

```text
React/Vite
  ├─ Firebase Auth email/password
  ├─ Firestore client SDK (services plus direct page/component queries)
  ├─ Firestore realtime listeners
  ├─ Firebase Storage initialized (upload imports currently unused)
  └─ Firebase callable Functions client initialized

Firestore Security Rules
  └─ authorization based on Firebase auth email/UID plus users/{email}

Cloud Functions (TypeScript)
  ├─ scheduled content scraper
  └─ authenticated callable scraper trigger

Firebase Hosting configuration
```

Important repository entry points:

- [`frontend/src/services/firebase/config.js`](../../frontend/src/services/firebase/config.js)
- [`frontend/src/services/firebase/auth-service.js`](../../frontend/src/services/firebase/auth-service.js)
- [`frontend/src/context/auth-context.tsx`](../../frontend/src/context/auth-context.tsx)
- [`firestore.rules`](../../firestore.rules)
- [`firestore.indexes.json`](../../firestore.indexes.json)
- [`backend/functions/src/index.ts`](../../backend/functions/src/index.ts)
- [`firebase.json`](../../firebase.json)

### Firebase Authentication usage

1. The browser signs in with Firebase email/password.
2. `onAuthStateChanged` supplies a Firebase User.
3. The application reads `users/{normalizedEmail}` and checks whitelist and
   role fields.
4. `AuthContext` stores the Firebase User plus a separately derived role.
5. Firestore rules repeat the user-document lookup and role/whitelist checks.

Roles in active code/rules are `admin`, `coordinator`, and `employer`; the
frontend also has a `guest`/demo concept.

Identity is split incorrectly:

- Firebase Auth is keyed by UID.
- the application `users` document is keyed by email;
- profiles/role/center fields are nested or duplicated; and
- employer directory records may exist without a Firebase Auth account.

`AuthContext` retains the Firebase User rather than a normalized merged
application profile. That explains center-dependent failures such as
coordinator statistics not reliably finding a center.

There is no complete account-provisioning flow for imported/new employer
contacts. Development demo-role and bypass behavior also exists and must not
become part of Backend V2 production authentication.

### Firestore collections and subcollections

| Firestore path | Current purpose | Important relationships/problems |
|---|---|---|
| `users/{email}` | whitelist, role, auth metadata, directory profile, employer CRM, assignment | email is identity; root/profile/contactHistory field variants; all application users can list shared documents under checked-in rules |
| `users/{email}/private_info/details` | private employer email/phone/mobile | access depends on assignment or grant; public user document still exposes email/CRM/assignment fields |
| `users/{email}/private_access/{requesterEmail}` | materialized privacy grant | points to `privacy_requests`; no delete, revocation, or expiry |
| `events/{eventId}` | event, owner fields, payment configuration, status, registration count/UID list, media/base64 | multiple legacy owner/status fields; registrant UID duplication/exposure |
| `events/{eventId}/registrations/{firebaseUid}` | registration snapshot | denormalized employer fields; client-influenced status/payment |
| `privacy_requests/{requestId}` | two-stage approval | denormalized emails/names/assignment; browser writes workflow and grant batch |
| `notifications/{notificationId}` | in-app notification | addressed by email; browser can create selected workflow notification types |
| `articles/{articleId}` | scraped/manual article and moderation | coordinator create rule does not force pending status; manual coordinator UI creates approved content |
| `promotional_content/{slideId}` | role-targeted carousel content | admin-managed; active realtime feed |
| `settings/bot_config` | scraper sources and keywords | browser admin page and Admin SDK scraper |
| `links/{id}` | referenced by an unexported weekly summary function | inconsistent with active `articles` collection |
| `system_notifications/manager_summary` | target of unexported weekly summary | not covered by checked-in rules; Admin SDK function bypasses rules |

No first-class centers, employer organizations, employer contacts, payments,
payment attempts, or audit-log collections are present. Centers, employers,
owners, and assignments are strings/emails embedded in other documents.

### Current data relationships

- **Auth user -> application user:** Firebase UID plus email lookup, with no
  durable relational mapping.
- **User -> role/profile:** root and nested variants; role and whitelist are
  authorization-critical mutable document fields.
- **Employer -> coordinator:** email string at root or under profile.
- **Coordinator/employer -> center:** free-form center strings on profiles and
  events; no enforced center entity.
- **Employer -> private data:** `private_info/details` subdocument.
- **Privacy request -> grant:** grant document contains source request ID and
  duplicated email/approval fields.
- **Event -> owner:** several possible UID/email field names.
- **Event -> registrations:** subcollection plus duplicated
  `registeredCount`/`registeredUids` on the event.
- **Notification -> recipient/subject:** recipient email and optional UID plus
  string event/request ID.
- **Article -> source/media:** URL/source strings and external image URL.

### Important frontend queries

| Path | Query behavior | Cost/security consequence |
|---|---|---|
| Directory list | `users where isWhitelisted == true` | broad user documents; client mapping/filtering |
| Message recipients | full `users` collection | exposes/loads far more than recipient labels |
| Employer detail | user document, then assigned coordinator document | email-key lookup and extra read |
| Privacy history | four parallel queries over different email fields | duplicated reads and merge in browser |
| Coordinator privacy inbox | two realtime assignment-field listeners | legacy/current routing duplication |
| Home events | all events for admin/coordinator; published for employer | unbounded realtime collection, client date filter/sort |
| Events page | all events for admin/coordinator; published for employer | unbounded listener; client tabs/status filtering |
| Admin dashboard | realtime full `events` and full `users` | coordinator is admitted by component and rules |
| Articles | unbounded status queries/listeners, client-side sort/top 10 | reads all approved/pending rows |
| Notifications | recipient query ordered by time, limit 15 | appropriately bounded but realtime |
| Registered events | collection-group registration query by UID | authorization/query alignment has caused reload-state failure |
| Statistics | all/three center event queries, then one registration query per event | N+1 read pattern, sequential latency, increasing Firestore cost |

Checked-in composite indexes cover only promotional content
`isActive/order`, notifications `recipientEmail/createdAt`, and events
`status/date`. Several privacy query combinations are not represented in the
checked-in index file.

### Current authorization boundaries

1. React `ProtectedRoute` checks authentication only.
2. Pages/components perform role/ownership visibility checks, inconsistently.
3. Firestore Security Rules are the trusted database boundary for browser
   requests.
4. Cloud Functions use Admin SDK and bypass Firestore Rules, so each function
   must authorize explicitly.

Confirmed repository failures:

- Checked-in `users` rules allow any application user to list/get shared user
  documents, including fields beyond a safe public directory DTO.
- A coordinator may assign an existing unassigned employer to themself.
- The admin dashboard component admits coordinators and subscribes to all users
  and events; the matching rules allow those reads.
- Event creation requires `published`, so coordinator-created events bypass
  approval.
- Event UI/service code recognizes conflicting values including `pending`,
  `pending_approval`, `published`, `unpublished`, `archived`, `deleted`, and
  several finished aliases.
- Coordinator article creation is allowed without a status restriction, and
  the coordinator-visible form writes `approved`.
- Employers may update registration status among values including
  `registered`; payment success is not a trusted server transition.
- Published event documents include persistent `registeredUids`.
- Private grants cannot be deleted and have no expiry/revocation.
- The callable scraper checks authentication but not admin role.

Frontend guards remain useful for UX, but none of them is a Backend V2 security
boundary.

### Cloud Functions

Exported from `backend/functions/src/index.ts`:

- `scheduledScraper`: daily schedule, reads `settings/bot_config`, scrapes
  configured sources, batches into `articles` with `pending`.
- `triggerScraperBot`: callable manual trigger; any Firebase-authenticated user
  can invoke it.

Present but not exported from the function entry point:

- `weeklyContentSummary`: reads pending `links` and writes
  `system_notifications/manager_summary`. It appears inactive/dead unless
  exported elsewhere in deployed code.

Supporting tools include a local scraper test, live database audit, spreadsheet
conversion, coordinator/employer import, and employer enrichment scripts.

### Media and hosting

Firebase Storage is initialized. `event-form.jsx` imports upload APIs but the
current file path converts an image with `FileReader.readAsDataURL()` and
persists `photoPreview`/media fields, allowing large base64 strings in event
documents.

Static local assets include an approximately 2.45 MB city image. The inspected
generated Vite output contains an approximately 1.81 MB JavaScript asset and no
route-level lazy imports are present in source. These are separate focused
frontend performance concerns; the object-storage migration must avoid adding
new database/base64 media.

`firebase.json` configures Firestore rules/indexes, Functions on Node 22,
emulators for Functions, and Firebase Hosting. The hosting public path is
`./dist`, while the frontend build convention is `frontend/dist`; deployment
working-directory behavior must be verified rather than assumed.

### Testing

There is no permanent frontend unit/integration suite, Playwright suite, or
comprehensive Firestore rules test suite. The repository has a scraper test
runner and documentation templates but no meaningful automated application
coverage.

### Strong current decisions to preserve

- Keep React/Vite and the existing role-based user journeys.
- Preserve the emerging domain service boundary instead of forcing UI
  components to know the new database.
- Preserve atomic intent from the Firestore registration transaction and final
  privacy approval/grant batch, but move those operations to trusted services.
- Preserve immutable ownership/audit intent and role-specific directory/private
  views.
- Preserve bounded newest-first notification loading.
- Preserve human moderation of scraped content.

### Key architecture findings

#### [ARCH-001] Shared user document is both identity and directory

**Severity:** High
**Location:** `users` rules, auth service, directory/privacy services
**Current design:** Email-keyed documents combine whitelist, role, profile,
CRM, assignment, and public directory data.
**Problem:** Any field-level public/private distinction is difficult, and
Firestore cannot project safe subsets in rules.
**Why it matters:** It exposes sensitive relationship/auth data and prevents
stable employer/account provisioning.
**Recommended design:** Separate authentication mapping, users/profiles,
employer organizations/contacts, CRM, private information, roles, centers, and
assignments. Return purpose-specific API DTOs.
**Migration risk:** Identity/company deduplication and email/UID collisions.
**Effort:** High.

#### [ARCH-002] Coordinator assignment is an authorization escalation

**Severity:** High
**Location:** Firestore assignment rule, directory service, employer profile
**Current design:** A coordinator may set themself as owner of any unassigned
employer and immediately gain assignment-based private access.
**Problem:** The access boundary is self-service.
**Why it matters:** It can disclose private/CRM data without independent
approval.
**Recommended design:** Admin-controlled assignment of existing employers,
same-center relational constraints, history, and revocation side effects.
Atomic assignment to a newly created employer remains a separate product
operation.
**Migration risk:** Existing assignments may be ambiguous or cross-center.
**Effort:** Medium.

#### [ARCH-003] Sensitive workflows execute in the browser

**Severity:** High
**Location:** privacy, events, registrations, notifications, and article
services/pages
**Current design:** The browser assembles workflow records and transitions;
rules attempt to validate the resulting document shapes.
**Problem:** Business rules are duplicated and difficult to evolve/test across
React, services, rules, and Functions.
**Why it matters:** Moderation/payment/recipient mistakes become security
failures.
**Recommended design:** Named NestJS service operations and policies with
transactional PostgreSQL writes and audit.
**Migration risk:** Temporary behavior divergence between Firebase and API
domains.
**Effort:** High, delivered incrementally.

#### [ARCH-004] Authentication and application identity are not coherent

**Severity:** High
**Location:** Firebase Auth, `AuthContext`, `users/{email}`, import scripts
**Current design:** Firebase UID authenticates while email-keyed Firestore data
provides role/profile/center; contacts may have no auth account.
**Problem:** Center statistics and employer provisioning cannot reliably resolve
the current person.
**Why it matters:** Authorization and user experience fail on missing/stale
links.
**Recommended design:** Stable application UUID plus provider-subject mapping;
Better Auth later replaces Firebase without changing domain keys.
**Migration risk:** UID/email mismatch and duplicate emails.
**Effort:** High.

#### [ARCH-005] Workflow state vocabularies conflict

**Severity:** High
**Location:** event form/service/page/rules, articles, privacy, analytics
**Current design:** Similar meanings use `pending`, `pending_approval`,
`published`, `approved`, `unpublished`, and multiple completion/deletion
aliases.
**Problem:** Queries, moderation, archive/restore, and analytics disagree.
Coordinator event creation is forced directly to published.
**Why it matters:** Hidden, public, and historical state can become
inconsistent.
**Recommended design:** Explicit PostgreSQL enums/state transitions; archive
orthogonal to event publication; migration rejects unknown values.
**Migration risk:** Ambiguous legacy rows need manual disposition.
**Effort:** Medium.

#### [ARCH-006] Registration and payment trust are coupled to client state

**Severity:** High
**Location:** event service/page and registration rules
**Current design:** Event counts/UIDs and registration document are written
together by the browser; employer updates include registration/payment status.
**Problem:** Payment confirmation is not a trusted transition and registration
identity is exposed/duplicated.
**Why it matters:** Financial and registration/participation state can be
incorrect or manipulated. Physical attendance is not measured by the current
product.
**Recommended design:** Employer-owned registration cycles, expiring paid
capacity holds, payments/attempts/evidence classification, server event-row
locking, idempotency, and signed webhooks.
**Migration risk:** Provider selection, historical payment evidence, and
rollback after real charges.
**Effort:** High.

#### [ARCH-007] Backend jobs are inconsistent and under-authorized

**Severity:** High
**Location:** Cloud Function entry point, scraper, weekly summary
**Current design:** Manual scraper trigger requires only authentication; weekly
summary references different collections and is not exported.
**Problem:** Expensive/privileged work lacks consistent admin policy and system
of record.
**Why it matters:** Any user can trigger resource use; moderation reporting may
be dead or divergent.
**Recommended design:** Admin-only API operation, system-principal scheduled
job, explicit source/run tables, pending-review output.
**Migration risk:** Unknown deployed exports/configuration.
**Effort:** Medium.

#### [ARCH-008] Critical authorization has no durable automated suite

**Severity:** High
**Location:** repository test configuration
**Current design:** No permanent application Playwright or comprehensive rules
tests.
**Problem:** Role/assignment/grant/payment regressions are not continuously
detected.
**Why it matters:** The migration changes every trusted boundary.
**Recommended design:** policy matrix unit tests, real PostgreSQL integration
tests, API tests, and employer/coordinator/admin Playwright flows before each
cutover.
**Migration risk:** Initial fixture/test setup effort.
**Effort:** Medium.

### Performance assessment

#### [PERF-001] Statistics perform sequential N+1 Firestore reads

**Severity:** High
**Area:** Firestore/analytics
**Evidence:** Admin loads all events; coordinator may issue three center-field
event queries; `buildStatistics` then awaits one registrations collection read
for every event.
**Current behavior:** O(events + all registrations) document reads and O(events)
round trips are initiated from the browser.
**Why it scales poorly:** Cost and latency grow with history even when the UI
needs aggregates.
**Recommended change:** Role-scoped grouped PostgreSQL aggregate endpoints with
explicit metric definitions.
**Expected improvement:** A bounded number of indexed SQL queries and small
aggregate payloads.
**Complexity:** Medium after events/registrations migrate.
**How to verify:** Compare metrics/counts, query count, latency, rows read, and
`EXPLAIN (ANALYZE, BUFFERS)`.

#### [PERF-002] Core pages subscribe to broad unpaginated collections

**Severity:** High
**Area:** Firestore/network
**Evidence:** Home/events/admin dashboard listen to all role-visible events;
admin dashboard also listens to all users; articles fetch all rows for a status
then sort/slice in the client.
**Current behavior:** Initial and update cost grows with total collection size,
not visible page size.
**Why it scales poorly:** Increasing transfer, reads, memory, rerenders, and
data exposure.
**Recommended change:** Keyset-paginated API queries, server filtering/sorting,
and response projections; retain realtime only for a justified narrow feed.
**Expected improvement:** Bounded reads/payloads and less client work.
**Complexity:** Medium, per-domain.
**How to verify:** Track result rows, response bytes, subscription reads, page
load, and interaction latency at realistic seeded volumes.

#### [PERF-003] Bundle and media are oversized/eager

**Severity:** Medium
**Area:** Vite/bundle/media
**Evidence:** Inspected generated output includes an approximately 1.81 MB JS
asset and 2.45 MB city image; source has no route lazy imports; event uploads
can persist base64.
**Current behavior:** Major UI libraries/pages and large assets are eagerly
loaded; base64 inflates records.
**Why it scales poorly:** Slower startup, transfer, parse/execute, database
reads, and backups.
**Recommended change:** R2 media references, responsive/compressed assets, and
measured route-level code splitting in separate frontend PRs.
**Expected improvement:** Smaller database/API payloads and faster startup,
especially on mobile.
**Complexity:** Medium.
**How to verify:** Fresh Vite build report, compressed route chunks, image
bytes/dimensions, Core Web Vitals, and event record size.

## 2. Firebase dependency inventory

Everything below needs replacement, retirement, or explicit archival before
Firebase can be removed.

| Classification | Dependency | Replacement/exit condition |
|---|---|---|
| Authentication | Firebase client Auth initialization | Better Auth client/session |
| Authentication | email/password sign-in, sign-out, auth-state listener | Better Auth endpoints/hooks |
| Authentication | Firebase UID and email-key linkage | `auth_identities` -> `application_users` |
| Authentication | login whitelist read | application user status/role in API |
| Authentication | demo credentials/DEV bypass | test fixtures only; no production bypass |
| Database | Firestore client SDK/Timestamps/transactions/listeners | REST clients + PostgreSQL/Drizzle |
| Database | all collections/subcollections above | mapped application tables |
| Database | duplicated event counts/UID arrays | SQL registration rows/counts |
| Database | free-form center/company/assignment fields | normalized FK relationships |
| Authorization | `firestore.rules` | NestJS policies plus PostgreSQL constraints |
| Authorization | role/whitelist user document | application roles/status |
| Authorization | React guards as apparent protection | API enforcement; UI remains UX |
| Authorization | grant materialization rules | Privacy service transactions/policy |
| Cloud Function | scheduled scraper | protected API job/Render cron or worker |
| Cloud Function | callable scraper | admin-only REST operation |
| Cloud Function | weekly summary if truly used | PostgreSQL query + server notification job |
| Hosting | Firebase Hosting config/deploy | Render static frontend and DNS |
| File/media storage | Firebase Storage initialization/imports | R2 S3 client and presigned upload flow |
| File/media storage | base64 event image fields | R2 objects + `media_assets` |
| Tooling/script | `firebase.json`, indexes, rules deploy | Backend V2 deployment/migrations |
| Tooling/script | Firebase CLI/emulators | Nest/Postgres test environment; Firebase retained only during bridge |
| Tooling/script | Admin SDK import/audit/enrichment scripts | idempotent PostgreSQL migration/import tools |
| Tooling/script | local service-account/private-key convention | server secret manager/workload credentials |
| Tooling/script | `firebase-admin`, `firebase-functions` packages and compiled `lib` | removed after function cutover |
| Frontend integration | Firebase config/service modules | per-domain REST services |
| Frontend integration | direct Firestore imports in pages/components | API service boundary |
| Frontend integration | realtime notifications/content/events | polling/revalidation or scoped streaming only if justified |
| Frontend integration | collection-group registration query | `/me/registrations` |
| Frontend integration | Firebase callable client | REST admin scraper endpoint |

README/deployment documentation, root scripts, package dependencies, environment
variables, CI secrets, Firebase project IAM/service accounts, monitoring, DNS,
and compiled tracked Function artifacts also require cleanup at final removal.

## 3. Firestore-to-PostgreSQL mapping

| Firestore source | PostgreSQL target | Transformation notes |
|---|---|---|
| `users/{email}` | `application_users`, `user_profiles`, `user_roles`, historical `coordinators`, `employers`, `employer_contacts`, `employer_contact_interactions` | split identity/person/company/role; canonicalize center; preserve one-to-many lineage; import `contactHistory` only when meaning/actor/time are reliable |
| Firebase Auth users | `auth_identities(provider=firebase)` | match primarily by verified normalized email, report ambiguity, never guess |
| root/profile center fields | `centers`, historical `coordinators`, `employer_center_relationships` | approved center dictionary and aliases; at most one active coordinator row and one active employer center |
| assigned coordinator email | `coordinator_assignments` | resolve both sides; detect missing/cross-center/duplicate active assignments; never infer a center transfer |
| `private_info/details` | `employer_private_information` | remove legacy `approved_viewers`; validate/normalize contact values |
| `privacy_requests` | `privacy_requests`, `privacy_request_decisions` | status/stage mapping; resolve employer/coordinator UUIDs |
| `private_access` | `privacy_access_grants` | require valid approved source; apply approved expiry duration; quarantine unverifiable grants; record migration/system actor |
| `events` | `events`, `event_publication_history`, `event_media` | status canonicalization; timestamps; owner/center resolution; no UID array |
| event `registrations` | employer-owned `event_registrations` cycles, possibly `payments` | resolve Firebase UID to an active/historical employer contact and organization; assign deterministic cycle numbers; quarantine ambiguous ownership; classify payment evidence explicitly |
| `notifications` | `notifications` | resolve recipient/actor; drop or quarantine unrelated/missing recipients |
| `articles` | `articles`, history, sources/media | `pending -> pending_review`, `approved -> published`; SHA-256 source URL |
| `promotional_content` | `promotional_content_items`, `media_assets` | role audience -> role FK; external/local asset mapping |
| `settings/bot_config` | `content_sources`, `content_keywords` | validate source URLs/selectors; admin-owned config |
| `links` | review against `articles` | migrate only if live inventory proves distinct data |
| `system_notifications` | notification/analytics replacement or archive | usually recompute rather than migrate a global flag |
| base64/image URLs/storage objects | `media_assets` + R2 | decode/hash/upload/verify; preserve external URLs only by policy |

### Status mapping rules

Mappings are explicit transform code with a rejected-record report:

- Event `pending` and `pending_approval` -> `pending_approval`.
- Event `unpublished` -> `draft`.
- Event `published` and verified event `approved` -> `published`.
- Event `rejected` -> `rejected`.
- Event `archived` -> publication state derived from a valid
  `previousStatus`; archive fields set separately. Ambiguous rows require
  review.
- Event `deleted` -> `deleted_at`; do not create a new publication status.
- Registration `registered` may establish a confirmed registration cycle only
  after employer/contact ownership reconciliation; it does **not** establish a
  successful payment. `pending_payment` becomes a legacy cycle with an explicit
  hold disposition; cancellation spelling variants -> `cancelled`.
- A paid legacy registration creates payment evidence as
  `provider_verified`, `legacy_unverified`, `missing`, or
  `manual_reconciliation`. Unknown/missing proof never maps to
  provider-verified `succeeded`.
- Article `pending`/`pending_review` -> `pending_review`;
  `approved`/`published` -> `published`; `rejected` unchanged.

Never silently map an unknown status to a permissive/published state.

## 4. Incremental domain migration order

The recommended sequence changes the proposed order by moving media before
events and introducing server-created notifications with the first sensitive
workflow.

### Stage 0 — Safety baseline

- Freeze canonical domain/status terminology in the design.
- Add Backend V2 CI, disposable PostgreSQL integration tests, request logging,
  and role-based Playwright skeleton.
- Inventory the live Firebase project without writes.

Exit: reproducible local/test foundation and signed-off live inventory.

### Stage 1 — PostgreSQL/API foundation and Firebase identity bridge

- NestJS/Express, config validation, Drizzle baseline, health endpoints.
- Firebase ID-token verification -> `auth_identities` ->
  `ApplicationPrincipal`.
- Error, audit, pagination, test-database conventions.

Exit: protected no-op `/me`/health paths work in staging; no product domain has
cut over.

### Stage 2 — Users, centers, employers, and directory reads

- Idempotent identity/directory importer and reconciliation.
- Historical center-specific coordinator rows with at most one active row per
  application user; one active center relationship per employer.
- Read-only, field-minimized employer/center APIs.
- Shadow comparison against current UI data.
- Feature-flagged frontend directory API adapter.

Exit: role/center scopes and counts reconcile; no private/CRM leakage.

### Stage 3 — Employer writes and assignment

- Employer create/edit, private/CRM endpoints, center relationship and
  admin-controlled assignment.
- Append-only CRM/contact interactions; ambiguous legacy `contactHistory` is
  archived rather than guessed into active history.
- Employer provisioning/link flow.

Exit: direct Firestore directory writes disabled for migrated cohort/domain;
  assignment negative tests pass.

### Stage 4 — Privacy plus trusted workflow notifications

- Requests, decisions, grants, expiry/revocation.
- Principal/lifecycle side effects for suspension, role/contact/coordinator
  deactivation, transfer, assignment ending, and center/employer deactivation.
- Server-selected privacy notifications.
- Migrate/validate legacy requests/grants.

Exit: assignment changes revoke/cancel correctly; private reads are audited;
role matrix passes.

### Stage 5 — Media platform

- R2 buckets/CORS, presigned upload/finalize, asset metadata and cleanup.
- Migrate employer logos and reusable assets.

Exit: upload verification and object rollback tested; no new base64 fields.

### Stage 6 — Events

- Canonical event workflow, moderation, archive/restore, owner/center policies.
- Immutable historical event center and automatic remoderation after material
  coordinator edits to published events.
- Extract/migrate event images through media pipeline.

Exit: coordinator events require approval; event lists are paginated/scoped;
no registrant UIDs in event DTOs.

### Stage 7 — Registrations and payments

- Employer-owned registration cycles and one active cycle per event/employer.
- Transactional capacity including expiring paid holds, late webhook handling,
  cancellation/refund, and safe re-registration.
- `/me/registrations` reload-safe query.
- Provider integration, attempts, signed webhook, reconciliation/refund, and
  explicit legacy/unverified/missing payment evidence.

Exit: paid confirmation is server-only; overbooking, hold expiry, late webhook,
refund, re-registration, concurrency, and idempotency tests pass.

### Stage 8 — Notification inbox

- Migrate notification read/list operations and remaining domain producers.
- Retire Firestore notification listener.

Exit: all recipients are server-derived and inbox pagination/unread counts work.

### Stage 9 — Content and scraper

- Articles/promotional content moderation.
- Admin-only manual scraper and scheduled job.
- Resolve or retire `links`/weekly summary behavior.

Exit: coordinator/scraper cannot publish; Cloud Function output reconciles.

### Stage 10 — Analytics

- SQL aggregate endpoints using confirmed registration as participation,
  historical event center attribution, separate active-hold counts, explicit
  cancellation/refund treatment, and declared timezone boundaries.
- Remove client collection scans/N+1 Firestore reads.

Exit: admin/coordinator scoped dashboards reconcile and query plans meet agreed
budgets. Physical attendance is explicitly not reported.

### Stage 11 — Better Auth

- Generate pinned Better Auth schema.
- Link/invite accounts, session/cookie integration, account recovery.
- Move React auth adapter while preserving application UUIDs/policies.

Exit: employer/coordinator/admin E2E flows pass with Better Auth; Firebase login
fallback is disabled after support window.

### Stage 12 — Firebase removal

- Final dependency scan, retention exports, DNS/hosting cutover, function/rules
  retirement, credential rotation, project decommission approval.

## 5. Compatibility strategy

### Domain source registry

React gets explicit per-domain clients:

```text
DirectoryClient      -> firestore | api
PrivacyClient        -> firestore | api
EventsClient         -> firestore | api
RegistrationsClient  -> firestore | api
NotificationsClient  -> firestore | api
ContentClient        -> firestore | api
AnalyticsClient      -> firestore | api
```

The feature/source configuration is environment- and release-controlled, not a
user-selectable local-storage bypass.

Rules:

- One authoritative writer per domain at any moment.
- Read and write paths for a domain cut over together unless an explicitly
  tested shadow-read phase is read-only.
- Do not automatically fall back to Firebase when an API request returns 403,
  404, or 5xx; that would bypass policy and mask divergence.
- Do not dual-write from the browser.
- If a temporary dual-write is required for rollback, it occurs inside a
  trusted server adapter with idempotency, monitoring, and a removal date.
- Shared UI consumes normalized domain DTOs so source changes do not spread
  throughout components.

Firebase Auth remains the transition authenticator even when a domain's data is
PostgreSQL. The API principal abstraction prevents policies from caring which
auth provider produced the subject.

### Cutover per domain

1. Import snapshot and validate.
2. Run API shadow reads and compare safe DTOs/counts.
3. Pause writes briefly or capture a tested delta.
4. Apply final idempotent delta and reconcile.
5. Switch the domain feature flag.
6. Monitor errors, policy denials, counts, and user flows.
7. Keep Firebase data read-only/retained during the rollback window.
8. Retire the old path only after the agreed soak period.

## 6. Idempotent data migration

### Export

- Use a least-privilege Admin SDK export tool for all top-level collections and
  nested subcollections.
- Export Firebase Auth users separately.
- Write immutable NDJSON/raw JSON plus a manifest containing environment,
  export timestamp, collection/path counts, byte counts, and SHA-256 checksums.
- Encrypt migration artifacts and restrict access. Never commit data.
- Repeat export tooling in dry-run against emulator/sanitized fixtures first.

### Staging and transformation

- Load raw records into a disposable/staging area or stream through typed
  transformers while preserving source JSON/checksum.
- Normalize email case, timestamps to UTC, phones/URLs, center aliases, and
  status mappings.
- Record timestamp provenance. Missing/ambiguous local timestamps are
  quarantined or explicitly marked as inferred; PostgreSQL `DEFAULT now()` is
  never silently used as historical event/payment/interaction time.
- Use deterministic target UUIDs (for example UUIDv5 from a fixed namespace and
  canonical source path) or persist mappings before child imports.
- Resolve Firebase UID/email collisions explicitly.
- Split employer organization, contact, user, private, CRM, center, and
  assignment records.
- Produce one deterministic transform `item_key` per intended target row (for
  example `user`, `role:employer`, `event_media:<hash>`). One source document
  may therefore produce multiple targets in the same table.
- Convert reliable `contactHistory` entries into append-only interactions;
  record unreliable entries as `archived` run items with encrypted source
  evidence instead of inventing active CRM facts.
- Resolve each registration to an employer organization plus the submitting
  contact/user. A Firebase UID by itself is not organization ownership.
- Classify paid legacy records as provider-verified, legacy-unverified,
  missing-evidence, or manual-reconciliation candidates.
- Decode/hash base64 media and create an object-upload manifest.
- Reject unknown/permissive status mappings rather than defaulting.

### Import

- Import parent/reference tables before children.
- Use bounded transactions and `INSERT ... ON CONFLICT` with immutable source
  keys/checksums.
- Create/reuse canonical `legacy_record_mappings` keyed by source system/path
  plus target table/primary key.
- Record every transform item in `data_migration_run_items`, including its run,
  item key, source checksum, outcome, and optional canonical mapping.
- Re-running the same source checksum reuses canonical mappings and records an
  `unchanged` item for the new run.
- A changed source checksum performs an allowlisted upsert or emits a conflict;
  it never blindly overwrites a moderated/production-newer row.
- Ambiguous identity, ownership, status, center, or payment evidence records
  `quarantined`/`conflict` without a canonical target mapping.
- Disable external side effects (notifications, payment calls, scraper jobs)
  during import.

### Validation and reconciliation

For every domain produce machine-readable and human-readable reports:

- source, transformed, imported, rejected, and quarantined counts;
- counts by role/status/center/date partition;
- source/target monetary sums for payments;
- source path without target mapping and target row without source mapping;
- orphan foreign-key candidates before import and anti-join checks after;
- duplicate normalized email, Firebase UID, company number/name, assignment,
  active event/employer registration cycle, grant, source URL, and
  recipient-scoped notification key;
- event registration subcollection count versus legacy event count/UID array;
- registration UID/contact/employer proof and deterministic cycle assignment;
- paid registration evidence classification; verified success totals are
  reconciled separately from legacy-unverified/missing/manual rows;
- privacy grant with missing/unapproved source request;
- center/assignment mismatch;
- multiple active coordinator rows for one user or active employer-center rows
  for one employer;
- canonical mappings with no run evidence, run items with invalid mapping
  outcomes, and one-to-many source/target counts by `migration_run_id`;
- sample field-level checks and deterministic checksums;
- PostgreSQL constraint validation and API shadow-contract comparisons.

All rejected records require an owner/disposition: fix transform, merge,
archive, or product-approved omission.

### Delta and cutover

Firestore has no trustworthy global change log in this repository. A final
domain sync therefore uses either:

- a short write pause followed by a full deterministic domain re-export/upsert;
  or
- a previously deployed, tested server-side change journal/dual-write adapter.

Do not infer a complete delta solely from optional/inconsistent `updatedAt`
fields.

### Rollback

- Before cutover, Firebase remains authoritative; discard/rebuild PostgreSQL.
- During the bounded post-cutover rollback window, keep a tested reverse-sync
  plan for new PostgreSQL writes or use a trusted server dual-write.
- Rollback is an explicit domain feature-flag change after pausing writes and
  reconciling divergence; it is not automatic request fallback.
- Financial/payment cutover requires stricter forward-recovery rules. Never
  roll back a succeeded provider payment by merely changing the UI source.
- Record rollback run/result in `data_migration_runs`.
- Keep encrypted source snapshot, manifest, migration version, reconciliation,
  and target backup until retention approval.

## 7. Branch and PR migration plan

Each PR is deployable/reviewable and avoids broad unrelated refactors.

1. `feat/backend-v2-foundation`: NestJS/Express, PostgreSQL/Drizzle baseline,
   health/config/errors, Firebase token bridge, test database, CI.
2. `feat/firebase-directory-importer`: idempotent users/centers/employers
   export-transform-import and reconciliation, dry-run only by default.
3. `feat/directory-api-read-cutover`: scoped employer/center read APIs, policy
   tests, feature-flagged frontend adapter, shadow comparison.
4. `feat/directory-writes-assignments`: employer writes, provisioning,
   center-safe admin assignments.
5. `feat/privacy-api`: request/decision/grant/revocation and server privacy
   notifications.
6. `feat/media-r2`: upload/finalize/cleanup and first media migration.
7. `feat/events-api`: event workflow, moderation, archive, event media.
8. `feat/registrations-payments-api`: capacity, reload-safe registrations,
   payment provider/webhooks.
9. `feat/notifications-api`: inbox/read state and remaining producers.
10. `feat/content-scraper-api`: moderation, promotional content, scheduled/admin
    scraper.
11. `feat/analytics-api`: scoped SQL aggregates and dashboard adapter.
12. `feat/better-auth-cutover`: account linking/invitation/session migration.
13. `chore/remove-firebase`: dependency/config/function/rule/hosting removal
    after the checklist is signed off.

Schema changes within these PRs use expand/backfill/switch/contract rather than
one destructive migration.

## 8. Firebase removal definition of done

Firebase can be removed only when all conditions are true:

### Product/data

- Every live Firebase collection/subcollection/storage object is mapped,
  migrated, deliberately archived, or deliberately discarded with owner
  approval.
- Final and sampled field-level reconciliation passes; all orphans/duplicates
  have dispositions.
- PostgreSQL is authoritative for every domain and has passed its soak window.
- No required new writes exist only in Firebase.
- Event, privacy, content, registration, payment, and archive workflows use one
  canonical state model.

### Authentication/authorization

- Every active Firebase account is linked/invited to Better Auth or explicitly
  retired.
- Employer account provisioning, verification, recovery, sign-out, and session
  expiry are proven.
- Employer, unrelated/assigned coordinator, cross-center coordinator, admin,
  suspended, and anonymous policy suites pass.
- Direct URL and direct API calls cannot bypass policy.
- Private reads, grants, assignments, moderation, and payment admin actions are
  audited.

### Application/infrastructure

- Production frontend contains no Firebase SDK imports/configuration.
- API contains no Firebase Admin token bridge after the support window.
- No production code reads/writes Firestore, calls Cloud Functions, or uses
  Firebase Storage/Hosting.
- Scheduled/manual scraper and any weekly summary behavior are replaced or
  formally retired.
- Render frontend/API/PostgreSQL, R2, DNS, CORS/cookies, monitoring, alerts,
  health checks, migrations, backups, and restore test are operational.
- Payment webhooks and media uploads work through the new infrastructure.

### Quality/operations

- Permanent Playwright role flows pass in staging and production smoke tests.
- Unit, policy, PostgreSQL integration, and API tests pass.
- Performance budgets and critical query plans are approved.
- Cutover and rollback runbooks have been exercised.
- Support/handover documentation and on-call ownership are complete.

### Retirement

- Required retention export/backups are stored securely and restore-tested.
- Firebase deploy/CI scripts, indexes/rules, packages, environment variables,
  compiled artifacts, and docs are removed in the final focused PR.
- Firebase service accounts/API credentials are revoked/rotated.
- Firebase Hosting/DNS and Functions are disabled only after traffic
  verification.
- Firestore/Auth/Storage project deletion, if desired, occurs only after legal,
  security, product, and operations sign-off and expiry of the rollback/retention
  period.
