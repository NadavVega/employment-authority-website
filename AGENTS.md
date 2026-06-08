# AGENTS.md

## Project overview

This repository contains a web application with a frontend located in `frontend/`.

The frontend appears to be a React + Vite project that uses Firebase/Firestore for authentication and data storage.

Codex should work carefully, make small focused changes, and avoid broad refactors unless explicitly requested.

## Repository layout

Important paths:

* `frontend/` — main frontend application
* `frontend/src/` — frontend source code
* `frontend/src/App.jsx` — route definitions
* `frontend/src/pages/` — page-level components
* `frontend/src/components/` — reusable UI components
* `frontend/src/features/` — feature-specific UI/modules
* `frontend/src/services/` — service/data-access layer when available
* `frontend/src/components/events/event-form.jsx` — event form logic
* `frontend/src/pages/event-page.jsx` — event display/approval logic
* `frontend/src/pages/edit-event-page.jsx` — event editing page
* `frontend/src/features/slide-bar/slide-bar-menu.jsx` — sidebar navigation

## Working directory rules

Most frontend commands should be run from:

```bash
cd frontend
```

Before making changes, inspect the relevant files first.

Before editing, check current git state:

```bash
git status
```

Do not overwrite unrelated user changes.

## Commands

Use these commands when relevant:

```bash
cd frontend
npm install
npm run build
npm run lint
npm run dev
```

Validation priority:

1. Run `npm run build` after functional frontend changes.
2. Run `npm run lint` when editing React components, hooks, routes, or services.
3. If lint already fails before the task, fix only lint issues directly related to the requested task unless asked otherwise.

## General coding rules

* Prefer small, focused diffs.
* Do not refactor unrelated files.
* Do not rename files or components unless necessary.
* Keep existing UI/UX behavior unless the task explicitly asks to change it.
* Preserve existing styling conventions.
* Prefer readable code over clever code.
* Avoid adding new dependencies unless explicitly approved.
* Avoid large architectural rewrites unless the task is specifically a refactor task.
* When a file is very large, make the smallest safe change instead of restructuring the whole file.

## React rules

* Always obey React hook rules.
* All hooks must be declared before conditional returns.
* Do not call hooks inside conditions, loops, nested functions, or after early returns.
* Prefer extracting helper functions outside components when it improves clarity.
* Keep component state minimal and close to where it is used.
* Avoid duplicating data-loading logic across components when a service already exists.

## Firebase and security rules

Security is critical.

Never place real secrets or credentials in frontend code.

Do not add or preserve:

* real passwords
* shared demo passwords
* private API keys
* service account keys
* admin credentials
* secret tokens

Firebase client config values may be public in a frontend app, but real user credentials must never be shipped in the client bundle.

Do not move secrets from source code into frontend `.env` files as a security fix, because frontend environment variables are still bundled into client-side code when used by the app.

If credentials are found in the frontend:

1. Remove them from client code.
2. Preserve normal manual login behavior.
3. Recommend rotating/changing the exposed credentials if they were ever committed or deployed.

Firestore security rules must enforce authorization. Frontend checks are useful for UX but are not sufficient security.

For authorization-sensitive changes:

* Check both frontend guards and Firestore rules when possible.
* Do not rely only on hiding buttons or routes.
* Make sure direct URL access does not bypass the intended permission model.
* Coordinators should not edit events they do not own unless the app has a clearly defined admin/superadmin role that allows it.

## Event workflow rules

The event status model must be consistent across the app.

Avoid hardcoded duplicate status strings such as:

* `pending`
* `pending_approval`
* `published`
* `approved`
* `rejected`

Prefer one centralized status constant/enum and use it everywhere.

Suggested status values:

```js
pending_approval
approved
rejected
```

When working on event creation, approval, or filtering:

* Ensure new events get the correct initial status.
* Ensure approval UI filters use the same status values.
* Ensure status transitions are explicit and consistent.
* Do not rename Firestore fields unless explicitly required.

## Routing rules

When editing navigation:

* Compare sidebar links with routes in `frontend/src/App.jsx`.
* Do not add links to routes that do not exist.
* Do not leave users with an empty app shell.
* Prefer adding a simple not-found route for unknown paths if one does not exist.
* Do not redesign the sidebar unless explicitly requested.

## Data-access rules

Services are preferred for Firebase/Firestore access when they already exist.

Avoid spreading Firebase queries directly inside UI components.

When making a small bug fix, do not perform a large service-layer migration unless asked.

When adding new data access:

* Prefer using or extending existing services.
* Keep query mapping and error behavior consistent.
* Keep UI components focused on rendering and interaction.

## TypeScript rules

The project may contain `.ts` and `.tsx` files, but TypeScript architecture may be incomplete.

Do not migrate JavaScript files to TypeScript unless explicitly requested.

Do not introduce a broad TypeScript setup unless the task is specifically about TypeScript architecture.

If editing TypeScript files:

* Keep types simple.
* Avoid using `any` unless there is no practical alternative.
* Do not create project-wide type changes unless requested.

## Testing rules

If tests exist, run the relevant tests.

If no meaningful tests exist, do not invent a full test architecture unless requested.

For risky authorization, routing, or event workflow changes, suggest the minimal tests that should be added.

## Task behavior

For every task:

1. Restate the goal briefly.
2. Inspect relevant files before editing.
3. Make the smallest safe change.
4. Run the relevant validation command.
5. If validation fails, fix only issues related to the task.
6. Provide a final summary with:

   * files changed
   * what changed
   * validation command run
   * any remaining warnings or risks

## Planning rules

For complex tasks, do not edit immediately.

First provide a short plan listing:

* files to inspect
* expected change areas
* risks
* validation commands

Complex tasks include:

* authentication changes
* authorization changes
* Firestore security rules
* event status/workflow changes
* routing changes
* large component refactors
* dependency changes

## Current known issues

The frontend scan found these issues:

1. Hardcoded demo credentials in `frontend/src/pages/login-page.jsx`.
2. Event editing authorization guard commented out in `frontend/src/pages/edit-event-page.jsx`.
3. Inconsistent event status values across event creation and approval filtering.
4. React hook-order violations in:

   * `frontend/src/components/events/event-form.jsx`
   * `frontend/src/pages/content-management-page.jsx`
5. Sidebar links pointing to nonexistent routes.
6. Firebase access is spread across UI components even though services exist.
7. TypeScript files exist without a clear TypeScript architecture.
8. Some core pages are very large and should not be broadly refactored unless requested.
9. There is no meaningful frontend test suite yet.

## Priority order

When multiple issues are present, prioritize:

1. Security issues
2. Authorization issues
3. Runtime correctness issues
4. Build/lint issues
5. Routing bugs
6. Data-access cleanup
7. TypeScript architecture
8. Large refactors
9. Tests

## Do not do

Do not:

* expose credentials
* add frontend-stored passwords
* weaken authorization rules
* silence lint errors without fixing the cause
* make broad formatting-only diffs
* change unrelated files
* introduce new dependencies without approval
* convert the whole project to TypeScript without approval
* refactor large monolith files unless the task specifically asks for it
* assume frontend guards are sufficient security

## Definition of done

A task is done only when:

* the requested behavior is fixed
* the change is focused
* no unrelated files were modified
* `npm run build` succeeds, unless the task is documentation-only
* `npm run lint` is run for React/component changes when practical
* remaining warnings or pre-existing failures are clearly reported
* the final response includes a clear diff summary
