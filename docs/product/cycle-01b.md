# Cycle 01B: profile completion and public People profile

## Goal

Connect a confirmed Supabase Auth identity to one deliberate Clauble Person and publish the active profile at `/u/{username}`.

## Delivered scope

- authenticated profile completion with username, display name, optional headline, and optional website
- trim-and-lowercase username normalization with the existing 3–30 character contract
- database-enforced static V1 reserved usernames
- authenticated, RLS-bound `people` insert using the verified Auth subject as `people.id`
- database-owned `profile_completed_at`
- idempotent onboarding retry and existing-Person routing
- active-only public People profiles with lowercase canonical URLs
- deterministic initials fallback; no avatar Storage

## Lifecycle

```text
confirmed auth.users without Person
  -> /onboarding/profile
  -> validated INSERT as authenticated user
  -> active Person
  -> /u/{username}
```

If an onboarding response is lost after the insert, a retry detects the existing row and redirects without updating it. A non-active Person always goes to `/account/restricted`.

## Boundaries

No profile editing, avatar upload, Storage bucket, Company, Topic, Signal, social graph, metrics, Workspace, moderation, entitlement, hosted Supabase, or Vercel work is included. `public.people` remains the only Clauble product table.
