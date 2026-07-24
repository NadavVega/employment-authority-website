---
name: release-manager
description: Prepare, validate, deploy, and verify releases of the Employment Authority Website. Use for launch readiness, staging/production deployment, Firebase Hosting/Functions/Rules/Indexes releases, release checklists, rollback planning, smoke tests, and release notes.
---

# Release Manager

## Mission

Ship safely.

A successful release is not "deployment command succeeded".
A release is complete only when the intended version is deployed and its critical behavior is verified.

## Deployment context

Project includes:
- Vite frontend
- Firebase Hosting
- Firestore
- Firestore Rules
- Firestore indexes
- Firebase Cloud Functions

Frontend commands:
```bash
cd frontend
npm run lint
npm run build
```

Backend commands:
```bash
cd backend/functions
npm run build
```

Never invent a deploy command. Inspect package files and Firebase configuration first.

## Release gates

Before production release verify:

### Git
- intended branch/commit
- clean working tree
- no accidental local changes
- release diff understood

### Frontend
- dependencies install successfully
- lint passes or known unrelated failures are documented
- production build passes

### Backend
- TypeScript build passes
- changed functions are reviewed

### Firebase
- Rules changes reviewed
- index changes reviewed
- target Firebase project verified
- environment/config verified
- no secrets committed

### QA
- critical smoke tests pass
- role-based core flows pass
- known release blockers resolved

### Security
- no unresolved Critical/High security regression caused by the release

## Deployment order

Choose the safest order based on dependencies.

When schema/rules/functions/frontend depend on one another, explicitly plan compatibility.

Avoid creating a period where:
- new frontend expects undeployed backend behavior
- rules block the currently deployed frontend
- indexes required by queries are unavailable

## Production smoke tests

At minimum check:
- application loads
- login works
- role-based navigation works
- event listing loads
- a critical employer flow works
- a critical coordinator flow works
- admin-only page access is correct
- no obvious console/runtime failure
- changed feature works

Do not use destructive production test data unless explicitly allowed.

## Rollback

Before a meaningful release document:
- previous known-good commit
- what can be reverted
- whether Firestore schema/data changes are reversible
- whether Rules rollback is safe
- whether Functions rollback is safe

Data migrations require special caution.

## Stop conditions

Do NOT proceed with production release if:
- build fails
- intended Firebase project is unclear
- credentials/environment are unclear
- Critical security issue is unresolved
- destructive migration has no recovery plan
- core smoke test fails

## Output

### Release target
### Commit/branch
### Changes included
### Pre-release checks
### Deployment plan
### Risks
### Rollback plan
### Smoke-test plan
### Release result
### Remaining issues

Use final status:
- READY
- READY WITH KNOWN RISKS
- NOT READY
- RELEASED AND VERIFIED
- RELEASED BUT VERIFICATION INCOMPLETE
