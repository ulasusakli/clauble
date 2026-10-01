# V1 authorization matrix

**Status:** Future contract; implemented now: none.

Authorization is permission-based. Role names are translated to permissions in centralized trusted infrastructure. Feature code asks whether the actor has a permission in the resolved Company context; it does not scatter checks such as `role === "owner"`.

## Canonical permissions

```text
workspace.view
company.edit_profile
signal.create
signal.edit
signal.publish
signal.unpublish
team.view
team.manage_public_members
panel.view_access
panel.manage_access
invitation.view
invitation.manage
jobs.view
jobs.manage
analytics.view
audit.view_company
company.transfer_ownership
company.request_deletion
company.cancel_deletion
```

`invitation.view` and `invitation.manage` are added because an invitation is neither membership nor panel access and needs an explicit authorization boundary.

## Panel roles to permissions

| Permission | Owner | Admin | Editor | Analyst |
| --- | :---: | :---: | :---: | :---: |
| `workspace.view` | ✓ | ✓ | ✓ | ✓ |
| `company.edit_profile` | ✓ | ✓ | — | — |
| `signal.create` | ✓ | ✓ | ✓ | — |
| `signal.edit` | ✓ | ✓ | ✓ | — |
| `signal.publish` | ✓ | ✓ | ✓ | — |
| `signal.unpublish` | ✓ | ✓ | ✓ | — |
| `team.view` | ✓ | ✓ | ✓ | ✓ |
| `team.manage_public_members` | ✓ | ✓ | — | — |
| `panel.view_access` | ✓ | ✓ | — | — |
| `panel.manage_access` | ✓ | ✓ | — | — |
| `invitation.view` | ✓ | ✓ | — | — |
| `invitation.manage` | ✓ | ✓ | — | — |
| `jobs.view` | ✓ | ✓ | ✓ | ✓ |
| `jobs.manage` | ✓ | ✓ | ✓ | — |
| `analytics.view` | ✓ | ✓ | — | ✓ |
| `audit.view_company` | ✓ | ✓ | — | — |
| `company.transfer_ownership` | ✓ | — | — | — |
| `company.request_deletion` | ✓ | — | — | — |
| `company.cancel_deletion` | ✓ | — | — | — |

### Role constraints

- Owner may assign or revoke Admin, Editor, and Analyst, but cannot create a second active Owner. Ownership changes use the dedicated transfer operation.
- Admin may assign/revoke Editor and Analyst. Admin may not assign or revoke Owner or Admin, including themselves; may not self-escalate; and may not transfer ownership or control Company deletion.
- Editor cannot edit the Company profile. Editor can manage Signals and jobs, and can view the public team.
- Analyst is read-only: workspace, public team, jobs, and analytics.
- A role's permission set is necessary but not sufficient: actor state, Company/resource state, target rules, and operation invariants can still deny an action.

## Public roles

| Public role | Public meaning | Panel permissions granted |
| --- | --- | --- |
| Founder | Public founding relationship | **Zero** |
| Member | Public current relationship | **Zero** |
| None | No active public membership | **Zero** |

These are explicit invariants:

```text
Founder != Owner
Founder != Admin
Member != Editor
Member != panel access
```

`Founder + None`, `Founder + Owner`, `Founder + Editor`, `Member + Admin`, and `Member + Analyst` are structurally possible. Initial Launch is an explicit workflow that creates Founder and Owner together; it does not establish a general derivation rule.

## Actor scenarios

| Actor | Public reads | Company workspace | Writes | Special notes |
| --- | --- | --- | --- | --- |
| Anonymous | Active public People, Companies, memberships, Topics, and published Signals | None | None | `anon` grants are read-only and only for explicitly public projections/fields. |
| Authenticated unrelated user | Same public data plus own private data where specified | None | Own approved Person fields and user-private resources only | `TO authenticated` alone never grants a Company operation. |
| Public Member, no panel access | Same public reads | None | No Company writes | Membership is presentation/history, not authorization. |
| Public Founder, no panel access | Same public reads | None | No Company writes | Founder status is not Owner/Admin. |
| Analyst | Public reads plus authorized Company-private reads | View | No Company writes | Can view analytics, jobs, and team. |
| Editor | Authorized Company-private working data | View | Signals and jobs | Cannot edit Company profile or manage people/access. |
| Admin | Authorized Company-private data and Company audit | View | Profile, Signals, public members, invitations, Editor/Analyst access, jobs | Cannot manage Admin/Owner, transfer ownership, or control deletion. |
| Owner | All authorized Company-private data and Company audit | View | All V1 Company operations | Sole role for ownership transfer and deletion request/cancel. |
| Suspended user | Public visibility per general public policy only | None | None | Denied before permission derivation even if access rows remain active. |
| Platform Moderator | Scope-limited moderation reads/actions | Not implied | Only approved moderation actions | Future trusted admin model; every action audited; no generic service-role shortcut. |
| Platform Membership Admin | Scope-limited membership/access administration | Not implied | Approved membership/access interventions | Future model with reason/approval controls and audit. |
| Platform Super Admin | Emergency/platform scope only | Not implied | Explicit approved overrides | Not a routine application path; least privilege and audit required. |

Platform roles are scenario requirements, not implemented roles. Their storage, claim strategy, approvals, and RLS behavior remain open.

## Canonical server-side evaluation

Every protected mutation follows this order:

1. Authenticate the actor.
2. Validate the actor account/Person state.
3. Load the target resource.
4. Resolve the target Company context from trusted data.
5. Load database-current active panel access.
6. Derive canonical permissions.
7. Check target and Company lifecycle state.
8. Validate operation-specific invariants (including target-role hierarchy and sole-Owner rules).
9. Execute the mutation.
10. Write the audit event.

Critical domain mutation and audit insertion should commit in one database transaction where practical. The application must return a denial without partially applying either side.
