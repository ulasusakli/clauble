# Authentication verification

## Automated inventory

Unit tests cover redirect sanitization, form validation, account-state mapping, post-auth destinations, missing-Person behavior, and Proxy propagation of refreshed cookies plus `private/no-store` headers.

Default Playwright tests cover auth form accessibility/client validation, malformed or missing confirmation parameters, anonymous protected-route redirects, and rejection of external `next` values. The live local test is opt-in because it creates throwaway Auth users and requires Supabase plus Mailpit:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
CLAUBLE_AUTH_LIVE=1 \
pnpm test:e2e tests/e2e/auth-live.spec.ts --workers=1
```

The live test covers signup, confirmation-required state, actual Mailpit confirmation email, cookie session establishment, missing-Person routing, logout, login, neutral recovery, actual recovery email, recovery-only reset access, password replacement, old-password rejection, new-password login, signed-in auth-page redirect, and auth/cache response headers. Passwords are generated in memory and never printed.

## Verified local result on 2026-10-02

- live Auth/Mailpit Playwright: 1 passed
- unit suite: 23 passed across 6 files
- regular Playwright suite: 6 passed; live test skipped unless enabled
- People pgTAP: 98 passed across 3 files
- database reset: passed with only `20261001191801_people_foundation.sql`
- generated public database type: no accepted diff

The live confirmation response contained the `@supabase/ssr` private/no-store header and set an Auth cookie. Authenticated dynamic page responses were non-shareable (`no-cache` in Next dev). A deterministic Proxy unit test separately proves that `setAll` refreshed cookies and all cache-prevention headers are propagated.

## Manual procedure

1. Start Supabase, obtain the publishable key from `pnpm supabase:status`, and run the app at `http://localhost:3000`.
2. Create a throwaway account at `/signup`.
3. Confirm the app shows `/auth/check-email` and no Person was created (the successful destination after confirmation must be `/onboarding/profile`).
4. Open the Mailpit URL reported by `pnpm supabase:status`, open the confirmation email, and follow its link.
5. Confirm an Auth cookie exists, the destination is `/onboarding/profile`, then POST logout.
6. Log in with the original password and confirm the same profile-required destination.
7. Request recovery and confirm the neutral response.
8. Follow the recovery email, set a new password, and confirm signout to `/login`.
9. Confirm the old password fails and the new password reaches `/onboarding/profile`.

Never record the throwaway password, token hash, cookie, or email body in test output.
