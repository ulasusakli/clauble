# People

## Profile completion

Confirmed users without a Person visit `/onboarding/profile`. Required fields are username and display name; headline and website are optional. Username is normalized by trimming outer whitespace and lowercasing. Internal punctuation or spaces remain invalid.

The Server Action performs the same Zod validation as the client, verifies the Auth subject, confirms account state is still `profile_required`, and inserts the Person through the authenticated RLS context. The form never sends a user ID. Raw PostgreSQL or Supabase errors are not shown. A uniqueness conflict becomes `This username is unavailable.`

Profile fields are stored only in `public.people`, never in Auth user metadata.

## Public profile

`/u/{username}` is public. It renders display name, username, and present headline, bio, and safe HTTP(S) website values. Bio can appear because the existing schema supports it, although Cycle 01B does not collect it. An initials avatar is deterministic until Cycle 01C adds Storage.

The query explicitly requires `status = 'active'`. Suspended, deactivated, deleted, and missing profiles all return the same not-found response, including when the visitor owns the non-active row. When `avatar_path` is present, the page renders its public `avatars` bucket object; otherwise it uses deterministic initials.

## Profile management

Active People manage username, display name, headline, bio, website, and avatar at `/settings/profile`. Every mutation derives the actor from verified Auth claims, rechecks active account state, validates input on the server, writes through the authenticated RLS context, and compares the submitted `updated_at` value to prevent silent lost updates.

Username changes are immediate and reuse the onboarding contract. The old route does not redirect and is not reserved. Unique-index races return the same safe unavailable message used during onboarding.

## Avatars

The public `avatars` bucket accepts at most 1 MiB JPEG, PNG, or WebP files. Files use immutable `{user-id}/{uuid}.{ext}` paths. Storage policies require both `owner_id` and the first path folder to match `auth.uid()` for metadata reads, uploads, and deletes. There is no object UPDATE policy and the app never uses upsert.

Replacement uploads a new object, compare-and-sets `people.avatar_path`, compensates by removing the new object on a failed database update, and removes stale canonical objects after success. Removal clears the Person pointer before deleting owned objects. Cleanup failures are visible and retried by the next avatar mutation.

## Routing

| Account state | `/onboarding/profile` result |
| --- | --- |
| Anonymous | `/login?next=/onboarding/profile` |
| Missing Person | Render completion form |
| Active Person | `/u/{username}` |
| Non-active Person | `/account/restricted` |

The same account-state destinations apply to `/settings/profile`, except an active Person remains on settings rather than redirecting to the public profile.

Public uppercase username paths redirect to lowercase only if the normalized path still matches the username syntax.
