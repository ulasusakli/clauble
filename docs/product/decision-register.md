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
| C00C-020 | OPEN | Should a suspended Person profile remain publicly visible, become unavailable, or show a limited tombstone? | Public `people` SELECT policy cannot be finalized until moderation/product behavior is approved. |
| C00C-021 | OPEN | Which mechanism performs safe self-service Person profile updates: column grants + RLS, controlled RPC, or trusted server mutation? | Prefer the simplest reviewed design that prevents platform-field writes; compare options in ADR 0003. |
| C00C-022 | OPEN | Should the long-term client API use `public` directly or a dedicated exposed `api` schema over private domain tables? | Current local config exposes `public`; no schema exposure change is made in Cycle 00C. |
| C00C-023 | OPEN | What are the exact global platform roles, scopes, and approval rules for Moderator, Membership Admin, and Super Admin? | Actor scenarios are specified, but no platform-admin tables or bypass mechanism are approved. |
| C00C-024 | OPEN | Which structurally valid public-role + panel-role combinations will V1 UX allow? | The data model permits combinations such as Founder + None and Member + Admin; workflows may present a narrower set. |
| C00C-025 | OPEN | What are invitation expiry duration, resend behavior, and uniqueness rules for multiple pending invitations? | Security invariants are frozen; timing and UX are deferred. |
| C00C-026 | OPEN | Are Signal drafts and revisions one table or separate tables? | The conceptual ERD includes `signal_revisions`; a Signal migration specification must settle physical storage. |
| C00C-027 | OPEN | What are Company suspension and deletion retention/public-visibility semantics? | Mutations are denied while suspended; read/tombstone and archival behavior need product approval. |

## Documentation reconciliation

Cycle 00A, Cycle 00B, ADR 0001, ADR 0002, and the feature placeholder contain no decision contradicting the single-Owner model or the contracts above. The single active Owner rule is therefore accepted. No silent contradiction was resolved in Cycle 00C.
