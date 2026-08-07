import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="w-4 shrink-0 text-center">•</span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="w-4 shrink-0 text-center">o</span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}

export default function TasksPage() {
  return (
    <div className="min-h-screen bg-[var(--harbor-sand)]">
      <main className="mx-auto max-w-3xl px-6 py-10 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <article className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white p-8 shadow-sm text-[var(--harbor-ink)] font-[Georgia,Cambria,'Times_New_Roman',Times,serif] text-[15px] leading-[1.55]">
          <section>
            <p className="font-semibold">Tenant side:</p>
            <ul className="mt-2 space-y-1 pl-6">
              <Bullet>
                Tenant dashboard
                <ul className="mt-1 space-y-1 pl-6">
                  <Sub>
                    Start new application, selecting which property you are
                    interested in, inputting information and submitting.
                  </Sub>
                  <Sub>View current applications</Sub>
                  <Sub>View of current contract for current lease</Sub>
                  <Sub>
                    View and manage billing, pay online for rent, or auto pay,
                    enter credit card, payment method etc.
                  </Sub>
                  <Sub>A way to submit maintenance requests</Sub>
                </ul>
              </Bullet>
            </ul>
          </section>

          <section className="mt-6">
            <p className="font-semibold">Property Managements Side:</p>
            <ul className="mt-2 space-y-2 pl-6">
              <Bullet>
                Properties (higher level dashboard, analytics of each property
                we own for further information
              </Bullet>
              <Bullet>
                Maintenance (manually enter work orders, view work orders,
                filter work orders with categories like, who entrees, completed,
                work in-progress, etc.)
                <ul className="mt-1 space-y-1 pl-6">
                  <Sub>
                    What authorization does the user have? Should a maintenance
                    employee be able to sign off work orders themselves or
                    submit them for the maintenance director’s approval.
                  </Sub>
                  <Sub>
                    Should a maintenance director be able to assign certain work
                    orders to certain employees
                  </Sub>
                  <Sub>
                    Categories for Work orders might include: date entered,
                    tenant, building, completed/in-progress.
                  </Sub>
                  <Sub>What obscure features can also be included?</Sub>
                </ul>
              </Bullet>
              <Bullet>
                Tenant (master list of all tenants, can be filtered down for all
                the categories, payment, building, lease date, etc.
              </Bullet>
              <Bullet>
                Accounts Payable (manage all invoices, payables for maintenance,
                or payments to business owners)
              </Bullet>
              <Bullet>
                Accounts Receivable (Manage revenue from tenants, including
                entering journal entries, or automating this)
              </Bullet>
              <Bullet>
                Human resources (Manage employees, including creating employee
                ID’s, temporary passwords, managing employees’ contracts, wages,
                authorization to functions on website, etc.
              </Bullet>
              <Bullet>
                Sales & Marketing (deals with new tenant applications, tours,
                advertising/marketing campaigns, approval of tenants, etc.)
              </Bullet>
              <Bullet>
                Management (Higher level control over everything, including
                tenant refusal to pay and foreclosure, dealing with owners,
                including reviewing owners’ applications, approving legal
                documents, dashboard allistics on all other components, etc.)
              </Bullet>
            </ul>
          </section>

          <section className="mt-6">
            <p className="font-semibold">Owner Side:</p>
            <ul className="mt-2 space-y-1 pl-6">
              <Bullet>
                Owners can either select current owner and log in or fill out an
                application to be considered by our management team.
              </Bullet>
            </ul>
          </section>
        </article>
      </main>
    </div>
  );
}
