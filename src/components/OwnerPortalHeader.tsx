"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  ClipboardCheck,
  FilePlus2,
  FileText,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { ownerLogout } from "@/app/owners/actions";
import { BrandLogo } from "@/components/BrandLogo";
import { COMPANY_SHORT } from "@/lib/brand";

const NAV = [
  { href: "/owners/dashboard", label: "Portfolio", match: "exact" as const },
  {
    href: "/owners/dashboard/apply",
    label: "Apply",
    match: "prefix" as const,
    icon: FilePlus2,
  },
  {
    href: "/owners/dashboard/contracts",
    label: "Contracts",
    match: "prefix" as const,
    icon: FileText,
  },
  {
    href: "/owners/dashboard/approvals",
    label: "Approvals",
    match: "prefix" as const,
    icon: ClipboardCheck,
  },
];

function isActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OwnerPortalHeader({
  subtitle,
  pendingApprovals = 0,
}: {
  subtitle: string;
  pendingApprovals?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--harbor-deep)]/15 bg-[var(--harbor-ink)]/95 text-[var(--harbor-sand)] backdrop-blur-md print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/owners/dashboard"
          className="flex min-w-0 items-center gap-2.5 transition hover:opacity-90"
          onClick={() => setOpen(false)}
        >
          <BrandLogo size="sm" onDark />
          <span className="min-w-0">
            <p className="font-display text-xl leading-tight sm:text-2xl">
              {COMPANY_SHORT}
            </p>
            <p className="truncate text-xs opacity-70">{subtitle}</p>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Owner">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href, item.match);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--harbor-sand)]/15 text-[var(--harbor-sand)]"
                    : "text-[var(--harbor-sand)]/75 hover:bg-white/5 hover:text-[var(--harbor-sand)]"
                }`}
              >
                {Icon ? <Icon className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                {item.label}
                {item.href.includes("approvals") && pendingApprovals > 0 ? (
                  <span className="owner-badge-pulse badge badge-warning badge-sm">
                    {pendingApprovals}
                  </span>
                ) : null}
                {active ? (
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[var(--harbor-glow)]" />
                ) : null}
              </Link>
            );
          })}
          <form action={ownerLogout} className="ml-1">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-[var(--harbor-sand)]/80 transition hover:bg-white/5 hover:text-[var(--harbor-sand)]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </nav>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/15 md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/10 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Owner mobile">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href, item.match);
              const Icon = item.icon ?? Building2;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    active
                      ? "bg-[var(--harbor-sand)]/15"
                      : "hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.href.includes("approvals") && pendingApprovals > 0 ? (
                    <span className="badge badge-warning badge-sm">
                      {pendingApprovals}
                    </span>
                  ) : null}
                </Link>
              );
            })}
            <form action={ownerLogout}>
              <button
                type="submit"
                className="inline-flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-white/5"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
