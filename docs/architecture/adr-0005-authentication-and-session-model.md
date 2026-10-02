# ADR 0005: authentication and session model

- Status: Accepted
- Date: 2026-10-02
- Cycle: 01A

## Context

Clauble needs email/password authentication without coupling Auth account creation to the public `people` lifecycle. Server-rendered routes require verified, request-scoped identity and safe session refresh without treating Proxy as authorization.

## Decision

### Provider and V1 method

Supabase Auth is canonical. V1 supports email/password only and requires email confirmation. OAuth, magic links, phone authentication, anonymous authentication, MFA, passkeys, and SSO are deferred.

### SSR and PKCE

Use `@supabase/ssr` with cookie-based sessions. Signup and recovery emails link to the server-side `/auth/confirm` exchange using `TokenHash`; the Route Handler narrowly accepts `signup` and `recovery`, calls `verifyOtp()`, writes the returned session cookies, and redirects only to a sanitized internal destination.

Every server client is request-scoped. No module-global server Supabase client is permitted.

### Identity verification

- `getClaims()` verifies normal server-rendered identity, protects routes, and drives Proxy refresh/validation.
- `getUser()` requests current Auth-server state for security-sensitive account operations such as password change and logout.
- `getSession()` is reserved for operations that actually need raw access/refresh tokens. A user object loaded from cookie-backed `getSession()` is never authorization proof.

### Proxy and authorization

Next.js Proxy refreshes cookies and may perform coarse anonymous routing. It is not an authorization boundary. Every protected Server Action and Route Handler revalidates its actor, and database reads remain subject to grants and RLS.

### Auth and profile separation

Creating `auth.users` never creates `public.people`. A confirmed user without a Person is sent to `/onboarding/profile`; Cycle 01B owns profile creation. Active People go to `/`; suspended, deactivated, or deleted People go to `/account/restricted`.

### Password recovery

Recovery uses the same token-hash exchange, establishes an authenticated recovery session plus a short-lived HTTP-only marker, validates fresh Auth state with `getUser()`, updates the password with `updateUser()`, then signs out and returns to login.

### Caching

The two-argument `@supabase/ssr` `setAll(cookies, headers)` contract is implemented. Cache-prevention headers supplied when auth cookies change are propagated with those cookies. Authenticated responses are dynamic and Proxy applies private/no-store semantics; no authenticated page uses shared ISR or static caching.

### Secrets

Normal application Auth uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No secret or service-role key is introduced.

## Consequences

The root Discovery route remains public. Proxy provides session continuity but future Server Actions, Route Handlers, Company permissions, and database operations must continue to authorize independently. Hosted redirect URLs, SMTP, CAPTCHA, and Vercel environment configuration require deployment-specific work later.
