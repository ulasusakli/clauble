# ADR 0004: People data model

- Status: Accepted
- Date: 2026-10-01
- Cycle: 00D

## Context

Clauble needs a public identity row without duplicating Supabase Auth credentials or weakening lifecycle controls. Cycle 00C left three People-specific choices open: suspended visibility, safe profile mutation, and exposed schema strategy.

## Decision

### Identity and referential action

`public.people.id` is both the primary key and a foreign key to the primary key `auth.users.id`. The same UUID is the authentication identity and Person identity; there is no application account identifier or `accounts` table.

The foreign key uses `ON DELETE RESTRICT`, not `CASCADE`. Deleting an Auth identity while a Person exists fails instead of silently erasing public identity/history. Future account erasure must explicitly coordinate Auth removal, Person lifecycle/retention, and dependent records. `deleted` is currently a lifecycle state, not SQL deletion.

### No signup trigger

Auth signup does not automatically create a Person. A future Cycle 01 profile-completion workflow will insert `people.id = auth.uid()`. This avoids coupling Auth availability to profile/business validation and avoids a failing database trigger blocking signup. The RLS INSERT policy permits only the actor's own UUID.

### Public schema

V1 continues to use the exposed `public` schema rather than introducing a dedicated `api` schema for one table. The boundary remains safe through `auto_expose_new_tables = false`, explicit grants, RLS, constraints, and application validation. A dedicated API schema can be reconsidered if the exposed surface becomes difficult to audit.

### Profile lifecycle and visibility

`public.person_status` is a database enum with:

```text
active
suspended
deactivated
deleted
```

New rows default to `active`. Ordinary authenticated users cannot supply or change `status`. All lifecycle states retain the physical row. Anonymous and authenticated public reads include only `active` People; an authenticated owner may still read their own non-active row. Hard-deletion/retention remains a future privileged platform operation.

### Mutation security

Safe direct Data API profile mutation uses three database layers:

1. Column INSERT/UPDATE privileges restrict which fields can appear in the statement.
2. RLS restricts creation and update to `(select auth.uid()) = id` using `WITH CHECK` for the resulting row.
3. Constraints enforce canonical usernames, uniqueness, required fields, lengths, and valid lifecycle values.

The primary key indexes owner lookups, the username unique constraint supplies its ordinary unique index, and `people_status_idx` supports active-profile RLS filtering.

Application/server validation remains an additional usability and business-validation layer. It is not the security boundary.

Generated TypeScript types describe the physical row shape and defaults, not role-specific grants. They therefore include platform-controlled fields in generic `Insert`/`Update` shapes; application code must use narrower input types, while Postgres column privileges remain the authoritative enforcement layer.

Authenticated INSERT columns are `id`, `username`, `display_name`, `headline`, `bio`, `avatar_path`, `website_url`, and `profile_completed_at`. Authenticated UPDATE columns are the same except `id`. Authenticated users have no DELETE privilege and cannot write `status`, `created_at`, or `updated_at`.

### Timestamps

`created_at` and `updated_at` default to `now()`. A reusable, security-invoker `public.set_updated_at()` trigger function assigns `statement_timestamp()` before updates. It uses an empty `search_path`, requires no elevated privileges, and direct EXECUTE is revoked from Data API roles. The trigger can update `updated_at` even though ordinary users cannot name that column in an UPDATE statement.

### Grants and RLS

- `anon`: table-level SELECT only, constrained to active rows by RLS.
- `authenticated`: table-level SELECT, column-level INSERT/UPDATE, no DELETE.
- `service_role`: explicit SELECT/INSERT/UPDATE/DELETE for future platform-internal work; it is not introduced into application code and its RLS-bypass behavior requires a trusted, authorized workflow.
- enum USAGE: `anon`, `authenticated`, and `service_role`.

Policies:

| Policy | Operation / role | Predicate |
| --- | --- | --- |
| `people_select_active` | SELECT to `anon`, `authenticated` | `status = 'active'` |
| `people_select_own` | SELECT to `authenticated` | `(select auth.uid()) = id` |
| `people_insert_own` | INSERT to `authenticated` | `WITH CHECK (select auth.uid()) = id` |
| `people_update_own` | UPDATE to `authenticated` | matching `USING` and `WITH CHECK` on actor UUID |

There is no DELETE policy.

## Current guidance consulted

- [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Column Level Security](https://supabase.com/docs/guides/database/postgres/column-level-security)
- [User data and `auth.users` references](https://supabase.com/docs/guides/auth/managing-user-data)
- [Database testing](https://supabase.com/docs/guides/database/testing)
- [Generated TypeScript types](https://supabase.com/docs/guides/api/rest/generating-types)
- [Supabase changelog](https://supabase.com/changelog), reviewed 2026-10-01

## Consequences

- Profile completion can use the publishable-key client without a privileged server credential, while database permissions remain authoritative.
- A client restricted by column privileges must name selected/mutated columns rather than assuming every future column is writable.
- Auth deletion must be an explicit coordinated workflow because the People foreign key intentionally blocks it.
- Reserved usernames are not yet implemented and remain an open product decision.
