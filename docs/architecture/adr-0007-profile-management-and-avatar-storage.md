# ADR 0007: profile management and avatar Storage

- Status: Accepted
- Date: 2026-10-02
- Cycle: 01C

## Context

Active People need safe profile updates and public avatars. Profile fields already use authenticated column privileges and self-only RLS. Storage adds a second persistence system, so ownership, path integrity, replacement, cleanup, and partial failure behavior must be explicit.

## Decision

### Profile mutation and conflict handling

`/settings/profile` is available only to an authenticated active Person. Every Server Action re-verifies the Auth subject with `getClaims()`, resolves current account state through RLS, derives the Person UUID from the verified subject, validates untrusted form data, and writes through the request-scoped authenticated Supabase client. No service-role client is used.

Profile and avatar forms submit the last observed `people.updated_at`. Updates include that value in the database predicate. A zero-row result is a conflict, not success, and the user must refresh before retrying. Database column privileges, self-only RLS, constraints, and the unique username index remain authoritative.

### Username changes

Username changes are immediate in V1. The onboarding normalization, format, reserved-name, and database uniqueness contracts apply without variation. There is no cooldown, history table, alias, old-name reservation, or redirect. This keeps Cycle 01C inside the single `people` table while making the route consequence explicit.

### Bucket and object contract

`avatars` is a public standard bucket because People avatars are public media. Public means object retrieval and CDN serving do not require RLS; it does not grant upload, list, update, move, copy, or delete access.

The bucket accepts only `image/jpeg`, `image/png`, and `image/webp`, with a 1 MiB limit. Application validation checks declared MIME type, size, and leading file signature. Canonical paths are:

```text
{auth-user-id}/{random-uuid}.{jpg|png|webp}
```

`people_avatar_path_format_check` requires `people.avatar_path` to match the row's own UUID folder and canonical filename. The database stores only the relative object path, never a public URL.

### Storage authorization

Three policies are added to Supabase-managed `storage.objects`:

| Operation | Rule |
| --- | --- |
| SELECT | authenticated actor may list only objects whose `owner_id` and first folder equal `auth.uid()` |
| INSERT | bucket is `avatars`; `owner_id`, first folder, and canonical path all match `auth.uid()` |
| DELETE | authenticated actor may delete only objects whose `owner_id` and first folder equal `auth.uid()` |

No UPDATE policy exists. Replacement uploads a new immutable object with `upsert: false`, updates the Person pointer using optimistic concurrency, and then deletes stale objects. This avoids requiring Storage UPDATE permission and prevents CDN-stale overwrites.

`owner_id` is the current ownership field; deprecated `owner` is not used for authorization. Ownership and folder checks are deliberately redundant defense in depth.

### Cross-system failure handling

Storage and Postgres cannot commit atomically. The lifecycle therefore uses compensation:

- if upload fails, `people` is unchanged;
- if the Person compare-and-set fails, the new object is removed;
- after success, all other canonical objects in the owner folder are removed in bounded batches;
- avatar removal clears the Person pointer before object deletion;
- a cleanup failure does not roll back an already-correct Person pointer and is shown as a warning;
- every later upload or removal retries stale-object cleanup.

Objects are deleted only through the Storage API, never by deleting `storage.objects` metadata directly.

## Current guidance consulted

- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage ownership](https://supabase.com/docs/guides/storage/security/ownership)
- [Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Storage schema](https://supabase.com/docs/guides/storage/schema/design)
- [Storage upload limits](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Supabase changelog](https://supabase.com/changelog), reviewed 2026-10-02

## Consequences

- Anyone with a public avatar URL can retrieve it, including an old object until cleanup succeeds or cache expiry occurs.
- Metadata listing and every mutation remain owner-only.
- Old username URLs stop resolving immediately and may later be claimed by another eligible user.
- Cleanup is convergent but not transactionally atomic; a warning and the next mutation provide the retry path.
- Image decoding, dimension checks, cropping, resizing, moderation, and malware scanning are deferred.
