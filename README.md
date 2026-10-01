# Clauble

Clauble is a Next.js App Router application prepared for Supabase and Vercel. Cycles 00A–00B establish the repository and local Supabase workflow only; they intentionally contain no product schema, migrations, authentication flow, Launch, Signals, Workspace, or ranking logic.

## Requirements

- Node.js 22 or newer
- pnpm 10.12.1
- Docker or another Docker-compatible container runtime

## Local setup

```bash
pnpm install --frozen-lockfile
pnpm supabase:start
cp .env.example .env.local
pnpm dev
```

After the stack starts, run `pnpm supabase:status` and copy the local publishable key into `.env.local` as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The local API URL defaults to `http://127.0.0.1:55321`. Never copy the emitted secret, service-role key, JWT secret, or database password into browser environment variables.

The publishable key identifies a public application client; database grants and Row Level Security still protect data. Never place a Supabase secret key or legacy service-role key in a `NEXT_PUBLIC_` variable.

The app shell is available at `/`. The liveness endpoint is `GET /api/health`.

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm verify
```

`pnpm verify` runs linting, type checking, unit tests, a production build, and Playwright smoke tests.

## Local Supabase workflow

The CLI is pinned in this repository. Do not rely on a global installation.

```bash
pnpm supabase:start
pnpm supabase:status
pnpm db:reset
pnpm db:types
pnpm supabase:stop
```

`db:reset` always includes `--local`; it cannot reset a linked remote project. `db:types` generates `src/types/database.generated.ts` from the running local database. Do not edit that file by hand. The Supabase config uses project-specific `5532x` ports so it can coexist with other local Supabase projects.

## Environment isolation

Clauble has four conceptual environments:

1. **Local** is implemented now and uses the repository-managed local Supabase stack.
2. **Development** will use a dedicated hosted Supabase project and credentials.
3. **Preview** will use isolated Vercel Preview configuration and must never silently inherit Production Supabase credentials.
4. **Production** will use an isolated production database and credentials.

Hosted Development, Preview, and Production projects are not configured in Cycle 00B. Their secret or service-role credentials must remain server-only and must never use a `NEXT_PUBLIC_` prefix.

# clauble
