# Verification

The repository quality gate is:

```bash
pnpm verify
```

It runs ESLint, strict TypeScript checking, Vitest, a production Next.js build, and Playwright smoke tests. Playwright starts a local server unless `PLAYWRIGHT_BASE_URL` points at an already deployed environment.

The default browser suite verifies the public shell, liveness, auth form behavior, safe confirmation failures, protected-route redirects, redirect sanitization, and invalid public-profile route handling.

Cycle 01A adds an opt-in live local Auth/Mailpit test documented in `authentication-tests.md`. Cycle 01B adds an opt-in complete identity-to-Person test documented in `profile-completion-tests.md`. Cycle 01C extends that live suite with profile editing and the complete avatar upload/replace/delete lifecycle, documented in `profile-management-tests.md`. Run them only with the local Supabase stack and an explicitly configured app; the default `pnpm verify` remains deterministic without creating Auth users.

## Local Supabase verification

These checks require Docker and are intentionally separate from the frontend-only `pnpm verify` gate:

```bash
pnpm supabase:start
pnpm supabase:status
pnpm db:reset
pnpm db:test
pnpm db:types
pnpm supabase:stop
pnpm supabase:start
pnpm supabase:status
```

The expected local API URL is `http://127.0.0.1:55321`. Status must emit a publishable key with an `sb_publishable_` prefix. Never paste status output into CI logs or documentation because it also contains local privileged credentials.

`pnpm db:reset`, `pnpm db:test`, and `pnpm db:types` are explicitly local-only. Database tests live under `supabase/tests/database` and run transactionally with pgTAP. Regenerate and review `src/types/database.generated.ts` after every approved schema change.

Cycle 00D introduces the first product table, `public.people`. Cycle 01B adds only People constraints and grants in a second migration. Cycle 01C adds a People path constraint, one public Storage bucket, and owner policies on Supabase-managed `storage.objects`; it creates no product table. A clean reset must reproduce all migrations, the pgTAP suite must pass after reset, and a second reset/type-generation cycle must produce no unexpected type drift.
