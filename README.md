# Final Project G16 — CPMC Property Management Company

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
   - `TEAM_COMPANY_ID=G16`
   - `TEAM_PASSWORD=team123`
5. Run:

```bash
npm install
npm run dev
```

6. Open http://localhost:3000

### Shared team data

All operational entries sync through Supabase table `shared_records` (same FinalProjectG16 project for everyone):

- Managed properties / management contracts
- Owner applications & accounts
- Maintenance work orders, vendors, budget lines, invoices/receipts
- Ops tenant master list
- Property-detail tenant rosters
- Tenant portal applications, contracts, and billing invoices

Everyone must use the same `.env.local` Supabase URL + anon key. Refresh to pick up teammates’ new rows.

### Entry paths

- **Welcome** `/` — choose tenant portal, property owner, or team member
- **Tenant portal** `/portal` — applications, contracts, billing
- **Owner** `/owners` — login or apply for access → `/owners/dashboard`
- **Team login** `/team` — company ID `G16` + password `team123` → `/ops`
- Existing Supabase auth pages remain at `/login` and `/signup`

### If login says "Email not confirmed"

Supabase Auth is currently requiring email confirmation. For this class project, an org admin should:

1. Open [Authentication → Providers → Email](https://supabase.com/dashboard/project/dgnrtqzapshumasjvoei/auth/providers)
2. Turn **Confirm email** off and save

Or temporarily confirm a user under **Authentication → Users**.

(Default Supabase email sending is rate-limited and often only delivers to org members, so confirmation emails are unreliable for teammate signups.)

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
