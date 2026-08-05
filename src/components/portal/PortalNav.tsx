"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

const PRIMARY_LINKS = [
  { href: "/portal", label: "Home", exact: true },
  { href: "/portal/units", label: "Available Units" },
  { href: "/portal/tours", label: "Schedule a Tour" },
  { href: "/portal/apply", label: "Apply" },
  { href: "/portal/applications", label: "Application Status" },
  { href: "/portal/offers", label: "Lease Offers" },
  { href: "/portal/move-in", label: "Move-In" },
  { href: "/portal/messages", label: "Messages" },
  { href: "/portal/profile", label: "Applicant Profile" },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  if (href === "/portal/units") {
    return (
      pathname === "/portal/units" ||
      (pathname.startsWith("/portal/units/") &&
        !pathname.startsWith("/portal/units/saved"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Future tenant portal"
      className="border-b border-[var(--harbor-deep)]/10 bg-white/55"
    >
      <div className="mx-auto hidden max-w-6xl items-center gap-1 overflow-x-auto px-6 py-2 lg:flex">
        {PRIMARY_LINKS.map(({ href, label, ...rest }) => {
          const exact = "exact" in rest ? rest.exact : false;
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`btn btn-sm shrink-0 ${
                active ? "btn-neutral" : "btn-ghost"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <details className="group mx-auto max-w-6xl lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-3 text-sm font-semibold text-[var(--harbor-ink)]">
          <span className="inline-flex items-center gap-2">
            <Menu className="h-4 w-4" />
            Portal menu
          </span>
          <span className="text-xs font-normal opacity-60">
            {PRIMARY_LINKS.find(({ href, ...rest }) =>
              isActive(pathname, href, "exact" in rest ? rest.exact : false)
            )?.label ?? "Navigate"}
          </span>
        </summary>
        <div className="grid grid-cols-1 gap-1 border-t border-[var(--harbor-deep)]/10 px-4 py-3 sm:grid-cols-2">
          {PRIMARY_LINKS.map(({ href, label, ...rest }) => {
            const exact = "exact" in rest ? rest.exact : false;
            const active = isActive(pathname, href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={`btn btn-sm justify-start ${
                  active ? "btn-neutral" : "btn-ghost"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </details>
    </nav>
  );
}
