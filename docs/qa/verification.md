# Verification

The repository quality gate is:

```bash
pnpm verify
```

It runs ESLint, strict TypeScript checking, Vitest, a production Next.js build, and Playwright smoke tests. Playwright starts a local server unless `PLAYWRIGHT_BASE_URL` points at an already deployed environment.

The smoke suite verifies the minimal shell at `/` and the liveness response at `/api/health`.

