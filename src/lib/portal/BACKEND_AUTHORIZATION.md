# Backend authorization requirements (current-tenant portal)

Frontend route guards and client-side filtering **cannot** guarantee tenant isolation. A caller can bypass the UI and hit APIs or the database directly. Enforce the rules below on the server.

## Identity and role

1. Authenticate with Supabase Auth (or equivalent). Prefer `auth.getUser()` / JWT validation on every request — do not trust cookies or client flags alone for authorization decisions.
2. Authorize current-tenant portal access only when `profiles.role = 'tenant'` (or the production equivalent claim in **`app_metadata`**, never editable `user_metadata`).
3. Do **not** grant `/portal` private data to team/ops cookies (`harborline_team`), owner cookies, or other staff roles. Staff use `/ops` and role shells under `(app)`.
4. Map `auth.uid()` → **lease party / tenant id** via a server-side membership table (e.g. `lease_parties`, `tenant_members`). Never accept `tenantId` / `tenantScopeId` from the request body, query string, or path as the sole authority.

## Per-resource rules

For every read and write of tenant data, constrain by the resolved tenant id:

| Domain | Requirement |
|--------|-------------|
| Lease | `lease.tenant_id = session.tenant_id` (or membership join) |
| Payments / history | Charges and receipts for the session tenant’s lease only |
| Maintenance | Requests created by or assigned to the session tenant’s unit/lease only; detail-by-id must 404/403 if another tenant’s id is guessed |
| Messages | Conversations where the session user is a participant |
| Documents | Object storage + DB rows limited to `authorized_tenant_ids` / ACL; signed download URLs bound to the requester |
| Announcements | Property-scoped; still require authenticated tenant membership on that property |
| Profile | User may update only their own contact prefs; identity fields read-only without verification |
| Renewal / move-out | Requests attached to the session tenant’s active lease only |
| Notifications | In-app rows for `user_id = auth.uid()` only |

## API / RLS checklist

1. Enable **RLS** on all tenant tables exposed through PostgREST/Data API.
2. Policies should use `auth.uid()` and membership joins — not client-passed tenant ids.
3. `UPDATE`/`DELETE` policies need matching `SELECT` policies (Postgres RLS).
4. Storage buckets for documents: path prefix or metadata must encode tenant id; policies must match.
5. Return **404** (not 200 with empty, when appropriate) for cross-tenant id enumeration on detail endpoints — or 403 consistently; document the choice.
6. Log authorization failures for security monitoring.
7. Short JWT expiry + refresh; remember `app_metadata` / role claims are only as fresh as the token.

## What this frontend does (defense in depth only)

- Proxy redirects unauthenticated users away from private `/portal/*` routes (`src/lib/supabase/proxy.ts`).
- Server layout (`src/app/portal/(tenant)/layout.tsx`) requires `profiles.role === 'tenant'` via `requirePortalTenant` (`src/lib/portal/auth-server.ts`).
- Services refuse calls without a portal session (`requirePortalServiceSession`) and filter mock fixtures by `tenantScopeId`.
- Local sessionStorage keys are namespaced by `tenantScopeId` so one browser profile cannot read another tenant’s cached portal data.
- `/portal/apply` requires the same current-tenant (or demo) session as other private portal routes and filters records to the signed-in account.
- `/portal/unauthorized` explains wrong-role access.

Replace mock services (`BACKEND_TODO`) with APIs that enforce the table above.
