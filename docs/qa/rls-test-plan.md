# Future RLS and authorization test plan

**Specification only.** Cycle 00C creates no product tables, policies, grants, helpers, fixtures, or database tests. Each later table migration must add executable positive and negative tests alongside its grants and RLS.

## Test layers

1. pgTAP/SQL tests validate grants, RLS enablement, operation policies, constraints, helper privileges, and transactional invariants using the repository-pinned Supabase CLI.
2. Application tests validate permission derivation, lifecycle checks, target-role hierarchy, safe errors, and audit creation.
3. End-to-end tests validate a publishable-key client cannot bypass server/UI restrictions and that revoked access disappears immediately.

Every exposed table receives explicit tests for `anon` and `authenticated` across SELECT, INSERT, UPDATE, and DELETE. Tests distinguish a missing-grant `42501`, a `WITH CHECK` rejection, and a `USING` predicate that safely affects zero rows. UPDATE tests also prove required SELECT visibility and test both old-row and resulting-row constraints.

## Identity and People

| Scenario | Expected result |
| --- | --- |
| Anonymous reads approved fields of an active Person | Allowed |
| Anonymous reads email/account-security/private fields | Denied or fields absent from exposed projection |
| Anonymous inserts, updates, or deletes Person | Denied |
| User reads own approved extended profile data | Allowed as specified |
| User updates own approved profile field | Allowed |
| User updates another Person | Denied |
| User changes own `id`, Auth binding, status, moderation fields, or other platform-controlled field | Denied |
| User physically deletes own Person row | Denied |
| Suspended profile public read | Pending decision; test becomes mandatory once C00C-020 closes |

## Companies and public memberships

| Scenario | Expected result |
| --- | --- |
| Anonymous/unrelated user reads active public Company and active public memberships | Allowed, public fields only |
| Founder or Member without panel access edits Company | Denied |
| Person self-assigns membership or changes own public role | Denied |
| Admin/Owner adds or removes public member through authorized workflow | Allowed and audited |
| Editor/Analyst manages public membership | Denied |
| Member leaves | Lifecycle transition retains historical row; no physical delete |
| Owner attempts to leave while Owner | Denied until ownership transfer commits |
| Cross-Company actor mutates another Company's membership | Denied |

## Panel access and permissions

| Scenario | Expected result |
| --- | --- |
| Panel access appears on public Company/Person profile | Denied; private data must not leak |
| Analyst creates/edits any Company resource | Denied |
| Editor creates/edits/publishes/unpublishes Signal and manages jobs | Allowed subject to resource state |
| Editor edits Company profile or access | Denied |
| Admin edits Company/profile, manages members, Editor/Analyst access, Signals/jobs | Allowed and audited where required |
| Admin assigns/revokes Admin or Owner | Denied |
| Admin assigns Admin to self or escalates own role | Denied |
| Admin transfers ownership or requests/cancels deletion | Denied |
| Owner manages Admin/Editor/Analyst | Allowed and audited |
| Owner creates second active Owner through ordinary access write | Denied |
| Owner transfers ownership through dedicated operation | Allowed; exactly one active Owner before and after; audited atomically |
| Concurrent ownership transfers | At most one succeeds; invariant remains exactly one Owner |
| Revoked panel user attempts database write with an otherwise-valid existing JWT | Denied immediately from database-current state |
| Suspended user with active access row mutates Company | Denied |
| Suspended Company receives ordinary panel mutation | Denied except specifically approved recovery/moderation operation |

## Invitations

| Scenario | Expected result |
| --- | --- |
| V1 invitation targets non-existent Person | Denied |
| Raw invitation token can be read from database/API/log/audit | Denied; only hash may be stored |
| Target A accepts while authenticated as A | Allowed when pending, valid, and inviter authority is valid |
| Target A invitation is accepted by user B | Denied |
| Expired, revoked, declined, or accepted invitation is accepted | Denied/no-op without new access |
| Same valid acceptance is retried | Idempotent; one membership, at most one active panel row, one accepted state |
| Acceptance creates membership but panel access fails | Entire transaction rolls back |
| Proposed Founder with null panel role | Founder membership only |
| Proposed Member + Admin | Independent Member membership and Admin access |
| Ordinary invitation proposes Owner | Denied; use ownership transfer |

## Signals and revisions

| Scenario | Expected result |
| --- | --- |
| Anonymous reads published, publicly visible Signal | Allowed |
| Anonymous/authenticated unrelated user reads draft/revision | Denied |
| Published Signal lacks Company or author | Constraint/workflow denial |
| Analyst creates Signal draft | Denied |
| Editor creates Signal draft | Allowed |
| Authorized publisher publishes valid Signal | Allowed and audited |
| Unauthorized actor publishes/unpublishes | Denied |
| Author leaves Company or loses panel access | Historical `author_person_id` unchanged; no new write authority |
| Removed/suspended/unpublished Signal appears in public discovery | Denied |
| Cross-Company Editor edits Signal | Denied |

## Entity operation contract

This conceptual CRUD table is the minimum later policies must refine.

| Entity | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `companies` | Active public fields to anon/authenticated; private fields to authorized panel roles; suspended visibility pending | Launch/trusted workflow only | Admin/Owner for approved fields; lifecycle/ownership operations use dedicated workflows | No client physical delete |
| `company_memberships` | Active public rows to all; history/self/authorized management as specified | Invitation acceptance or authorized Admin/Owner/platform workflow | Authorized lifecycle/job-title/public-role transitions; no self-assignment | No ordinary physical delete |
| `company_panel_access` | Self and Owner/Admin as required; never public | Owner for Admin/Editor/Analyst, Admin for Editor/Analyst, dedicated transfer for Owner | Same hierarchy; no self-escalation; revoke as state transition | No ordinary physical delete |
| `company_invitations` | Target and authorized Owner/Admin; no public read | Authorized Owner/Admin/platform workflow | Target may decline/accept only through validated workflow; inviter authority may revoke; expiry internal | No ordinary physical delete |
| `company_topics` | Public for active Company/topic relationship | Owner/Admin selects active Topic | Replace/set through authorized workflow | Owner/Admin may remove association; taxonomy rows unaffected |
| `signals` | Published/public to all; drafts to authorized panel roles | Owner/Admin/Editor | Owner/Admin/Editor subject to Company and Signal state | No ordinary physical delete; lifecycle transition |
| `signal_revisions` | Authorized panel roles; public revision exposure only if separately approved | Owner/Admin/Editor through Signal workflow | Prefer immutable revisions; corrections create new revision | No client physical delete |

## Actor-state overlays

- Anonymous and unrelated authenticated users receive only explicitly public SELECT behavior.
- A public Founder/Member without active panel access behaves like an unrelated user for Company-private objects and every Company write.
- Analyst has only the read operations in the permission matrix.
- Editor writes Signals/jobs only; Admin and Owner follow target-role constraints.
- Suspended actor is denied protected mutations before role evaluation.
- Suspended Company is denied ordinary mutations before permission evaluation; precise public read behavior remains open.
- Future Moderator/Membership Admin/Super Admin operations use narrowly scoped trusted paths, never a generic client bypass, and always produce audit events.

## Helper and exposure tests

- Assert RLS enabled on every exposed table and expected grants only.
- Assert no new table/function/sequence is reachable merely because it is in `public`.
- Assert `private` is not an exposed schema and client roles lack schema/function access by default.
- For every privileged helper, assert `search_path` hardening, schema-qualified references, expected owner, no `PUBLIC` EXECUTE, and only intended role EXECUTE.
- Prove helpers do not accept a caller-supplied actor identity in place of `auth.uid()`.
- Exercise cross-Company and RLS-recursion cases.
- Index every policy predicate/join column and record representative `EXPLAIN (ANALYZE, BUFFERS)` evidence for high-volume paths.
- Regenerate and review `src/types/database.generated.ts` after each approved migration.

## Audit assertions

Required events: Company launch/profile change; member add/remove; access grant/change/revoke; invitation create/revoke/accept; ownership transfer; Signal publish/unpublish; deletion request/cancel; moderation; admin override.

Tests prove event immutability, actor/Company/target/permission/request correlation, transaction rollback with failed domain mutation, and absence of passwords, access/refresh tokens, raw invitation tokens, credentials, and unnecessary PII.
