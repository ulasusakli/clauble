# Profile management and avatar test evidence

## Deterministic gates

Cycle 01C adds unit coverage for:

- profile edit normalization, optional fields, bio length, and concurrency token validation
- safe username-conflict error mapping
- JPEG, PNG, and WebP signatures
- rejected spoofed MIME types, unsupported types, and files over 1 MiB
- canonical owner avatar paths
- anonymous `/settings/profile` routing

The pgTAP suite adds `004_avatar_storage.test.sql`, covering:

- bucket public flag, file-size limit, and MIME allow-list
- exact Storage policy surface and deliberate absence of UPDATE/upsert permission
- `people.avatar_path` owner-folder/path constraint
- owner-only metadata SELECT/INSERT/DELETE behavior
- rejected forged `owner_id`, cross-folder paths, and noncanonical names
- anonymous denial

Run:

```bash
pnpm db:reset
pnpm db:test
pnpm db:types
pnpm verify
git diff --check
```

## Opt-in live lifecycle

With local Supabase, Mailpit, and the application running using the local publishable key:

```bash
CLAUBLE_AUTH_LIVE=1 pnpm test:e2e tests/e2e/profile-live.spec.ts
```

The Cycle 01C live case verifies signup and confirmation, Person creation, profile editing, immediate username-route movement, avatar upload, replacement with one retained object, public rendering, removal, and zero retained avatar objects.

## Expected residual cases

Storage and Postgres do not share a transaction. The live suite proves successful stale-object cleanup, while forced provider-failure compensation is not automated. A provider failure during stale-object deletion can leave a public orphan until the next avatar mutation retries cleanup. Hosted CDN behavior, image transformation, and production abuse controls require deployment-specific verification.
