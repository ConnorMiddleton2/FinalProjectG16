"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Building2, Inbox, LogOut, Wrench } from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import { OperatingExpensesPayable } from "@/components/AccountsPayableDashboard";
import { ApApprovalQueue } from "@/components/ApApprovalQueue";
import { MonthlyMarginPanel } from "@/components/MonthlyMarginPanel";
import { OwnerPayablesPanel } from "@/components/OwnerPayablesPanel";

type ApTab = "expenses" | "owners" | "queue";

const TABS: {
  id: ApTab;
  label: string;
  description: string;
  icon: typeof Wrench;
}[] = [
  {
    id: "expenses",
    label: "Operating expenses",
    description: "Vendor invoices for maintenance, utilities, and other ops costs (includes Management-approved queue items)",
    icon: Wrench,
  },
  {
    id: "owners",
    label: "Payable to owners",
    description: "Rental distributions after the 10% management fee",
    icon: Building2,
  },
  {
    id: "queue",
    label: "Approved payment queue",
    description: "Expenses Management approved and released for payment",
    icon: Inbox,
  },
];

export function AccountsPayableDashboard() {
  const [tab, setTab] = useState<ApTab>("expenses");

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Accounts payable</p>
          </div>
          <form action={teamLogout}>
            <button
              type="submit"
              className="btn btn-sm btn-ghost gap-1 text-[var(--harbor-sand)]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        <Link
          href="/ops"
          className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to operations
        </Link>

        <div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
            Accounts payable
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
            Separate operating-expense vendor bills from amounts Harborline owes
            property owners after its 10% management fee, and work the queue of
            expenses Management has released for payment. Switch tabs below; the
            header stays the same for every view.
          </p>
        </div>

        <MonthlyMarginPanel />

        <div
          role="tablist"
          aria-label="Accounts payable sections"
          className="grid gap-3 sm:grid-cols-3"
        >
          {TABS.map(({ id, label, description, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                className={`rounded-2xl border px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 ${
                  active
                    ? "border-[var(--harbor-ink)] bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                    : "border-[var(--harbor-deep)]/15 bg-white/85 text-[var(--harbor-ink)]"
                }`}
              >
                <Icon className="h-5 w-5 opacity-80" />
                <p className="mt-2 text-lg font-semibold">{label}</p>
                <p
                  className={`mt-1 text-sm ${
                    active ? "opacity-75" : "opacity-60"
                  }`}
                >
                  {description}
                </p>
              </button>
            );
          })}
        </div>

        <div role="tabpanel">
          {tab === "expenses" ? <OperatingExpensesPayable /> : null}
          {tab === "owners" ? <OwnerPayablesPanel /> : null}
          {tab === "queue" ? <ApApprovalQueue /> : null}
        </div>
      </main>
    </div>
  );
}
