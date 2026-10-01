# Cycle 00A: repository foundation

## Goal

Establish a production-quality Next.js 16 App Router repository that is ready for Supabase and Vercel without implementing product behavior.

## In scope

- TypeScript, pnpm, Tailwind CSS, and ESLint
- pinned Supabase browser/SSR dependencies
- explicit browser and server Supabase client factories using a publishable key
- typed public environment validation
- Vitest, Testing Library, and Playwright smoke coverage
- a minimal Clauble shell and `GET /api/health`
- repository guidance and quality gates

## Out of scope

- database schemas, product tables, seed data, and migrations
- authentication flows and authorization policies
- Launch, Signals, Workspace, and ranking
- product navigation or placeholder product screens

Cycle 00B must define and review its database specification before any migration is created.

