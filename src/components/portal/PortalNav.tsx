"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isPortalNavActive,
  PORTAL_FUTURE_TENANT_LINK,
  PORTAL_HELP_HREF,
  PORTAL_HELP_LABEL,
  PORTAL_PRIMARY_NAV,
  PORTAL_SECONDARY_ACTIONS,
} from "@/lib/portal/nav";

type Props = {
  id?: string;
  onNavigate?: () => void;
  className?: string;
};

export function PortalNav({ id, onNavigate, className = "" }: Props) {
  const pathname = usePathname();

  return (
    <div className={`flex h-full flex-col gap-6 ${className}`}>
      <nav id={id} aria-label="Tenant portal" className="flex-1">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
          Current tenant
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
      </nav>

      <div className="space-y-3 border-t border-[var(--harbor-deep)]/10 pt-4">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
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
                      ? "bg-[var(--harbor-mid)] text-white"
                      : "text-[var(--harbor-deep)] hover:bg-[var(--harbor-sand)]"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="space-y-1 border-t border-[var(--harbor-deep)]/10 pt-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
            Future tenant
          </p>
          <Link
            href={PORTAL_FUTURE_TENANT_LINK.href}
            title={PORTAL_FUTURE_TENANT_LINK.description}
            onClick={onNavigate}
            aria-current={
              isPortalNavActive(pathname, PORTAL_FUTURE_TENANT_LINK)
                ? "page"
                : undefined
            }
            className={`flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)] ${
              isPortalNavActive(pathname, PORTAL_FUTURE_TENANT_LINK)
                ? "bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                : "text-[var(--harbor-ink)]/80 hover:bg-[var(--harbor-mist)]/70"
            }`}
          >
            {PORTAL_FUTURE_TENANT_LINK.label}
          </Link>
        </div>

        <Link
          href={PORTAL_HELP_HREF}
          onClick={onNavigate}
          className="btn btn-outline btn-sm w-full justify-start border-[var(--harbor-deep)]/20 text-[var(--harbor-ink)]"
        >
          {PORTAL_HELP_LABEL}
        </Link>
      </div>
    </div>
  );
}
