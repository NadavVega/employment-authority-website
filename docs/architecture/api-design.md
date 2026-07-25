# Backend V2 REST API design

Status: representative contract for domain boundaries, not a complete OpenAPI
specification.

All project endpoints use `/api/v1`. Better Auth's provider-owned endpoints are
mounted separately under `/api/auth/*` unless the pinned integration requires a
different documented path.

## Conventions

- Authentication is required unless an endpoint is explicitly described as
  anonymous.
- During migration, the same endpoints accept a verified Firebase bearer token.
  After auth cutover, they use the Better Auth session.
- Request bodies never accept authoritative `userId`, role, center,
  coordinator, employer ownership, recipient, or successful payment state.
- IDs are UUIDs except provider-owned webhook/event references.
- Collection responses are bounded and keyset-paginated:

```json
{
  "items": [],
  "page": {
    "nextCursor": "opaque-or-null",
    "hasMore": false
  }
}
```

- Default limit is 25; hard maximum is 100.
- Errors use a stable Problem Details-style shape:

```json
{
  "type": "https://api.example/errors/event-not-registerable",
  "title": "Event cannot accept registrations",
  "status": 409,
  "code": "EVENT_NOT_REGISTERABLE",
  "detail": "Safe user-facing detail",
  "requestId": "uuid",
  "errors": []
}
```

Common errors are `AUTHENTICATION_REQUIRED` (401), `FORBIDDEN` (403),
`NOT_FOUND` (404), `VALIDATION_FAILED` (400/422), `CONFLICT` (409),
`RATE_LIMITED` (429), and `INTERNAL_ERROR` (500). A scoped resource may return
404 instead of 403 when revealing its existence would disclose private data.

## Authentication and current user

### Better Auth endpoints

| Method/route | Access | Purpose |
|---|---|---|
| `ALL /api/auth/*` | Better Auth-defined | Sign-in, sign-out, session, verification, provider callbacks |

The Better Auth adapter owns request/response details. Domain role/profile
fields are not accepted through these endpoints.

### `GET /api/v1/me`

- **Roles:** any authenticated, active application user.
- **Policy:** authenticated subject must resolve through `auth_identities`.
- **Request:** none.
- **Response:** application user ID, safe profile, active roles, coordinator
  center summary and/or the one active employer membership needed by UI
  navigation. Historical/inactive relationships are never principal claims.
- **Errors:** `IDENTITY_NOT_LINKED` (403), `USER_SUSPENDED` (403).

### `PATCH /api/v1/me/profile`

- **Roles:** any authenticated application user.
- **Policy:** self only; allowlisted profile fields.
- **Request:** name/locale fields, not role, email verification, assignment, or
  employer ownership.
- **Response:** updated safe profile.
- **Errors:** validation, suspended user, conflict.

### Admin role operations

`POST /api/v1/users/:userId/roles` and
`DELETE /api/v1/users/:userId/roles/:roleCode` are admin-only, audited, and
accept a reason. They do not manipulate Better Auth sessions directly.

## Centers

### `GET /api/v1/centers`

- **Roles:** authenticated application users.
- **Policy:** returns active public center reference data.
- **Request:** optional bounded search/cursor.
- **Response:** center ID, code, name, status as permitted.

### `PATCH /api/v1/centers/:id`

- **Roles:** admin.
- **Policy:** `CenterPolicy.manage`.
- **Request:** name/status/reference fields.
- **Response:** updated center.
- **Errors:** duplicate code/name, invalid deactivation while product-dependent
  active relationships remain.

## Employers and directory

### `GET /api/v1/employers`

- **Roles:** employer, coordinator, admin.
- **Policy:** `EmployerPolicy.listPublic`. Role and center may change which
  fields/rows are returned.
- **Request:** `search`, industry, center, status when authorized, cursor,
  limit, sort.
- **Response:** public employer cards only. No raw user document, auth UID,
  private email/phone, CRM notes, privacy grant details, or assignment internals
  beyond the role-approved summary.
- **Errors:** validation/unsupported filter.

### `GET /api/v1/employers/:id`

- **Roles:** authenticated application users.
- **Policy:** `EmployerPolicy.readPublic`; additional server-computed
  capabilities may be returned.
- **Request:** path ID.
- **Response:** public employer profile plus safe `capabilities` such as
  `canEdit`, `canRequestPrivateAccess`, and `hasPrivateAccess`. The client
  cannot use capabilities as security enforcement.
- **Errors:** 404 if missing/not in scope.

### `GET /api/v1/employers/:id/private-information`

- **Roles:** employer contact or coordinator. Admin role alone is not eligible.
- **Policy:** `EmployerPolicy.readPrivate` and `PrivacyPolicy.hasAccess`:
  owner contact, active same-center assignment, or active/unexpired grant.
- **Request:** optional access purpose if required by audit policy.
- **Response:** minimum private contact DTO.
- **Errors:** 404/403, `PRIVACY_GRANT_EXPIRED`, `ASSIGNMENT_INACTIVE`.
- **Audit:** every successful read with authorization basis; private values are
  excluded from the audit payload.

### `GET /api/v1/employers/:id/crm`

- **Roles:** assigned coordinator.
- **Policy:** `EmployerPolicy.readCrm` with active center relationship and
  assignment. Admin CRM access is not part of the baseline.
- **Response:** append-only CRM/contact interactions, keyset-paginated.

### `POST /api/v1/employers/:id/crm/interactions`

- **Roles:** assigned coordinator.
- **Policy:** active employer, center relationship, and assignment.
- **Request:** allowlisted interaction kind, summary, occurred time, and an
  optional employer contact belonging to the same employer. Actor identity is
  server-derived.
- **Response:** immutable interaction record.
- **Audit:** creation is audited; normal application operations do not edit or
  delete interaction history.

### `POST /api/v1/employers`

- **Roles:** coordinator or admin.
- **Policy:** `EmployerPolicy.create`. Coordinator center is derived from the
  principal. If product retains the workflow, creation atomically creates the
  center relationship and assignment to the coordinator.
- **Request:** public employer fields, contact name/position, private contact
  block. No role/assignment actor fields.
- **Response:** created employer and capabilities.
- **Errors:** suspected duplicate company/contact (409), invalid center state,
  validation.

### `PATCH /api/v1/employers/:id`

- **Roles:** managing employer contact, active assigned coordinator, or admin.
- **Policy:** `EmployerPolicy.update`; field allowlist varies by relationship.
- **Request:** public fields only. CRM and private data use dedicated endpoints.
- **Response:** updated employer.

### `PATCH /api/v1/employers/:id/private-information`

- **Roles:** managing employer contact or active assigned coordinator. Admin
  role alone is not eligible.
- **Policy:** `EmployerPolicy.updatePrivate`; every change audited.
- **Request:** private contact fields.
- **Response:** updated private DTO.

### Assignment operations

| Method/route | Roles | Policy and behavior |
|---|---|---|
| `POST /api/v1/employers/:id/assignments` | admin | `EmployerPolicy.assign`; body contains coordinator ID and reason; verifies same active center relationship |
| `DELETE /api/v1/employers/:id/assignments/current` | admin | Ends assignment with reason; revokes/cancels affected privacy access transactionally |
| `GET /api/v1/employers/:id/assignments` | assigned coordinator/admin | Current/history DTO scoped by policy |

A coordinator cannot claim an existing unassigned employer by calling the
create-assignment endpoint.

## Privacy requests and grants

### `POST /api/v1/privacy-requests`

- **Roles:** coordinator.
- **Policy:** `PrivacyPolicy.requestAccess`; caller is not active assigned
  coordinator and target employer is eligible.
- **Request:** `{ "employerId": "uuid", "purpose": "..." }`.
- **Response:** request ID, status, expiry, required approval stages.
- **Errors:** duplicate pending request (409), already has access (409),
  assignment changed, validation.
- **Side effects:** server selects and creates employer/assigned-coordinator
  notifications.

### `GET /api/v1/privacy-requests`

- **Roles:** employer or coordinator. Admin role alone has no baseline privacy
  inbox access.
- **Policy:** participant-scoped inbox/history.
- **Request:** status, actionable-only, cursor/limit.
- **Response:** safe request summaries and allowed actions. No unrelated
  requests.

### `POST /api/v1/privacy-requests/:id/employer-decision`

- **Roles:** employer contact who may manage the target employer.
- **Policy:** current state is `awaiting_employer`; caller owns target employer.
- **Request:** `{ "decision": "approved|rejected", "reason": "optional" }`.
- **Response:** next request state and grant summary when completed.
- **Errors:** stale state (409), wrong employer/role (404/403), expired.

### `POST /api/v1/privacy-requests/:id/coordinator-decision`

- **Roles:** assigned coordinator.
- **Policy:** current state `awaiting_coordinator`; captured assignment remains
  current and belongs to caller.
- **Request/response:** as above.
- **Side effects:** approval creates grant atomically; rejection creates none.

### `POST /api/v1/privacy-requests/:id/cancel`

- **Roles:** requesting coordinator; admin only for support/expiry operations.
- **Policy:** pending request and authorized actor.
- **Request:** reason.

### `POST /api/v1/privacy-grants/:id/revoke`

- **Roles:** employer owner or server lifecycle operation for
  assignment/center/coordinator changes. Admin role alone does not gain private
  read access; an admin-triggered assignment operation may still cause
  server-owned revocation.
- **Policy:** `PrivacyPolicy.revokeGrant`.
- **Request:** reason.
- **Response:** revoked status/timestamp.

There is no browser endpoint to create an already-approved grant.

## Events

### `GET /api/v1/events`

- **Roles:** anonymous only if product allows public events; otherwise any
  authenticated role.
- **Policy:** `EventPolicy.list`. Employers/anonymous receive only published,
  unarchived events. Coordinators receive public plus owned/scoped work queues;
  admins may filter moderation/archive.
- **Request:** date range, type, center, publication status when authorized,
  archived flag when authorized, cursor/limit.
- **Response:** event summary without registration IDs/Uids or payment secrets.

### `GET /api/v1/events/:id`

- **Policy:** `EventPolicy.read`.
- **Response:** role-safe event detail and server-computed capabilities.
- **Errors:** 404 when unpublished/out of scope.

### `POST /api/v1/events`

- **Roles:** coordinator or admin.
- **Policy:** `EventPolicy.create`; center and owner derived server-side.
- **Request:** event details, time range, capacity, accessibility, valid payment
  configuration, ready media asset IDs.
- **Response:** draft event.
- **Errors:** invalid time/payment/media; unavailable center.

### `PATCH /api/v1/events/:id`

- **Roles:** owner coordinator or admin.
- **Policy:** `EventPolicy.update`; coordinator owns event and changes only
  editable fields. A coordinator change to title, description, type/audience,
  time, location/online/external URL, accessibility details, capacity, payment
  configuration, public contact details, center, or event media is material.
  For a published event the update and `published -> pending_approval`
  transition occur atomically. Center is server-owned/admin-only and immutable
  after first submission.
- **Response:** event and current status.
- **Errors:** stale version/conflict, event ended, invalid transition.

Use optimistic concurrency (`updatedAt`/version precondition) for edit forms so
stale pages cannot overwrite newer moderation changes.

### Event workflow endpoints

| Method/route | Roles | Policy/transition | Important errors |
|---|---|---|---|
| `POST /api/v1/events/:id/submit` | owner coordinator | draft -> pending approval | not owner, invalid event/payment config |
| `POST /api/v1/events/:id/publish` | admin | draft/pending -> published | invalid transition, past event |
| `POST /api/v1/events/:id/reject` | admin | pending -> rejected; reason required | invalid transition |
| `POST /api/v1/events/:id/cancel` | admin | published -> cancelled; reason required | already ended/state conflict |
| `POST /api/v1/events/:id/archive` | admin | sets archive fields; status unchanged | event not eligible |
| `POST /api/v1/events/:id/restore` | admin | clears archive fields; status unchanged | not archived |

## Registrations and payments

### `POST /api/v1/events/:id/registrations`

- **Roles:** employer.
- **Policy:** `RegistrationPolicy.register`; derives employer, contact, and user
  from the single active principal membership, checks event
  state/time/capacity, locks the event, expires stale holds, and enforces one
  active registration cycle per event/employer.
- **Request:** only non-authoritative flow choices. No employer, contact, user,
  cycle, hold-expiry, or success fields are accepted.
- **Response:** registration-cycle ID/status/number; for provider payments, a
  safe checkout action and server-selected hold expiry.
- **Errors:** active cycle already exists (409), refund not resolved (409), full
  (409), registration closed (409), payment unavailable (503), inactive
  membership.

### `GET /api/v1/me/registrations`

- **Roles:** employer.
- **Policy:** current active employer membership. Returns that organization's
  current and historical cycles, including cycles submitted by a prior active
  contact only when organization-level policy permits.
- **Request:** status/cursor/limit.
- **Response:** durable registration/event/payment summaries used to restore UI
  state after reload.

### `POST /api/v1/registrations/:id/cancel`

- **Roles:** active managing contact for the owning employer or admin for an
  audited support operation.
- **Policy:** cancellation window/state; payment refund policy when applicable.
- **Request:** reason.
- **Response:** registration/payment outcome.

### `GET /api/v1/events/:id/registrations`

- **Roles:** event owner coordinator or admin.
- **Policy:** `RegistrationPolicy.listForEvent`.
- **Request:** status/cursor/limit.
- **Response:** necessary employer-organization registration DTO with
  submitting-contact evidence only when authorized; excludes unrelated private
  employer fields.

### Payment endpoints

| Method/route | Access | Policy/behavior |
|---|---|---|
| `POST /api/v1/registrations/:id/payment-attempts` | registration owner | Creates/reuses idempotent checkout attempt; never accepts success |
| `GET /api/v1/registrations/:id/payment` | registration owner, event owner/admin with scoped fields | Safe status only |
| `POST /api/v1/payments/webhooks/:provider` | anonymous transport, signed provider | Verify raw signature, deduplicate event, lock event/registration, confirm only before hold expiry, and refund/escalate late success |
| `POST /api/v1/payments/:id/reconcile` | admin | Audited exceptional reconciliation with reason, evidence, actor, and timestamp |
| `POST /api/v1/payments/:id/refunds` | admin | Provider refund plus trusted state transition |

Webhook routes are rate-limited appropriately but cannot require a user
session. Invalid signatures return provider-compatible 4xx without processing.
Payment responses distinguish provider-verified, legacy-unverified,
missing-evidence, and manually reconciled records. A legacy `registered` value
does not appear as verified payment.

## Notifications

### `GET /api/v1/notifications`

- **Roles:** authenticated.
- **Policy:** recipient is current user.
- **Request:** unread-only, cursor/limit.
- **Response:** newest-first notification DTOs.

### `GET /api/v1/notifications/unread-count`

Returns a database count for the current recipient; it does not download all
notifications.

### `POST /api/v1/notifications/:id/read`

- **Policy:** current recipient.
- **Response:** read timestamp; idempotent.

### `POST /api/v1/notifications/read-all`

- **Policy:** current recipient.
- **Request:** optional upper timestamp to avoid racing newly created rows.
- **Response:** affected count.

There is no generic user-supplied notification recipient endpoint. If
event-sharing messages remain a product feature, use a dedicated
`POST /events/:id/share` operation with `NotificationPolicy` deriving permitted
recipients.

## Content, scraper, and promotional items

### Article endpoints

| Method/route | Roles | Policy/transition |
|---|---|---|
| `GET /api/v1/articles` | authenticated/public if approved | Published feed only unless moderator filter authorized |
| `GET /api/v1/articles/:id` | role-scoped | Published, author-owned draft, or admin moderation view |
| `POST /api/v1/articles` | coordinator/admin | Creates draft; admin may separately publish |
| `PATCH /api/v1/articles/:id` | owner while draft/rejected; admin | Allowlisted edits |
| `POST /api/v1/articles/:id/submit` | owner coordinator | draft -> pending review |
| `POST /api/v1/articles/:id/publish` | admin | pending/draft -> published |
| `POST /api/v1/articles/:id/reject` | admin | pending -> rejected with reason |
| `POST /api/v1/articles/:id/archive` | admin | published -> archived |

Coordinator creation never accepts `status: published`.

### Scraper administration

| Method/route | Roles | Behavior |
|---|---|---|
| `GET /api/v1/content/sources` | admin | List source/keyword configuration |
| `PUT /api/v1/content/sources/:id` | admin | Validate allowed HTTP(S) source and selector configuration |
| `POST /api/v1/content/scrape-runs` | admin | Starts one idempotent/manual run; rate/concurrency limited |
| `GET /api/v1/content/scrape-runs` | admin | Run history/errors/counts |

Scheduled scraper execution uses a protected internal job command, not this
user endpoint. All discovered articles enter `pending_review`. Fetching uses an
approved scheme/host allowlist, redirect cap with per-hop revalidation,
private/loopback/link-local IP blocking after DNS resolution, response-size
limits, connection/total timeouts, and safe parser limits. Manual invocation is
authenticated, admin-authorized, rate-limited, and audited.

### Promotional content

Admin-only create/update/publish/archive endpoints manage validated promotional
items and ready media assets. The public/role-scoped feed returns only
published items for `audience_role_id` or all audiences, ordered server-side.

## Media

### `POST /api/v1/media/uploads`

- **Roles:** coordinator/admin, and employer only for explicitly allowed profile
  media.
- **Policy:** `MediaPolicy.beginUpload` for declared purpose/domain.
- **Request:** filename, MIME type, byte size, checksum, intended purpose.
- **Response:** pending media ID, exact object key, short-lived presigned PUT
  URL, required headers, expiry.
- **Errors:** type/size not allowed, quota/rate limit.

### `POST /api/v1/media/uploads/:id/complete`

- **Policy:** uploader or authorized domain owner.
- **Behavior:** HEAD/metadata verification, checksum/size validation, optional
  scan, state -> ready.
- **Response:** stable media metadata/delivery URL when public.
- **Errors:** object missing, mismatch, quarantined.

### `DELETE /api/v1/media/:id`

Soft-deletes only when policy permits and no protected live reference requires
it. The server uses indexed reverse lookups across employer logos, event media,
article hero media, and promotional content before object deletion. Object
deletion is asynchronous after retention.

## Analytics and audit

### `GET /api/v1/analytics/overview`

- **Roles:** admin or coordinator.
- **Policy:** admin gets approved global metrics; coordinator is forced to their
  center.
- **Request:** bounded date range, approved dimensions.
- **Response:** pre-aggregated metric DTO, not raw event/registration rows.
- **Errors:** missing coordinator center is a data-integrity error, not a
  client-provided fallback.

Representative endpoints may include `/analytics/events`,
`/analytics/registrations`, and `/analytics/content`. Metric definitions are
versioned/documented. Initial definitions use confirmed registration as
participation, preserve historical event-center attribution, report unexpired
paid holds separately, exclude cancelled cycles from current participation,
report refunds separately, and declare/echo timezone and date boundaries. The
initial server-configured reporting timezone is `Asia/Jerusalem`. Physical
attendance is not measured initially.

### `GET /api/v1/audit-logs`

- **Roles:** admin with explicit audit permission.
- **Policy:** bounded filters; private values remain redacted.
- **Request:** subject, actor, action, date range, cursor/limit.
- **Response:** append-only audit summaries.

## Health

| Method/route | Access | Meaning |
|---|---|---|
| `GET /health/live` | anonymous | Process is running |
| `GET /health/ready` | anonymous or platform-restricted | Database reachable and schema compatible |

Health responses expose no environment variables, database addresses, secrets,
or user data.
