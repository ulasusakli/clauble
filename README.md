# Clauble

Clauble is a Next.js App Router application prepared for Supabase and Vercel. Cycle 00A establishes the repository and quality gates only; it intentionally contains no product schema, migrations, Launch, Signals, Workspace, or ranking logic.

## Requirements

- Node.js 22 or newer
- pnpm 10.12.1

## Local setup

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. The publishable key is designed for public clients, but data access must still be protected by database grants and Row Level Security. Never place a Supabase secret key or legacy service-role key in a `NEXT_PUBLIC_` variable.

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

# clauble
