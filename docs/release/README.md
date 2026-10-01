# Release notes

Release records belong in this directory. Each release should include the source revision, verification results, configuration changes, database migration list, known risks, and rollback notes.

Cycles 00A–00B have no database migrations. Future Vercel environments will require these public application variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Development, Preview, and Production Supabase projects are not configured in Cycle 00B. Preview must not fall back to Production credentials, and any future secret/service-role credential must remain server-only.
