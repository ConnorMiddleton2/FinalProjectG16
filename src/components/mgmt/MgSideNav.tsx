"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { COLLECTIONS, useSharedCollection } from "@/hooks/useSharedCollection";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  BUDGETS_HREF,
  COMPANY_BUDGET_VIEW,
  MG_NAV,
} from "@/components/mgmt/mg-nav";

type Props = {
  activeNavHref: string;
};

function propertyHref(property: string) {
  return `${BUDGETS_HREF}?property=${encodeURIComponent(property)}`;
}

function MgSideNavInner({ activeNavHref }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const budgetsActive =
    activeNavHref === BUDGETS_HREF || pathname.startsWith(BUDGETS_HREF);

  const { items: properties } = useSharedCollection<ManagementContractDraft>(
    COLLECTIONS.managedProperties
  );

  const propertyOptions = useMemo(
    () =>
      [...properties]
        .map((p) => ({
          id: p.id,
          name: p.propertyName || "Untitled property",
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [properties]
  );

  const selected = searchParams.get("property") ?? "";

  return (
    <aside className="rounded-2xl border border-[var(--harbor-ink)] bg-[var(--harbor-ink)] p-3 text-[var(--harbor-on-dark)] lg:sticky lg:top-6 lg:self-start">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--harbor-on-dark)]/55">
        Management
      </p>
      <nav className="flex flex-row flex-wrap gap-2 lg:flex-col lg:gap-1">
        <Link
          href="/ops/management"
          className="rounded-lg px-3 py-2 text-sm text-[var(--harbor-on-dark)]/80 transition hover:bg-white/10"
        >
          Hub overview
        </Link>
        {MG_NAV.map((item) => {
          const active = activeNavHref === item.href;
          const isBudgets = item.href === BUDGETS_HREF;
          return (
            <div key={item.href} className="w-full min-w-0">
              <Link
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--harbor-mid)] text-[var(--harbor-on-dark)] shadow-sm"
                    : "text-[var(--harbor-on-dark)]/85 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
              {isBudgets && budgetsActive ? (
                <div className="mt-1 space-y-0.5 border-l border-white/20 py-0.5 pl-2 ml-2">
                  <Link
                    href={BUDGETS_HREF}
                    className={`block rounded-md px-2 py-1 text-[11px] leading-tight transition ${
                      !selected
                        ? "bg-white/15 font-semibold text-[var(--harbor-on-dark)]"
                        : "text-[var(--harbor-on-dark)]/70 hover:bg-white/10"
                    }`}
                  >
                    All properties
                  </Link>
                  <Link
                    href={propertyHref(COMPANY_BUDGET_VIEW)}
                    className={`block rounded-md px-2 py-1 text-[11px] leading-tight transition ${
                      selected === COMPANY_BUDGET_VIEW
                        ? "bg-white/15 font-semibold text-[var(--harbor-on-dark)]"
                        : "text-[var(--harbor-on-dark)]/70 hover:bg-white/10"
                    }`}
                  >
                    Company net
                  </Link>
                  {propertyOptions.map((p) => (
                    <Link
                      key={p.id}
                      href={propertyHref(p.id)}
                      className={`block truncate rounded-md px-2 py-1 text-[11px] leading-tight transition ${
                        selected === p.id
                          ? "bg-white/15 font-semibold text-[var(--harbor-on-dark)]"
                          : "text-[var(--harbor-on-dark)]/70 hover:bg-white/10"
                      }`}
                      title={p.name}
                    >
                      {p.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export function MgSideNav(props: Props) {
  return (
    <Suspense
      fallback={
        <aside className="rounded-2xl border border-[var(--harbor-ink)] bg-[var(--harbor-ink)] p-3 lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--harbor-on-dark)]/55">
            Management
          </p>
          <nav className="flex flex-col gap-1">
            <div className="h-8 animate-pulse rounded-lg bg-white/10" />
            <div className="h-8 animate-pulse rounded-lg bg-white/10" />
          </nav>
        </aside>
      }
    >
      <MgSideNavInner {...props} />
    </Suspense>
  );
}
