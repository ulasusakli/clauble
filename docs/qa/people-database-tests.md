# People database tests

Cycles 00D, 01B, and 01C maintain raw pgTAP tests under `supabase/tests/database/`. Each file runs inside `BEGIN`/`ROLLBACK`; no fixture data survives.

Run locally:

```bash
pnpm supabase:status
pnpm db:reset
pnpm db:test
```

`db:test` expands to `supabase test db --local supabase/tests/database`, so it cannot silently target a linked remote project.

## Test inventory

### `001_people_schema.test.sql`

- exact table and column inventory, types, and lifecycle/timestamp defaults
- primary key, `auth.users` foreign key, and policy-filter index
- `ON DELETE RESTRICT`, username uniqueness, syntax and reserved-name checks, and lifecycle enum
- non-null database default for `profile_completed_at`
- RLS enabled and exactly four named policies
- effective `anon`, `authenticated`, and `service_role` table/column privileges, including denial of authenticated completion-timestamp writes
- timestamp trigger existence, invoker security, and revoked direct execution

### `002_people_constraints.test.sql`

- valid usernames, including 3- and 30-character boundaries
- uppercase, short, long, dashed, spaced, and `@` usernames rejected
- duplicate username rejected
- representative reserved usernames rejected while normal names remain accepted
- profile completion timestamp set automatically
- missing, empty, and overlong display names rejected
- overlong headline and bio rejected
- Auth deletion cannot cascade through an existing Person

### `003_people_rls.test.sql`

- anonymous active-only visibility and write denial
- authenticated cross-user active read and own read
- own-only INSERT and UPDATE
- cross-user INSERT/UPDATE denial
- ordinary DELETE denial
- suspended owner can read self while another user and anon cannot
- direct writes to lifecycle and all database-managed timestamp columns denied
- `id` mutation denied
- allowed profile update automatically advances `updated_at`

### `004_avatar_storage.test.sql`

- public `avatars` bucket, one MiB limit, and exact MIME allow-list
- exact owner SELECT/INSERT/DELETE policy surface and deliberate absence of object UPDATE
- canonical `people.avatar_path` owner-folder constraint
- matching `owner_id` and first-folder enforcement
- forged ownership, cross-folder, noncanonical-name, and anonymous denial
- owner metadata visibility and deletion behavior using the same delete guard as the Storage API

## Expected result

The suite contains 143 assertions across four files after Cycle 01C. A migration is incomplete unless a reset followed by this suite succeeds.
