# ADR 0006: profile completion and username model

- Status: Accepted
- Date: 2026-10-02
- Cycle: 01B

## Context

Authentication and public identity are intentionally separate. A confirmed Auth user needs a deliberate, retry-safe way to create exactly their own Person, while public routes need stable names and lifecycle-safe disclosure.

## Decision

### Profile creation

`auth.users` remains canonical for authentication. Profile completion is a Server Action that validates input, verifies the request-scoped JWT with `getClaims()`, resolves account state, and inserts through the same authenticated Supabase client. `people.id` is derived from the verified `sub`; it is never accepted from the form. RLS and the primary key remain authoritative. No service-role client, signup trigger, upsert, profile update, or Auth metadata copy is used.

### Username

Usernames are trimmed and lowercased, then must match `^[a-z0-9_]{3,30}$`. Unsupported internal characters are rejected, not removed. The database uniqueness constraint resolves claim races.

A separate CHECK constraint rejects this static V1 set:

```text
clauble admin administrator moderator support system security staff team official
auth api account accounts settings login logout signup register onboarding
notifications search people person companies company topics signals signal workspace
billing plus www root null undefined me
```

The set is intentionally conservative. Single-letter route namespaces do not require reservation because usernames have a three-character minimum. Changing the list requires a reviewed migration; this is acceptable for V1.

### Completion timestamp

`profile_completed_at` is database-owned: `NOT NULL DEFAULT now()`. The migration backfills any historical null with `created_at`. The authenticated role cannot provide it on INSERT or change it on UPDATE. Ordinary profile changes therefore preserve the original completion event. This refines Cycle 00D, where the column was user-writable.

### Idempotency

Onboarding creates only when account state is `profile_required`. An existing active Person redirects to `/u/{username}` and a non-active Person redirects to `/account/restricted`. On insert error, the action re-resolves account state before returning an error; this recovers from a lost response or concurrent retry without turning onboarding into an update endpoint.

### Public profile

The canonical route is `/u/{lowercase-username}`. A case-only noncanonical route redirects permanently when the lowercased value is syntactically valid. Public queries select explicit public fields and always filter `status = 'active'`, even though RLS also filters visibility. Missing and all non-active states use identical not-found behavior.

## Consequences

Availability hints can never guarantee a username; INSERT remains final. Public profile rendering accepts only HTTP(S) website links. Avatar Storage and profile editing require a later, separately reviewed mutation boundary.
