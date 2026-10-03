# Cycle 01C: profile management and avatar Storage

## Goal

Complete the People subsystem with authenticated profile editing, an explicit username-change policy, and an owner-protected public avatar lifecycle.

## Delivered scope

- authenticated `/settings/profile` route for active People
- editing for username, display name, headline, bio, and HTTP(S) website
- `updated_at` optimistic concurrency checks for profile and avatar mutations
- immediate username changes under the existing format, reserved-name, and uniqueness constraints
- public `avatars` Storage bucket limited to 1 MiB JPEG, PNG, and WebP objects
- canonical immutable object paths: `{auth-user-id}/{random-uuid}.{jpg|png|webp}`
- `storage.objects` SELECT, INSERT, and DELETE policies requiring both JWT ownership and the actor's folder
- server-side MIME, size, and file-signature validation
- avatar upload, replace, remove, failed-write compensation, and stale-object cleanup
- avatar rendering on settings and public People pages

## Username policy

V1 username changes are immediate. A changed username must pass the same normalization, syntax, reserved-name, and unique-index rules as onboarding. The previous `/u/{username}` becomes unavailable immediately; V1 does not reserve old names, maintain username history, redirect old routes, or impose a cooldown. The settings UI states this consequence before saving.

## Avatar lifecycle

```text
validate file
  -> upload unique owner object (upsert false)
  -> compare-and-set people.avatar_path
      -> failure: remove the new object
      -> success: remove every stale canonical object in the owner folder
```

Removal clears `people.avatar_path` first, then removes owned objects through the Storage API. This ordering never leaves a public profile pointing at an intentionally deleted object. Storage cleanup is best-effort because object storage and Postgres do not share a transaction; a visible warning records a cleanup failure and the next avatar mutation retries folder cleanup.

## Boundaries

No Company, Topic, Launch, Signal, Workspace, moderation, entitlement, image transformation, crop UI, hosted Supabase, or service-role application client is included. `public.people` remains the only Clauble product table.
