# Cycle 00C: identity, data model, and authorization contract

## Goal

Freeze the conceptual V1 identity, Company, authorization, invitation, Signal ownership, audit, and Data API contracts that later migration specifications must implement.

Cycle 00C is documentation and architecture only. **Implemented product schema: none.**

## Decisions delivered

- Supabase `auth.users` is the canonical authentication identity. Clauble will not duplicate it in an `accounts` table.
- `people` is the future public identity, normally sharing the UUID of its one-to-one `auth.users` row. Authentication and public-profile lifecycles remain conceptually separate.
- Public Company relationships (`company_memberships`) and private panel authorization (`company_panel_access`) are independent.
- V1 public roles are `Founder` and `Member`; V1 panel roles are `Owner`, `Admin`, `Editor`, and `Analyst`. Absence of panel access is represented by no active row, not a persisted `None` role.
- A Company has exactly one active Owner in V1. Ownership transfer is an explicit, audited, serialized operation.
- Invitations are pending intent, not membership or access. Acceptance creates or reactivates the relevant rows atomically and idempotently.
- Authorization is permission-based and is enforced by trusted application code, Postgres grants, RLS, and database invariants.
- Database-current panel access is the source of Company authorization; Company roles are not canonically encoded in JWT claims.
- Company owns each Signal; a Person receives durable author credit.
- New Data API exposure is deny-by-default and requires an explicit table-by-table grant and RLS decision.

## Scope artifacts

- [Decision register](decision-register.md)
- [Identity and authorization ADR](../architecture/adr-0003-identity-and-authorization-model.md)
- [Conceptual V1 data model](../architecture/data-model-v1.md)
- [Authorization matrices](../architecture/authorization-matrix.md)
- [Future RLS test plan](../qa/rls-test-plan.md)

## Out of scope

- migrations, product tables, enums, functions, policies, grants, seeds, and storage buckets
- authentication UI or account lifecycle implementation
- Launch, Workspace, Signals, jobs, ranking, moderation, entitlement, or notification features
- platform-administration tables and global-role implementation
- final physical schema details such as column types, constraint syntax, indexes, and partitioning

## Exit criteria

- The six Cycle 00C documents are internally consistent and cite current Supabase guidance.
- Product contradictions and unresolved decisions are explicit in the decision register.
- `pnpm verify`, `pnpm supabase:status`, and `git diff --check` pass.
- `supabase/migrations` contains no Clauble product migration and the generated database type remains empty of product tables.

## Next cycle boundary

Cycle 00D should specify and implement only the first approved migration stage: database foundation and `people`, including exact columns, constraints, grants, RLS, database tests, and regenerated types. Company, membership, panel access, invitations, Signals, and other later-stage entities remain out of scope until their own reviewed migration specifications.
