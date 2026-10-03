# Profile completion verification

## Automated inventory

Vitest covers username normalization and syntax, the full reserved set representatives, profile DTO validation, HTTP(S)-only websites, safe database-error mapping, deterministic avatar initials, and onboarding destinations for anonymous, missing, active, and restricted states.

The default Playwright suite verifies anonymous onboarding protection and that invalid public username syntax returns not found before a database lookup.

The opt-in live test exercises the local Auth, Mailpit, application, RLS, and database path:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
CLAUBLE_AUTH_LIVE=1 \
pnpm test:e2e tests/e2e/profile-live.spec.ts --workers=1
```

It signs up and confirms a throwaway user, completes the profile, verifies public anonymous rendering, and verifies in local Postgres that Auth and Person IDs match, status is active, and `profile_completed_at` exists. A second confirmed user attempts the same username and receives only the safe unavailable message. The privileged local database check verifies the result; it is not used to create or authorize the Person.

## Database coverage

The three pgTAP files cover 115 assertions after Cycle 01B. New assertions verify the reserved-name constraint, representative rejected and allowed names, automatic non-null completion timestamps, and denial of authenticated direct INSERT/UPDATE for `profile_completed_at`. Existing grants, RLS, lifecycle visibility, own-ID insertion, and cross-user denial remain covered.

## Manual checks

1. Start local Supabase and obtain API/Mailpit URLs from `pnpm supabase:status` without recording secrets.
2. Sign up, confirm the email in Mailpit, and complete `/onboarding/profile`.
3. Confirm the browser reaches `/u/{username}` and the page is visible in a signed-out window.
4. Revisit onboarding while signed in and confirm it redirects to the existing public profile without modifying it.
5. Attempt a reserved, malformed, and already-owned username and confirm safe field feedback.
6. Mark the throwaway Person non-active through local test administration, then confirm `/u/{username}` returns the same not-found behavior as a missing name while account routing goes to `/account/restricted`.

Never record passwords, token hashes, cookies, email bodies, or local privileged credentials.

## Verified local result on 2026-10-02

- live signup, confirmation, profile creation, canonical URL, idempotent revisit, lifecycle hiding, and duplicate-name Playwright flow: 1 passed
- Vitest: 53 passed across 10 files
- default Playwright: 7 passed; 2 live suites skipped unless enabled
- People pgTAP: 115 passed across 3 files
- clean database reset: passed with the People foundation and profile-completion migrations
- generated type change: only `profile_completed_at` nullability changed as expected; repeated generation was deterministic
- `pnpm verify`: passed
