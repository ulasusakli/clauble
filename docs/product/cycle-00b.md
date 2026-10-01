# Cycle 00B: Supabase local foundation

## Goal

Provide a reproducible, version-controlled local Supabase environment without introducing Clauble product schema or authentication behavior.

## Delivered scope

- exact repository dependency on Supabase CLI 2.119.0
- repository-managed `supabase/config.toml`
- local Postgres, Auth, Storage, Realtime, Studio, and supporting services
- explicit local start, stop, status, database reset, and type-generation scripts
- generated TypeScript database types wired into browser and server clients
- documented Local, Development, Preview, and Production isolation model

## Database state

There are no Clauble product migrations, tables, seed records, storage buckets, or RLS policies in this cycle. Local reset recreates only the Supabase-managed schemas. New tables in `public` are not automatically exposed to Data API roles; later cycles must explicitly review grants and RLS together.

## Identity and authorization guardrails

- Future authentication identities come from `auth.users`; Clauble will not duplicate them in an `accounts` table.
- Future public profile data belongs in a separate `people` table referencing `auth.users`.
- Application/server authorization and RLS are complementary boundaries.
- UI visibility, routes, middleware, and proxy checks are not sufficient authorization.
- User-editable metadata, including `raw_user_meta_data`, must not drive authorization.
- Browser and SSR user clients use only the project URL and publishable key. Secret and service-role credentials remain server-only.

## Out of scope

All product tables and features, authentication UI and flows, storage buckets, hosted Supabase projects, project linking, remote migrations, and Vercel deployment remain deferred.

