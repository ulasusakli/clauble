# ADR 0002: Supabase development workflow

- Status: Accepted
- Date: 2026-10-01
- Cycle: 00B

## Context

Clauble will use Supabase Postgres, Auth, and Storage. Database behavior affects application types, authorization, and deployed environments, so dashboard-only or production-first changes would be difficult to reproduce and unsafe to review. A local-first workflow is required before product schema work begins.

## Decision

- Use Supabase Postgres, Auth, and Storage through a repository-pinned CLI and repository-managed local configuration.
- Treat `auth.users` as the future identity source. Do not create a duplicate application `accounts` identity table; future public profile data will live in `people` and reference `auth.users`.
- Introduce schema changes only through version-controlled migrations created with the documented Supabase CLI workflow after an approved specification. Cycle 00B contains no product migration.
- Require explicitly reviewed grants and Row Level Security for every table in an exposed schema. RLS is a mandatory second authorization boundary, complementing trusted application/server authorization rather than replacing it.
- Never base authorization solely on frontend visibility, routes, middleware, or proxy checks, and never use user-editable JWT metadata such as `raw_user_meta_data` for authorization.
- Generate and commit TypeScript database types from the local schema. Regenerate and review them whenever an approved migration changes the schema.
- Isolate Local, hosted Development, Vercel Preview, and Production. Preview must never silently target Production, and Production credentials and data remain isolated.
- Use publishable keys for browser and user-scoped SSR clients. Secret/service-role credentials never use a `NEXT_PUBLIC_` prefix and never enter client bundles.

## Rejected alternatives

- **Dashboard-only schema management:** changes are not reproducible or reviewable from repository state.
- **Production-first development:** experimentation could affect production data and users.
- **Unversioned SQL changes:** schema history, reset reproducibility, and code review would be lost.
- **Frontend-only authorization:** hidden controls and route guards can be bypassed and do not protect database rows.
- **A globally installed, unpinned CLI as the repository contract:** developer and CI behavior would drift across machines and time.

## Consequences

- Every future migration requires a reviewed specification, CLI-created migration file, migration diff review, local reset verification, and applicable RLS tests.
- Schema changes require regeneration and review of `src/types/database.generated.ts`.
- Developers need Docker or a compatible runtime and must use the repository scripts.
- Environment owners must manage separate URLs, publishable credentials, server-only secrets, and data for Development, Preview, and Production.
- Local stack checks remain separate from `pnpm verify` because the ordinary frontend gate must not require Docker.
- New exposed-schema objects remain inaccessible until grants and RLS are intentionally reviewed and added.

