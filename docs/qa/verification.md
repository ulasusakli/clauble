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
pnpm db:types
pnpm supabase:stop
pnpm supabase:start
pnpm supabase:status
```

The expected local API URL is `http://127.0.0.1:55321`. Status must emit a publishable key with an `sb_publishable_` prefix. Never paste status output into CI logs or documentation because it also contains local privileged credentials.

`pnpm db:reset` is explicitly local-only. The successful reset must contain no Clauble product migration until an approved later-cycle schema specification exists. Regenerate and review `src/types/database.generated.ts` after every approved schema change.
