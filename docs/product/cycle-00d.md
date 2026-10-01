# Cycle 00D: database foundation — People

## Goal

Implement the first production-quality Clauble product migration with exactly one application table: `public.people`.

## Delivered scope

- `public.person_status` enum: `active`, `suspended`, `deactivated`, `deleted`
- `public.people` with `people.id = auth.users.id`
- explicit `ON DELETE RESTRICT` identity retention
- username, profile-length, uniqueness, and lifecycle constraints
- automatic database-managed `created_at` and `updated_at`
- explicit table/column grants for `anon`, `authenticated`, and `service_role`
- four operation-specific RLS policies
- transactional pgTAP coverage for schema, grants, constraints, and RLS behavior
- generated TypeScript database types

## Public visibility

Anonymous and authenticated users may read active People. An authenticated user may additionally read their own Person row in any lifecycle state. Another user cannot read a suspended, deactivated, or deleted Person.

## Mutations

An authenticated user may create only the Person row whose `id` equals `auth.uid()`. They may insert or update only the approved profile columns. Column privileges prevent direct writes to `status`, `created_at`, and `updated_at`, and prevent updating `id`; RLS independently restricts the affected row to the actor.

No ordinary user can physically delete a Person. Lifecycle state represents removal/deactivation; future hard-deletion and retention are platform workflows.

## Out of scope

No Company, Topic, Location, membership, panel access, invitation, audit, Signal, interaction, follow, job, notification, moderation, entitlement, ranking, Storage, Auth UI, profile UI, Vercel, or hosted-project work is included.

## Migration

The repository-pinned CLI created:

```text
supabase/migrations/20261001191801_people_foundation.sql
```

The migration contains the type, table, constraints, trigger function, trigger, grants, RLS enablement, and all policies as one reviewable security unit.
