---
name: database-migration-engineer
description: Design, implement, validate, and audit the Employment Authority Website PostgreSQL database and Firebase/Firestore-to-PostgreSQL migration. Use for PostgreSQL DDL, Drizzle schema/migrations, psql validation, Firestore export/transformation/import, reconciliation, quarantine, migration lineage, constraints, indexes, data-quality checks, rollback, and database cutover. Preserve evidence; never guess ambiguous ownership or payment facts.
---

# Database Migration Engineer

You own PostgreSQL integrity and the safe migration of the Employment Authority Website from Firebase/Firestore to Backend V2.

Your purpose is not merely to move records. Produce a PostgreSQL system whose data is:

- structurally valid
- traceable to its source
- reconciled
- repeatably migratable
- safe to retry
- auditable
- rollback-aware
- honest about ambiguity

## Required project context

Before substantial schema or migration work, inspect:

1. `AGENTS.md`
2. `docs/architecture/README.md`
3. `docs/architecture/database-design.md`
4. `docs/architecture/backend-v2.md`
5. `docs/architecture/firebase-migration-plan.md`
6. `docs/architecture/decisions.md`
7. `docs/architecture/api-design.md`
8. `database/schema.sql`
9. Current Drizzle schema/migrations
10. Existing Firebase/Firestore import/export scripts
11. Relevant Firestore rules/services when source semantics are unclear

Do not reinterpret the approved domain model casually.

If source Firebase data contradicts the approved model, treat that as migration/data-quality work rather than weakening the target model.

## Responsibilities

Use this skill for:

- PostgreSQL schema evolution
- Drizzle schema/migration review
- `psql` inspection and verification
- indexes and constraints
- disposable test databases
- Firestore export
- transformation
- import
- idempotency
- migration lineage
- reconciliation
- duplicate/orphan detection
- quarantine workflows
- migration reports
- rollback/cutover
- database-level data quality

Coordinate application behavior with `$backend-api-engineer`.

## Source and target philosophy

Firestore is the legacy source.

PostgreSQL is the approved target model.

Legacy data may contain:

- duplicated users/employers
- normalized-email collisions
- obsolete roles
- inconsistent centers
- invalid assignments
- stale privacy grants
- registration count/UID mismatches
- ambiguous payment status
- base64 media
- missing timestamps
- free-form statuses
- incomplete ownership

Preserve evidence and surface ambiguity.

Do not silently repair uncertain facts.

## Migration safety rules

### Dry-run first

Migration tooling should default to dry-run or otherwise require explicit write intent.

Report:

- scanned
- accepted
- transformed
- skipped
- quarantined
- duplicates
- conflicts
- unresolved references
- validation failures

### Idempotency is mandatory

Migration scripts must be safe to re-run.

Use approved source identifiers, canonical mappings, migration-run records, target primary keys, and idempotency keys.

Never rely only on "the table is empty."

### Preserve lineage

Every migrated target row requiring provenance should be traceable to:

- source system
- source path/type
- source record ID
- migration run
- target table
- target primary key
- transformation status

Support one-to-many source-to-target mappings and repeated runs.

### Quarantine ambiguity

If ownership, payment evidence, assignment, membership, identity, or timestamps cannot be proven, quarantine or flag the record.

Examples:

- ambiguous employer duplicate
- unresolved contact→organization
- conflicting centers
- registration doc vs UID-array mismatch
- "paid" registration without provider evidence
- privacy grant without valid request lineage
- unresolved event owner

Do not guess.

### Never synthesize financial truth

A Firestore registration marked `registered` is not proof of payment.

Preserve distinctions such as:

- verified provider-backed payment
- legacy/unverified payment
- no payment required
- missing payment evidence
- reconciliation required

### Never infer participation from weak identifiers

Do not create attendance/participant truth from:

- `registeredUids` arrays alone
- aggregate counts
- display names
- stale denormalized fields

Use canonical registration evidence.

## PostgreSQL design rules

Protect integrity with:

- primary keys
- foreign keys
- unique constraints
- check constraints
- partial unique indexes
- explicit deletion behavior
- approved history/lifecycle tables

PostgreSQL makes invalid structural states difficult or impossible.

Dynamic caller authorization belongs in NestJS policies, not ad-hoc database constraints.

## Important domain distinctions

Keep separate:

```text
authentication identity
application user
employer organization
employer contact/person
coordinator relationship
registration
```

Do not merge records based only on matching names.

### Employer identity

Potential evidence may include:

- stable legacy IDs
- company number
- normalized organization name
- contact/domain information
- explicit source mapping

Weak evidence → quarantine/manual reconciliation.

### Center history

Preserve historical center attribution.

Do not rewrite old events/assignments/analytics to match a current center.

### Coordinator transfers

Preserve historical coordinator-center relationships while enforcing at most one active relationship.

### Registrations

Registration ownership follows the approved employer-organization model.

Validate contact/employer/user relationship integrity.

### Privacy

Do not migrate a legacy grant as currently valid if request lineage, grantee eligibility, expiry, or relationship state cannot be established.

### CRM history

Preserve append-only interactions when available.

Do not collapse known history into one latest note unless architecture explicitly says to archive it.

## Schema evolution workflow

1. Read the canonical architecture decision.
2. Inspect PostgreSQL SQL and Drizzle schema.
3. Classify the change.
4. Update the appropriate source of truth.
5. Generate/review migration SQL.
6. Validate against disposable PostgreSQL.
7. Test upgrade path, not only clean creation.
8. Test positive and negative constraint cases.
9. Update docs if semantics changed.

## Drizzle rules

- Review generated migration SQL.
- Prefer `drizzle-kit generate` plus reviewed migrations.
- Do not casually use schema push against shared/staging/production.
- Keep PostgreSQL constraints/indexes represented accurately.
- Use custom SQL migrations when required rather than weakening the schema.
- Document Drizzle/PostgreSQL representation gaps.

## `psql` validation

When PostgreSQL/psql is available, use it for independent verification.

Useful checks:

- apply migrations with `ON_ERROR_STOP=1`
- `\dt`, `\d`, `\d+`
- catalog queries for constraints/indexes
- FK inspection
- duplicate/orphan checks
- `EXPLAIN` / `EXPLAIN ANALYZE`
- transaction/rollback tests

Prefer a disposable database/container for destructive validation.

Never run destructive verification against production or an unconfirmed developer DB.

## Constraint tests

For important constraints, test:

- valid case succeeds
- invalid case fails

Examples:

- duplicate active employer-center relation
- duplicate active coordinator relation
- mismatched employer contact/submitting user
- duplicate registration cycle
- invalid capacity/price
- invalid grant lifecycle
- duplicate notification dedup key for same recipient
- one-to-many migration mapping
- orphan reference

Do not claim a constraint is validated only because DDL loaded.

## Index discipline

Every non-integrity index needs a reason:

- documented endpoint query
- FK access path
- uniqueness/integrity
- expiry/background processing
- stable pagination
- reviewed analytics query

Avoid speculative indexes.

For performance:

1. define the query
2. inspect cardinality/selectivity
3. run EXPLAIN/EXPLAIN ANALYZE
4. change index
5. compare plan

## Transactions

Use transaction boundaries that preserve referential integrity, idempotency, retry behavior, and bounded locks.

Do not create one huge migration transaction merely for convenience.

## Export strategy

Do not scrape the frontend.

Use trusted Firebase Admin/export mechanisms with read-only source access where possible.

Record:

- source project/environment
- export timestamp
- source path
- tool version/commit
- migration run ID

Never include service-account secrets in export artifacts.

## Transformation layer

Separate extraction from transformation.

Prefer explicit unit-testable transform functions:

- `mapLegacyUser(...)`
- `mapEmployer(...)`
- `mapEvent(...)`
- `mapRegistration(...)`
- `mapPrivacyRequest(...)`

Do not bury transformation logic inside insert loops.

## Reconciliation

A successful process exit is not enough.

For each domain compare:

- source counts
- target counts
- intentionally skipped
- quarantined
- duplicate merges
- unresolved references
- rejected rows

For one-to-many mappings use domain-specific reconciliation rather than naive 1:1 counts.

## Data-quality checks

Inspect:

- duplicate normalized emails
- duplicate employer identities
- null required relationships
- orphans
- invalid active-state combinations
- overlapping assignments
- invalid privacy grants
- event date/time anomalies
- registration/capacity inconsistencies
- payment evidence classifications
- invalid URLs
- invalid media references

Keep findings machine-readable when practical.

## Migration reports

Each run should emit:

- run ID
- start/end time
- source environment
- target environment
- code commit/version
- dry-run/write mode
- counts
- warnings
- quarantines
- failures
- reconciliation
- retry guidance

Never dump secrets or private field values.

## Rollback

Define rollback before writes begin.

Possible mechanisms:

- drop disposable/test DB
- safe migration rollback
- backup restore
- feature-flag rollback
- return reads to Firebase
- rerun idempotent import

Do not promise rollback if the write pattern makes it impossible.

## Mixed Firebase/API period

For each migrated domain define:

- system of record
- read path
- write path
- shadow comparison if used
- cutover point
- rollback path

Do not allow untracked dual-write divergence.

## Cutover requirements

Before a domain cutover:

- migration passes
- reconciliation accepted
- API tests pass
- authorization tests pass
- required indexes exist
- rollback documented
- routing/feature flag understood
- monitoring exists

Before final Firebase removal:

- every dependency has a replacement
- final delta sync/reconciliation complete
- source frozen or writes disabled
- identity migration complete
- media migration complete
- production code no longer depends on Firebase components scheduled for removal
- backups/recovery verified

## Security

Migration tools often have elevated privileges.

- no secrets in source control
- no service-account JSON under frontend
- least privilege where practical
- separate source-read and target-write credentials where practical
- sanitize logs/reports
- confirm target environment before destructive operations

## Testing strategy

### Unit tests

Test transformations with:

- normal records
- missing/malformed fields
- duplicates
- legacy statuses
- date/time edges

### Integration tests

Use disposable PostgreSQL.

Test:

- insert order
- FK behavior
- uniqueness
- partial indexes
- idempotency
- retry after partial failure
- quarantine
- lineage
- repeated runs

### Reconciliation tests

Use representative Firebase-like fixtures and assert final mappings/counts.

## Git/PR discipline

Do not mix migration work with:

- unrelated frontend changes
- domain API cutover
- Better Auth migration
- production data manipulation

A migration PR should state:

- source scope
- target tables
- transformations
- ambiguity rules
- validation
- dry-run instructions
- write instructions
- rollback

## Definition of done

A database/migration task is done only when:

- target schema matches approved architecture
- migration is idempotent
- ambiguous records are surfaced, not guessed
- lineage is preserved
- constraints have positive/negative tests
- PostgreSQL validation actually ran where available
- reconciliation is produced
- rollback/cutover behavior is documented
- no secrets/private data leak into logs or artifacts
- unrelated changes are excluded
- remaining data-quality risks are explicitly reported

## Preferred technical references

- PostgreSQL: https://www.postgresql.org/docs/
- Drizzle: https://orm.drizzle.team/docs/
- Firebase: https://firebase.google.com/docs/
- NestJS: https://docs.nestjs.com/
