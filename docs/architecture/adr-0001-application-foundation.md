# ADR 0001: application foundation

- Status: Accepted
- Date: 2026-10-01
- Cycle: 00A

## Context

Clauble needs a conservative web foundation that can deploy to Vercel and later use Supabase without exposing privileged credentials or prematurely fixing a product data model.

## Decision

- Use Next.js 16 App Router, React, strict TypeScript, pnpm, Tailwind CSS, and ESLint.
- Keep browser and server Supabase client factories in separate modules.
- Use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for these user-scoped clients.
- Validate environment inputs before client creation and never include their values in validation errors.
- Do not add a secret/service-role client in this cycle.
- Use Vitest and Testing Library for unit/component tests and Playwright for browser/API smoke tests.
- Keep health reporting independent of Supabase so it measures application liveness rather than external dependency readiness.

## Consequences

Future data access must add generated database types, grants, RLS policies, and authorization checks from an approved specification. Authentication-related cookie refresh or request interception is deliberately deferred; a proxy or UI check must never become the sole authorization boundary.

