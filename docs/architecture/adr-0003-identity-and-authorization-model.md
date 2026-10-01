# ADR 0003: identity and authorization model

- Status: Accepted
- Date: 2026-10-01
- Cycle: 00C
- Implementation status: Documentation only; no product schema exists

## Context

Clauble needs stable identity, Company relationship, and authorization contracts before migrations begin. Public identity must remain useful independently of Company membership, public Company attribution must not confer private workspace access, and revocation must take effect from current database state rather than stale client or token state.

The existing approved documents establish Supabase Auth as identity, require explicitly reviewed grants plus RLS, and prohibit frontend-only authorization and user-editable metadata. They do not contradict the V1 single-Owner model.

## Decision

### Identity

`auth.users` is the canonical authentication identity. Clauble will not create `accounts`. A future `people` row represents public Clauble identity and normally has `people.id = auth.users.id`, giving a one-to-one relationship without duplicating Auth credentials or email.

The lifecycles are related but distinct. A valid Auth row does not by itself mean a publicly active Person, and profile deactivation does not define Auth/session deletion. Future Person states are `active`, `suspended`, `deactivated`, and `deleted`; their transitions are not implemented here. Public Person routes use `/u/{username}`.

### Company relationships and authorization

Public `company_memberships` (`Founder`, `Member`) and private `company_panel_access` (`Owner`, `Admin`, `Editor`, `Analyst`) are separate entities. There is no `company_users` aggregate. A public role grants zero panel permissions, and a panel role does not imply a public role except in an explicit workflow.

A Person cannot self-assign a Company membership. Membership arises only from accepted invitation, an authorized Company management operation, or an authorized Clauble administration operation. Historical rows transition to `left` or `removed`; they are not physically deleted merely because the Person leaves.

Company authorization is derived from active database rows on every protected operation. It is not derived from `raw_user_meta_data`, `user_metadata`, or a JWT Company-role list. Even `app_metadata` is unsuitable as the canonical Company source because its JWT representation remains stale until refresh. A future ADR may justify small, coarse global platform claims.

### Sole Owner

Each Company has exactly one active Owner in V1. Initial Launch atomically establishes the Company, launching Person's public Founder relationship, and private Owner access. A later ownership transfer is a dedicated audited operation that locks or otherwise safely serializes the relevant Company/access state, verifies the successor, activates the successor Owner, demotes/revokes the prior Owner according to the approved workflow, and preserves the exactly-one invariant at commit.

Consequences:

- ordinary access grant/revoke cannot create or remove Owner;
- Owner cannot leave or lose membership/access while still Owner;
- Admin cannot assign Admin, manage Owner, self-escalate, transfer ownership, or control deletion;
- multiple simultaneous Owners are unsupported in V1;
- database constraints alone may be insufficient for the full transition, so the migration design must combine an enforceable uniqueness rule with a transaction/locking protocol;
- failed transfer leaves both ownership and audit history unchanged.

### Invitations

`company_invitations` stores pending intent and targets an existing Person in V1. It is neither membership nor active panel access. States are `pending`, `accepted`, `declined`, `revoked`, and `expired`.

If token acceptance is used, only a hash is stored. Acceptance verifies the authenticated actor equals `target_person_id`, the invitation remains pending and unexpired/unrevoked, and the inviter had authority for both proposed roles. It is transactionally idempotent: repeated acceptance cannot duplicate membership/access, and membership plus optional panel access are created/reactivated together with the invitation transition and audit event.

Public Founder does not imply panel access; proposed panel access does not imply Founder. Owner cannot be proposed through a normal invitation; the ownership-transfer workflow owns that transition.

```text
company_invitation --accept--> company_membership
                         \
                          +--> company_panel_access (optional)
```

### Permission model

Central authorization maps a panel role to canonical permissions defined in [the authorization matrix](authorization-matrix.md). Application services check permissions plus actor/resource lifecycle and operation-specific invariants. They do not spread role-name conditionals through UI or route code.

The authorization layers are:

1. trusted application authorization for business permissions and workflow validation;
2. Postgres grants for object/operation reachability by `anon` and `authenticated`;
3. Postgres RLS for row visibility and mutation eligibility;
4. constraints and serialized transactions for invariants regardless of caller.

Frontend hiding, middleware, route guards, `TO authenticated` alone, and service-role/secret credentials are never authorization boundaries. Privileged server credentials may be necessary for narrowly scoped internal operations but do not remove the obligation to authenticate the actor, authorize the operation, validate state, and audit it.

### Data API and schema exposure

The current `public` and `graphql_public` schemas are exposed and `auto_expose_new_tables = false`. Therefore every future table begins with no Data API access. Its migration specification must state:

```text
anon grants
authenticated grants
service/internal access
RLS enabled?
SELECT policy
INSERT policy
UPDATE policy (USING and WITH CHECK)
DELETE policy
```

Grants and RLS ship in the same migration. Every exposed table has RLS and positive/negative tests for each relevant role and operation. `UPDATE` also needs compatible `SELECT` visibility. Views exposed to clients must be reviewed as carefully as tables and use invoker semantics where supported.

Public/user-private/company-private data intended for direct client access may initially use the exposed `public` schema with minimal grants and RLS. Restricted platform data, token hashes, internal authorization helpers, and tables with no client-access need belong in an unexposed schema such as `private`. Whether Clauble later adopts a dedicated `api` schema is OPEN and requires a migration/configuration ADR.

Conceptual exposure baseline (exact column grants and policy expressions belong to each migration specification):

| Entity | `anon` | `authenticated` | Service/internal | RLS / write posture |
| --- | --- | --- | --- | --- |
| `people` | SELECT approved fields of active rows | Public SELECT, own safe data, own approved profile update | Lifecycle/moderation through scoped trusted service | RLS required if exposed; no client INSERT/DELETE; update mechanism remains OPEN. |
| `companies` | SELECT approved fields of active rows | Public SELECT plus authorized private view | Launch/lifecycle/moderation through scoped workflow | RLS required if exposed; no direct client INSERT/DELETE; profile UPDATE only for permission holders. |
| `company_memberships` | SELECT active public rows | Public SELECT plus authorized history/management visibility | Acceptance and admin override transaction | RLS required if exposed; creation/state change through controlled workflow; no ordinary DELETE. |
| `company_panel_access` | No grants | At most self and Owner/Admin SELECT required by UX | Grants, revocation, and transfer through controlled transaction | Prefer private/unexposed storage; if exposed, RLS required and no broad direct write grants. |
| `company_invitations` | No grants | Target and authorized Owner/Admin SELECT as required | Issue/accept/revoke/expire transaction | Prefer private/unexposed storage; token hash never exposed; no physical DELETE. |
| `company_topics` | SELECT active public associations | Public SELECT; authorized Company-management mutation | Taxonomy administration remains separate | RLS required if exposed; writes limited to approved active Topics. |
| `signals` | SELECT published public rows | Public SELECT plus authorized draft access | Moderation/publication workflow as needed | RLS required if exposed; writes require Signal permissions and lifecycle checks; no ordinary DELETE. |
| `signal_revisions` | No grant unless a public revision projection is later approved | Authorized Company SELECT; controlled authoring writes | Retention/moderation workflow | Prefer append-only revisions; RLS required if exposed; no ordinary UPDATE/DELETE. |

“Service/internal” is not a blanket bypass. A privileged credential or database owner may bypass RLS, so trusted code must still authenticate the initiating actor where applicable, run the same permission/invariant checks, use the smallest operation surface, and write audit history.

### Future `people` RLS contract

- Anonymous: SELECT only approved public fields of active People; no INSERT, UPDATE, or DELETE.
- Authenticated: same public visibility; may read their own additional safe profile data as specified; may update only approved profile fields on their own Person; cannot change platform-controlled status, another Person, identity binding, or physically delete a row.
- Suspended Person public visibility is OPEN.

Three implementation options remain under review:

| Option | Benefit | Risk / cost |
| --- | --- | --- |
| Column privileges + RLS | Direct and efficient; database-enforced field boundary | Privilege/policy interactions are easy to misread; grants must remain synchronized with columns. |
| Controlled RPC | Narrow input and atomic validation | Function security and EXECUTE grants expand review surface; `SECURITY DEFINER` may be dangerous. |
| Trusted server mutation | Central business validation and clear application errors | RLS must still constrain user-scoped database access; privileged clients require strict scoping and tests. |

No option is selected in Cycle 00C.

### RLS helper functions

Start with readable direct policies. A future `private.has_company_permission(company_id, permission)` or `private.is_company_member(company_id)` is justified only when it reduces repeated joins/recursion or measurably improves performance without obscuring authorization.

If a helper must be `SECURITY DEFINER`:

- it lives only in an unexposed schema;
- owner and effective privileges are reviewed because it may bypass RLS;
- `search_path` is empty/pinned and every referenced object is schema-qualified;
- default `PUBLIC` execution is revoked and EXECUTE is granted only where required;
- inputs are treated as untrusted and actor identity comes from `auth.uid()` rather than a caller-supplied user ID;
- policies avoid RLS recursion and tests cover member, non-member, revoked, suspended, and cross-Company cases;
- policy filter/join columns are indexed, stable helper calls may be wrapped in `select` for per-statement evaluation, and representative queries are measured with `EXPLAIN (ANALYZE, BUFFERS)` before optimization is accepted.

### Audit

Future `audit_events` is append-only security history with conceptual fields `id`, `actor_person_id`, nullable `company_id`, `action`, `target_type`, `target_id`, `permission_used`, `request_id`, `before_summary`, `after_summary`, `metadata`, and `occurred_at`.

Audit is required for Company launch/profile changes; public member add/remove; panel grant/role change/revoke; invitation creation/revocation/acceptance; ownership transfer; Signal publish/unpublish; deletion request/cancel; moderation; and admin override. Critical mutations and their audit row commit together where practical.

Audit data never contains passwords, access/refresh tokens, raw invitation tokens, database credentials, unnecessary PII, or complete sensitive payloads. Client roles do not INSERT/UPDATE/DELETE audit rows directly.

## Current Supabase guidance consulted

- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): grants plus RLS, operation policies, `auth.uid()`, `auth.jwt()`, metadata safety/staleness, `UPDATE` requirements, performance, helpers, and policy tests.
- [Securing the Data API](https://supabase.com/docs/guides/api/securing-your-api): grants versus row policies, opt-in exposure, dedicated/unexposed schemas, and default privilege hardening.
- [Database functions](https://supabase.com/docs/guides/database/functions): invoker-first design, `SECURITY DEFINER` `search_path` hardening, and EXECUTE privilege restrictions.
- [Database testing](https://supabase.com/docs/guides/database/testing) and [CLI testing/linting](https://supabase.com/docs/guides/local-development/cli/testing-and-linting): pgTAP and local database test workflow.
- [Generating TypeScript types](https://supabase.com/docs/guides/api/rest/generating-types): schema-derived types and regeneration after migrations.
- [Supabase changelog](https://supabase.com/changelog): reviewed on 2026-10-01; the opt-in Data API exposure change reinforces Clauble's existing `auto_expose_new_tables = false` posture.

## Rejected alternatives

- Duplicate `accounts` authentication identity.
- One generic `company_users` table mixing public attribution and private access.
- Public role implying panel access or panel role implying public identity.
- Multiple active Owners in V1.
- Company role arrays in user-editable metadata or canonical JWT claims.
- `TO authenticated` as sufficient Company authorization.
- Blanket Data API grants, frontend-only authorization, or service-role bypass as normal workflow.
- Placing privileged helpers in an exposed schema.

## Consequences

Future migration specifications must implement one stage at a time, include exact grants/RLS/tests, regenerate database types, and preserve the contracts here. Open decisions in the product register block only the affected policy/workflow, not unrelated architecture work.
