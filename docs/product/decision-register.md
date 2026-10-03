# Product decision register

Status values are `ACCEPTED`, `OPEN`, and `SUPERSEDED`. This register records product-level consequences; implementation still requires a cycle-specific specification.

| ID | Status | Decision | Consequence / open question |
| --- | --- | --- | --- |
| C00C-001 | ACCEPTED | Supabase `auth.users` is the canonical authentication identity. | Do not create a duplicate `accounts` table. |
| C00C-002 | ACCEPTED | `people` is the public Clauble identity and normally uses the same UUID as `auth.users.id`. | Authentication identity and public Person lifecycle remain related but separate. Public route: `/u/{username}`. |
| C00C-003 | ACCEPTED | Company public route is `/c/{slug}`. | Slug rules and rename/redirect behavior require a later feature specification. |
| C00C-004 | ACCEPTED | Signal public route is `/s/{snowflake-id}`. | The exact snowflake generator and collision/availability design are deferred. |
| C00C-005 | ACCEPTED | Every V1 Signal is Company-owned and has a Person author. | Published Signals require `company_id` and `author_person_id`; departures never erase authorship. No personal Signals in V1. |
| C00C-006 | ACCEPTED | Public Company membership and private panel authorization are independent. | Never create a generic `company_users` table or infer one role system from the other. |
| C00C-007 | ACCEPTED | Public roles are `Founder` and `Member`. | Public role grants zero panel permissions. |
| C00C-008 | ACCEPTED | Panel roles are `Owner`, `Admin`, `Editor`, and `Analyst`; absence of an active access row means `None`. | Do not persist `None` as a role value. |
| C00C-009 | ACCEPTED | A Company has exactly one active Owner in V1. | Launch creates Founder + Owner for the launching Person. Transfer is explicit, audited, and safely serialized. An Owner cannot leave or be revoked until ownership is transferred. No multiple simultaneous Owners. |
| C00C-010 | ACCEPTED | Only Owner may assign or revoke Admin; Admin may manage Editor and Analyst but may not assign another Admin. | Admin cannot self-escalate, alter Owner, or transfer ownership. |
| C00C-011 | ACCEPTED | Editor cannot edit the Company profile in V1. | `company.edit_profile` belongs to Owner and Admin only. |
| C00C-012 | ACCEPTED | Invitations are separate from membership and panel access. | `company_invitations` uses pending/accepted/declined/revoked/expired; V1 targets existing People only. |
| C00C-013 | ACCEPTED | Company authorization comes from database-current `company_panel_access`, not user-editable metadata or Company-role JWT arrays. | Revocation and suspension must take effect without waiting for token refresh. Coarse global platform claims would require a future ADR. |
| C00C-014 | ACCEPTED | New database objects receive no automatic Data API exposure. | Every migration specification must state grants, RLS, and all four operation policies; default is no access. |
| C00C-015 | ACCEPTED | Trusted application authorization, Postgres grants, RLS, and constraints/transactions form defense in depth. | UI visibility, routes, middleware, `TO authenticated`, and privileged credentials are not substitutes for authorization. |
| C00C-016 | ACCEPTED | Topics are a canonical, platform-controlled taxonomy in V1. | Companies may choose active Topics; creation and merge remain admin-controlled. |
| C00C-017 | ACCEPTED | Premium entitlements must never modify organic ranking. | Paid capabilities and ranking inputs must remain structurally separate. |
| C00C-018 | ACCEPTED | Historical public memberships and Signal authorship are retained. | Leaving/removal changes lifecycle state; it does not physically delete history. |
| C00C-019 | ACCEPTED | `invitation.view` and `invitation.manage` are additional canonical permissions. | Owner and Admin receive them; invitation workflows do not rely on incidental membership/access permissions. |
| C00C-020 | ACCEPTED | Non-active People are excluded from public visibility; an authenticated user may still read their own Person row. | Suspended, deactivated, and deleted rows remain hidden from other users while future account/status UI can inspect the owner's state. |
| C00C-021 | ACCEPTED | Safe direct Data API profile mutation uses database column privileges plus RLS; application/server validation remains an additional layer. | Authenticated users can write only approved profile columns and only their own row. |
| C00C-022 | ACCEPTED | Use the `public` schema for V1 product tables with explicit grants and RLS. | Reconsider a dedicated `api` schema if API surface complexity makes `public` difficult to audit. |
| C00C-023 | OPEN | What are the exact global platform roles, scopes, and approval rules for Moderator, Membership Admin, and Super Admin? | Actor scenarios are specified, but no platform-admin tables or bypass mechanism are approved. |
| C00C-024 | OPEN | Which structurally valid public-role + panel-role combinations will V1 UX allow? | The data model permits combinations such as Founder + None and Member + Admin; workflows may present a narrower set. |
| C00C-025 | OPEN | What are invitation expiry duration, resend behavior, and uniqueness rules for multiple pending invitations? | Security invariants are frozen; timing and UX are deferred. |
| C00C-026 | OPEN | Are Signal drafts and revisions one table or separate tables? | The conceptual ERD includes `signal_revisions`; a Signal migration specification must settle physical storage. |
| C00C-027 | OPEN | What are Company suspension and deletion retention/public-visibility semantics? | Mutations are denied while suspended; read/tombstone and archival behavior need product approval. |
| C00D-001 | SUPERSEDED | Which usernames are reserved for routes, system identities, brands, or abuse prevention? | Closed by C01B-001 with a database-enforced static V1 set. |
| C01A-001 | ACCEPTED | V1 authentication uses email and password only. | OAuth, magic links, phone auth, anonymous auth, passkeys, SSO, and MFA are deferred. |
| C01A-002 | ACCEPTED | Email confirmation is required. | Local Auth models production with repository-managed PKCE token-hash templates. |
| C01A-003 | ACCEPTED | SSR uses `@supabase/ssr` cookie sessions and PKCE-compatible email exchanges. | Server clients are request-scoped; Proxy refreshes sessions but is not authorization. |
| C01A-004 | ACCEPTED | Auth account creation does not create a Person. | `auth.users` may exist without `public.people`; Cycle 01B owns profile creation. |
| C01A-005 | ACCEPTED | Post-auth routing is missing Person to `/onboarding/profile`, active Person to `/`, and non-active Person to `/account/restricted`. | Account state is read through the authenticated user's RLS context. |
| C01A-006 | ACCEPTED | OAuth and MFA are deferred beyond Cycle 01A. | Deployment abuse controls and later authentication methods require separate specifications. |
| C01B-001 | ACCEPTED | Reserved usernames use a conservative static V1 set enforced by a database CHECK constraint. | Changes require a reviewed migration; availability hints never replace the final unique INSERT. |
| C01B-002 | ACCEPTED | A Person is created deliberately after authentication and email confirmation. | There is no signup trigger; onboarding derives `people.id` from the verified Auth subject and inserts through RLS. |
| C01B-003 | ACCEPTED | `profile_completed_at` is database-controlled, non-null, and immutable to ordinary authenticated users. | The database supplies the first completion time; profile edits cannot reset it. This refines Cycle 00D grants. |
| C01B-004 | ACCEPTED | The canonical public Person route is `/u/{username}` with lowercase usernames. | Safe case-only noncanonical paths redirect to the canonical route. |
| C01B-005 | ACCEPTED | Only active People render publicly. | Missing, suspended, deactivated, and deleted profiles share not-found behavior; moderation state is not disclosed. |
| C01C-001 | ACCEPTED | Active People edit approved public fields through authenticated Server Actions with `updated_at` optimistic concurrency. | Lost updates return a refresh-and-retry conflict; column privileges, RLS, and constraints remain authoritative. |
| C01C-002 | ACCEPTED | V1 username changes are immediate and reuse the onboarding contract. | There is no cooldown, history, alias, old-name reservation, or redirect; the old route becomes unavailable immediately. |
| C01C-003 | ACCEPTED | People avatars use a public `avatars` bucket with immutable owner-folder paths. | Public serving bypasses read authorization, but metadata listing and all mutations require authenticated owner RLS. |
| C01C-004 | ACCEPTED | Avatar replacement uses new upload plus pointer compare-and-set, never Storage upsert. | Only SELECT, INSERT, and DELETE policies are granted; UUID filenames avoid CDN-stale overwrites. |
| C01C-005 | ACCEPTED | Avatar cleanup is compensating and convergent rather than transactionally atomic. | Failed database writes remove the new upload; stale-delete failure is visible and retried on the next avatar mutation. |

## Documentation reconciliation

Cycle 00A, Cycle 00B, ADR 0001, ADR 0002, and the feature placeholder contain no decision contradicting the single-Owner model or the contracts above. The single active Owner rule is therefore accepted. No silent contradiction was resolved in Cycle 00C.
