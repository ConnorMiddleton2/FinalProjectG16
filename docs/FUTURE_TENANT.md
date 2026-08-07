# Future Tenant Portal

Leasing discovery and applicant workflows for CPMC prospects.
Connected to the Current Tenant Portal visually and via shared auth, but
scoped under `/portal/future/*` so current-tenant routes stay unchanged.

## Run

```bash
npm run dev
```

Open [http://localhost:3000/portal/future](http://localhost:3000/portal/future)

Entry from welcome chooser: `/portal/start` → **Future tenant**.

## Routes

| Path | Access | Purpose |
|------|--------|---------|
| `/portal/future` | Public | Landing — personal homes & commercial suites |
| `/portal/future/units` | Public | Search / filter (Personal vs Commercial) |
| `/portal/future/units/[id]` | Public | Unit detail |
| `/portal/future/saved` | Public | Saved units (sessionStorage when signed out) |
| `/portal/future/tours` | Public | Tour scheduling |
| `/portal/future/apply` | Private | Multi-step rental application |
| `/portal/future/application/status` | Private | Application status timeline |
| `/portal/future/application/co-applicants` | Private | Co-applicants / occupants |
| `/portal/future/application/documents` | Private | Document uploads |
| `/portal/future/application/fee` | Private | Application fee (mock) |
| `/portal/future/application/review` | Private | Review & certification |
| `/portal/future/messages` | Private | Leasing messages |
| `/portal/future/profile` | Private | Applicant profile |
| `/portal/future/lease-offer` | Private | Lease offer review |
| `/portal/future/onboarding` | Private | Move-in checklist |
| `/portal/future/notifications` | Private | Notification center |

**Preserved existing routes:** `/portal/apply`, `/portal/*` current-tenant pages,
`/portal/login`, `/portal/signup`, `/portal/start`.

## Personal & commercial inventory

Both the Future Tenant and Current Tenant portals support **personal** (residential)
and **commercial** property:

- Listings and leases carry `occupancyClass` (`personal` | `commercial`) and
  `propertyType` (aligned with owner/management asset types).
- Available Units and Apply include a Personal / Commercial filter.
- Unit cards show beds/baths for personal homes and use-class + sqft for commercial suites.
- Current-tenant lease, profile, and dashboard surfaces show the property class.

## Folder structure

```
src/app/portal/(future)/          # Route group (URL = /portal/future/…)
  layout.tsx                      # FutureTenantShell
  future/…                        # Pages

src/components/portal/future/     # UI components
src/lib/portal/future/            # Paths, models, nav, mock data, services
```

## Data / services

All fetches go through `src/lib/portal/future/services/*` returning
`ServiceResult<T>` from `@/lib/portal/services/shared`.

Search services for `BACKEND_TODO` before connecting live APIs.

Mock force-error mode: `NEXT_PUBLIC_PORTAL_FORCE_SERVICE_ERROR=1`

## Authentication assumptions

- Reuses Supabase Auth + existing `/portal/login` and `/portal/signup`.
- Public browse paths are listed in `isFutureTenantPublicPath` and wired into
  `isPortalPublicPath` in `src/lib/portal/auth.ts`.
- Private applicant paths require portal session (proxy + `RequireFutureApplicant`).
- Frontend ownership filters are defense-in-depth only — **RLS / server ACL**
  must protect applications, documents, messages, fees, and lease offers.

## Backend integrations still needed

- Live unit inventory + availability
- Durable saved units per account
- Tour calendar / CRM
- Application store with RLS
- Secure document storage (not public frontend folders)
- Compliant payment provider for application fees
- Screening / status webhooks (never expose internal notes to applicants)
- Lease offer e-sign pipeline
- Role transition future → current tenant after move-in

## Testing

This repo does not currently ship a unit-test framework (`package.json` has
`dev`, `build`, `start`, `lint` only). Manual checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Suggested first automated coverage (when a runner is added): public route
access, private route redirect, unit filters/sorts, saved units, tour slot
guards, apply step validation, duplicate fee prevention.

## Known limitations

- Application fee is a **labeled mock** — no real card data stored.
- Document uploads are mock / local metadata only.
- Screening criteria and management notes are never shown (and must stay
  server-side when backend lands).
- Demo application seed uses `DEMO_FUTURE_OWNER_USER_ID` in mock-data.
- No email/SMS/push delivery beyond in-portal notifications.

## Merge notes

- Do not delete `/portal/apply` — it remains for legacy / move-in onboarding.
- `next.config.ts` allows `images.unsplash.com` for listing photos.
- Current-tenant portal behavior should remain unchanged except nav link to
  `/portal/future` and start-page future CTA.

## Commands (diff / commit — run yourself)

```bash
git status
git diff
git diff --stat
npx tsc --noEmit
npm run lint
npm run build

# When ready to commit (do not run unless asked):
git add src/app/portal/(future) src/components/portal/future src/lib/portal/future \
  src/lib/portal/auth.ts src/lib/portal/nav.ts src/components/portal/PortalNav.tsx \
  src/app/portal/(entry)/start/page.tsx src/app/portal/(tenant)/apply/page.tsx \
  next.config.ts docs/FUTURE_TENANT.md
git commit -m "Add Future Tenant leasing portal under /portal/future"
```
