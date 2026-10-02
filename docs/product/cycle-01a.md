# Cycle 01A: authentication foundation

## Goal

Provide secure email/password authentication and cookie-based server sessions with Supabase Auth and Next.js SSR. Authentication accounts remain separate from public Clauble People.

## Delivered scope

- email/password signup with required email confirmation
- PKCE-compatible token-hash confirmation through `GET /auth/confirm`
- login, POST logout, neutral password recovery, recovery exchange, and password update
- request-scoped browser, server, Route Handler, and Proxy Supabase clients
- `getClaims()` identity checks and Proxy session refresh
- fresh `getUser()` checks for password change and logout boundaries
- centralized account-state resolution through the authenticated user's RLS context
- internal redirect sanitization and safe auth errors
- public Discovery retained at `/`
- minimal profile-required and restricted-account destinations
- repository-managed local confirmation and recovery templates

## Account lifecycle

```text
signup -> confirm email -> authenticated
                         |-- no people row -> /onboarding/profile
                         |-- active person -> /
                         `-- non-active person -> /account/restricted
```

An `auth.users` row without a matching `public.people` row is valid and means profile completion is required. Signup does not insert a Person and no database trigger was added.

## Route classification

Public routes are `/`, `/login`, `/signup`, `/forgot-password`, `/auth/check-email`, `/auth/confirm`, and `/auth/error`. Future `/u/*`, `/c/*`, and `/s/*` routes remain public by contract.

Authentication is required for `/onboarding/profile`. `/reset-password` additionally requires the short-lived recovery marker established by a successful recovery token exchange. `/account/restricted` and POST `/auth/signout` are the minimum restricted-account-safe routes.

## Exclusions

No profile form, username selection, People insertion, OAuth, magic-link login, phone auth, anonymous auth, MFA, passkeys, SSO, account settings, Company, Workspace, hosted Supabase, Vercel, new product table, or migration is included.

## Exit evidence

- local email confirmations remain enabled after Supabase stop/start and database reset
- the only product migration remains `20261001191801_people_foundation.sql`
- pgTAP People tests remain green
- unit, build, Playwright, and live local Auth/Mailpit verification are documented in `docs/qa/authentication-tests.md`
