# Final Project G16 — Harborline Property Management

ACCY 628 contract-to-cash system for a **Commercial Property-Management Company**.

## Current status (skeleton)

This branch (`Wat/Setup`) contains the starter foundation:

- Next.js + Tailwind + daisyUI
- Supabase Auth (sign up / log in / log out)
- Shared Supabase project: **FinalProjectG16**
- Role workspaces: Owner, Manager, Tenant, Maintenance, Accounting
- Demo **View as** role switcher in the header (for panel demos later)
- `profiles` table in Supabase (role stored per user)

Not built yet (for teammates): leases, work orders, invoices, payments, seed data, GAAP reports, full dashboards.

## Setup for teammates

1. Clone the repo and open it in Cursor.
2. Create/switch to your own branch (do not edit `main` directly).
3. Copy `.env.local.example` to `.env.local` and paste the shared Supabase URL + anon key from the FinalProjectG16 project.
4. Team gate demo defaults (already in the example file):
   - `TEAM_COMPANY_ID=HARBORLINE`
   - `TEAM_PASSWORD=harborline2026`
5. Run:

```bash
npm install
npm run dev
```

6. Open http://localhost:3000

### Entry paths

- **Welcome** `/` — choose tenant portal or team member
- **Tenant portal** `/portal` — applications, contracts, billing
- **Team login** `/team` — company ID + password → `/ops` management console
- Existing Supabase auth pages remain at `/login` and `/signup`

## Suggested team lanes

| Area | Examples |
|------|----------|
| Auth / roles / panel switcher | Improve role permissions and demo accounts |
| Owners + properties + management contracts | Owner engagements, properties, units |
| Tenant leases + deposits | Lease terms, renewals, deposits |
| Maintenance / vendors / costs | Work orders, vendor costs |
| Billing + AR + payments | Rent invoices, receipts, late fees |
| Accounting / GAAP / profitability | Deposits liability, earned rent, property P&L |
| Dashboards + seed data + polish | Role dashboards, fake history, demo path |

## Branch workflow reminder

1. Work on your own branch.
2. Test locally.
3. Push your branch.
4. Merge into `main` carefully after checking with the team.
5. Everyone pulls latest `main` into their branch.
