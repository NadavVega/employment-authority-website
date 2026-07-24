# Backend V2 architecture

Start here for the incremental migration from Firebase to NestJS/PostgreSQL.

1. [Backend V2](backend-v2.md) — canonical runtime, trust boundaries, modules,
   policies, workflows, storage, analytics, testing, deployment, and target
   repository structure.
2. [Database design](database-design.md) — PostgreSQL tables, relationships,
   constraints, indexes, privacy/ownership model, retention, ER diagram, and
   Drizzle compatibility.
3. [API design](api-design.md) — representative REST operations, roles,
   policies, request/response concepts, and errors.
4. [Firebase migration plan](firebase-migration-plan.md) — current architecture
   and dependencies, collection mapping, incremental order, compatibility,
   export/import/reconciliation, rollback, PR plan, and Firebase exit criteria.
5. [Architecture decisions](decisions.md) — confirmed decisions, rationale,
   assumptions, and open product/security/operations decisions.
6. [PostgreSQL schema](../../database/schema.sql) — executable architectural DDL
   for the project-owned application domain.

## Implementation starting point

Read the documents above before creating Backend V2. The first implementation
PR should scaffold the NestJS/Express API, PostgreSQL/Drizzle baseline,
disposable database tests, health/config/error conventions, and temporary
Firebase token-to-application-principal bridge. It must not cut over a product
domain.

The design baseline has completed its final architecture/security/data review.
Registration ownership and cycles, transactional paid-capacity holds,
historical coordinator and employer-center relationships, principal lifecycle
invalidation, private-data access, published-event remoderation, migration
lineage, and initial analytics definitions are resolved for implementation.
The `OPEN DECISION` items in [Architecture decisions](decisions.md) remain
implementation gates only for the stages that depend on them.

Better Auth authentication tables are intentionally not defined in the
application DDL. Generate them from the pinned Better Auth version/plugin set
during the authentication implementation and keep the application link through
`app.auth_identities`.

The existing React application, Firestore, Security Rules, Cloud Functions, and
Firebase Auth remain in place until their individual migration stages satisfy
the removal checklist.
