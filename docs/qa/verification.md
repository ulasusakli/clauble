# Verification

The repository quality gate is:

```bash
pnpm verify
```

It runs ESLint, strict TypeScript checking, Vitest, a production Next.js build, and Playwright smoke tests. Playwright starts a local server unless `PLAYWRIGHT_BASE_URL` points at an already deployed environment.

The smoke suite verifies the minimal shell at `/` and the liveness response at `/api/health`.

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

Cycle 00D introduces the first product migration and only the `public.people` application table. A clean reset must reproduce it, the pgTAP suite must pass after reset, and a second reset/type-generation cycle must produce no unexpected type drift.
