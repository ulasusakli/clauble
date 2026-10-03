# Authentication

Cycle 01A implements Supabase Auth email/password flows through Next.js SSR.

## Routes

| Route | Purpose |
| --- | --- |
| `/login` | Email/password login and account-state routing |
| `/signup` | Email/password signup only |
| `/forgot-password` | Neutral recovery request |
| `/auth/check-email` | Confirmation-required state |
| `/auth/confirm` | Narrow token-hash exchange for signup/recovery |
| `/auth/error` | User-safe invalid/expired-link response |
| `/auth/signout` | POST-only logout |
| `/reset-password` | Recovery-session-only password update |
| `/onboarding/profile` | Authenticated Cycle 01B profile completion for a missing Person |
| `/settings/profile` | Active-Person profile and avatar management |
| `/account/restricted` | Minimal non-active Person destination |

## Local configuration

`supabase/config.toml` sets the local site URL to `http://localhost:3000`, allow-lists the confirmation/reset routes, requires email confirmation, and loads templates from `supabase/templates/confirmation.html` and `supabase/templates/recovery.html`.

After Auth config or template changes, restart the stack:

```bash
pnpm supabase:stop
pnpm supabase:start
pnpm supabase:status
```

The status command reports the repository-specific Mailpit URL; do not assume default ports. For this repository the committed local port is `55324`.

## Validation and errors

Shared Zod schemas enforce email shape, the configured six-character local minimum, matching confirmations, and bounded input sizes in both client UX and Server Actions. Raw Supabase errors are not rendered. Login uses a generic incorrect-credentials message; recovery always gives the same success response regardless of account existence.

Passwords, access/refresh tokens, token hashes, cookies, and authorization headers must never be logged or placed in URLs. Input-derived redirects pass through `sanitizeRedirectPath()`.

Next.js development request logging ignores `/auth/confirm` so its required token-hash query parameter is not emitted to the terminal.

## Deployment follow-up

Before Vercel deployment, configure environment-specific site/redirect URLs in hosted Supabase, use production SMTP, review Auth rate limits, and enable hCaptcha or Cloudflare Turnstile for public signup/login/recovery abuse protection. Preview URLs must not inherit Production credentials.

## Current official references

- [Supabase server-side Auth](https://supabase.com/docs/guides/auth/server-side)
- [Creating an SSR client](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Local template configuration](https://supabase.com/docs/guides/local-development/customizing-email-templates)
- [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [CAPTCHA protection](https://supabase.com/docs/guides/auth/auth-captcha)
- [Next.js authentication](https://nextjs.org/docs/app/guides/authentication)
- [Next.js Proxy](https://nextjs.org/docs/app/getting-started/proxy)
