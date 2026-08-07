"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isPortalNavActive,
  PORTAL_PRIMARY_NAV,
  PORTAL_SECONDARY_ACTIONS,
} from "@/lib/portal/nav";
import { PORTAL_APPLY_PATH, PORTAL_START_PATH } from "@/lib/portal/auth";

type Props = {
  id?: string;
  onNavigate?: () => void;
  className?: string;
};

/** Current-tenant portal sidebar (dark teal panel). */
export function PortalNav({ id, onNavigate, className = "" }: Props) {
  const pathname = usePathname();

  return (
    <div className={`flex h-full flex-col gap-6 ${className}`}>
      <nav id={id} aria-label="Tenant portal" className="flex-1">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-on-dark)]/55">
          Tenant portal
        </p>
        <ul className="space-y-1">
          {PORTAL_PRIMARY_NAV.map((item) => {
            const active = isPortalNavActive(pathname, item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={item.description}
                  onClick={onNavigate}
                  className={`flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)] ${
                    active
                      ? "bg-[var(--harbor-mid)] text-[var(--harbor-on-dark)]"
                      : "text-[var(--harbor-on-dark)]/85 hover:bg-white/10 hover:text-[var(--harbor-on-dark)]"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-white/15 pt-4">
        {PORTAL_SECONDARY_ACTIONS.length > 0 ? (
          <>
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-on-dark)]/55">
              Actions
            </p>
            <ul className="space-y-1">
              {PORTAL_SECONDARY_ACTIONS.map((item) => {
                const active = isPortalNavActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      title={item.description}
                      onClick={onNavigate}
                      className={`flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)] ${
                        active
                          ? "bg-[var(--harbor-mid)] text-[var(--harbor-on-dark)]"
                          : "text-[var(--harbor-on-dark)]/80 hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        <div className="space-y-1">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-on-dark)]/55">
            New application
          </p>
          <Link
            href={PORTAL_START_PATH}
            title="Browse properties and start an application"
            onClick={onNavigate}
            className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-[var(--harbor-on-dark)]/80 transition-colors hover:bg-white/10"
          >
            Browse properties
          </Link>
          <Link
            href={PORTAL_APPLY_PATH}
            title="Start a leasing application"
            onClick={onNavigate}
            className="flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium text-[var(--harbor-on-dark)]/80 transition-colors hover:bg-white/10"
          >
            Start application
          </Link>
        </div>
      </div>
    </div>
  );
}
