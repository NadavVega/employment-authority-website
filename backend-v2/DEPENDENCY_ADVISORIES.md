# Backend V2 dependency advisory status

Reviewed on 2026-07-25 with the committed lockfile.

## Current result

- `npm audit --json`: 17 advisories (7 high, 10 moderate, 0 critical).
- `npm audit --omit=dev --json`: 11 advisories (5 high, 6 moderate,
  0 critical).
- `npm audit fix --dry-run --json`: no compatible dependency changes were
  available; the reported advisory set remained unchanged.

## Deferred dependency chains

- Firebase Admin pulls the production `@google-cloud/storage`,
  `google-gax`/`rimraf`/`glob`/`minimatch`, `teeny-request`/`retry-request`,
  `gaxios`, and `uuid` advisories. npm proposes downgrading
  `firebase-admin` from 14.x to 10.3.0, which is not a compatible security
  update for this foundation.
- Drizzle Kit pulls the development-only
  `@esbuild-kit/esm-loader`/`esbuild` advisory. npm proposes downgrading
  `drizzle-kit` from 0.31.x to 0.18.1, which is incompatible with the accepted
  Drizzle baseline and snapshot format.
- Nest CLI pulls the development-only
  `fork-ts-checker-webpack-plugin`/`minimatch`/`brace-expansion` advisory.
  npm proposes downgrading the Nest 11 CLI to 6.8.1, which is incompatible
  with the Nest 11 runtime.

No `npm audit fix --force`, incompatible direct-package downgrade, or
unreviewed transitive override was applied. Re-evaluate these chains when the
upstream Firebase Admin, Drizzle Kit, and Nest CLI releases provide compatible
resolutions.
