"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, FilePlus2, Home, LogOut } from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import { MonthlyMarginPanel } from "@/components/MonthlyMarginPanel";
import { ReceivablesPanel } from "@/components/ReceivablesPanel";

type ArTab = "rental" | "miscellaneous";

const TABS = [
  {
    id: "rental" as const,
    label: "Rental income receivable",
    description: "Tenant rent, CAM / NNN recoveries, late fees, and related charges",
    icon: Home,
  },
  {
    id: "miscellaneous" as const,
    label: "Miscellaneous",
    description: "Applications, damages, access cards, utilities, and other charges",
    icon: FilePlus2,
  },
];

export function AccountsReceivableDashboard() {
  const [tab, setTab] = useState<ArTab>("rental");

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Accounts receivable</p>
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
            Accounts receivable
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
            Track rental income separately from miscellaneous tenant and
            customer charges, record collections, and monitor overdue or
            disputed balances.
          </p>
        </div>

        <MonthlyMarginPanel />

        <div
          role="tablist"
          aria-label="Accounts receivable sections"
          className="grid gap-3 sm:grid-cols-2"
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
                <p className={`mt-1 text-sm ${active ? "opacity-75" : "opacity-60"}`}>
                  {description}
                </p>
              </button>
            );
          })}
        </div>

        <div role="tabpanel">
          <ReceivablesPanel key={tab} kind={tab} />
        </div>
      </main>
    </div>
  );
}
