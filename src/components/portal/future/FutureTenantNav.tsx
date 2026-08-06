"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import {
  FUTURE_PRIMARY_NAV,
  FUTURE_SHORTCUTS,
  isFutureNavActive,
  type FutureNavItem,
} from "@/lib/portal/future/nav";

type Props = {
  id?: string;
  onNavigate?: () => void;
  onBack?: () => void;
  onSignOut?: () => void;
  signingOut?: boolean;
  signedIn?: boolean;
  className?: string;
};

function NavList({
  items,
  onNavigate,
  labelledBy,
}: {
  items: FutureNavItem[];
  onNavigate?: () => void;
  labelledBy?: string;
}) {
  const pathname = usePathname();

  return (
    <ul className="space-y-1" aria-labelledby={labelledBy}>
      {items.map((item) => {
        const active = isFutureNavActive(pathname, item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={item.description}
              onClick={onNavigate}
              className={`flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors portal-focus ${
                active
                  ? "bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                  : "text-[var(--harbor-ink)]/80 hover:bg-[var(--harbor-mist)]/70 hover:text-[var(--harbor-ink)]"
              }`}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function FutureTenantNav({
  id,
  onNavigate,
  onBack,
  onSignOut,
  signingOut = false,
  signedIn = false,
  className = "",
}: Props) {
  return (
    <div className={`flex h-full flex-col gap-6 ${className}`}>
      <nav id={id} aria-label="Future tenant portal" className="flex-1">
        <p
          id="future-nav-primary-label"
          className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45"
        >
          Leasing
        </p>
        <NavList
          items={FUTURE_PRIMARY_NAV}
          onNavigate={onNavigate}
          labelledBy="future-nav-primary-label"
        />

        <p
          id="future-nav-shortcuts-label"
          className="mb-2 mt-5 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45"
        >
          Shortcuts
        </p>
        <NavList
          items={FUTURE_SHORTCUTS}
          onNavigate={onNavigate}
          labelledBy="future-nav-shortcuts-label"
        />
      </nav>

      <div className="space-y-2 border-t border-[var(--harbor-deep)]/10 pt-4">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-h-11 w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-[var(--harbor-ink)]/80 transition-colors hover:bg-[var(--harbor-mist)]/70 portal-focus"
        >
          Website home
        </Link>
        {onBack ? (
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              onBack();
            }}
            className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--harbor-ink)]/80 transition-colors hover:bg-[var(--harbor-mist)]/70 portal-focus"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            Back
          </button>
        ) : null}
        {signedIn && onSignOut ? (
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              onSignOut();
            }}
            disabled={signingOut}
            className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--harbor-ink)]/80 transition-colors hover:bg-[var(--harbor-mist)]/70 portal-focus disabled:opacity-60"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
