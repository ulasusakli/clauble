# Clauble agent guide

These rules apply to the entire repository.

## Before changing code

1. Read the relevant product specifications in `docs/product`, architecture decisions in `docs/architecture`, and feature notes in `docs/features`.
2. Inspect `git status` and preserve unrelated user changes.
3. Confirm the requested cycle and keep the change inside its documented scope.

## Change discipline

- Make small, reviewable, narrowly scoped changes.
- Do not implement future-cycle features opportunistically.
- Do not invent database migrations or migration history. Create migrations only from an approved specification and with the Supabase CLI workflow documented for that cycle.
- Before any Supabase CLI operation, inspect the relevant command's current syntax with `supabase --help`, `supabase <group> --help`, or `supabase <group> <command> --help`.
- Pin dependency versions and commit the pnpm lockfile.

## Security

- Never commit, print, or log secrets, tokens, service-role keys, secret keys, environment values, or credentials.
- Browser code may use only the Supabase project URL and publishable key. Never expose a Supabase secret or legacy service-role key to the client.
- UI state, hidden controls, middleware, and Next.js proxy checks are not authorization boundaries. Enforce authorization in trusted server code and with database grants and Row Level Security as appropriate.
- Treat all client input as untrusted. Do not use user-editable metadata for authorization.

## Verification

Run the checks appropriate to the change. For repository changes, the default is:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

Prefer `pnpm verify` when the complete suite is practical. Report commands, failures, skipped checks, residual risks, and the next safe step.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
