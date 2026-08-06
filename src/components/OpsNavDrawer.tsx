"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Landmark, LogOut, PanelLeftOpen, X } from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import type { HrOpsModule } from "@/lib/hr";
import {
  filterOpsWindows,
  isOpsWindowActive,
  OPS_WINDOWS,
} from "@/lib/ops-windows";

function isOpsHome(pathname: string) {
  return pathname === "/ops" || pathname === "/ops/";
}

/**
 * Shared navigation for every team member window so switching dashboards does
 * not require returning to the operations console first.
 *
 * On Operations home the panel stays pinned open. Navigating to a department
 * minimizes it to the left-edge Windows tab so it can be pulled out later.
 */
export function OpsNavDrawer({
  allowedModules,
}: {
  /** null = admin (all modules); array = employee grants */
  allowedModules: HrOpsModule[] | null;
}) {
  const pathname = usePathname();
  const onHome = isOpsHome(pathname);
  const [open, setOpen] = useState(onHome);
  const [shownPath, setShownPath] = useState(pathname);
  const windows = filterOpsWindows(OPS_WINDOWS, allowedModules);

  // Pin open on home; minimize once navigation to another window commits.
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setOpen(isOpsHome(pathname));
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !onHome) setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onHome]);

  const current = windows.find((item) =>
    isOpsWindowActive(pathname, item.href)
  );

  const panel = (
    <nav
      aria-label="Team member windows"
      className={`relative flex h-full w-72 max-w-[85vw] flex-col bg-[var(--harbor-ink)] text-[var(--harbor-sand)] shadow-2xl ${
        onHome && open ? "border-r border-[var(--harbor-sand)]/15" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--harbor-sand)]/15 px-4 py-3">
        <div>
          <p className="font-display text-xl leading-tight">Harborline</p>
          <p className="text-[10px] opacity-70">
            Team member windows
            {current ? ` · ${current.label}` : ""}
          </p>
        </div>
        {!onHome ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="btn btn-xs btn-ghost btn-circle text-[var(--harbor-sand)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <ul className="flex-1 space-y-0.5 px-2.5 py-2">
        {windows.map(({ href, label, hint, icon: Icon }) => {
          const active = isOpsWindowActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 transition ${
                  active
                    ? "bg-[var(--harbor-sand)] text-[var(--harbor-ink)]"
                    : "hover:bg-[var(--harbor-sand)]/10"
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
                <span>
                  <span className="block text-xs font-semibold leading-snug">
                    {label}
                  </span>
                  <span
                    className={`block text-[10px] leading-snug ${
                      active ? "opacity-60" : "opacity-55"
                    }`}
                  >
                    {hint}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="space-y-1 border-t border-[var(--harbor-sand)]/15 px-4 py-2.5">
        {allowedModules === null || allowedModules.includes("banks") ? (
          <Link
            href="/ops/banks"
            className="btn btn-xs btn-ghost h-8 w-full justify-start gap-2 text-[var(--harbor-sand)]"
          >
            <Landmark className="h-3.5 w-3.5" />
            Banks
          </Link>
        ) : null}
        <form action={teamLogout}>
          <button
            type="submit"
            className="btn btn-xs btn-ghost h-8 w-full justify-start gap-2 text-[var(--harbor-sand)]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );

  return (
    <>
      {/* Edge tab — shown when the menu is minimized */}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-label="Open the team member window menu"
          className="fixed left-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-2 rounded-r-xl border border-l-0 border-[var(--harbor-sand)]/20 bg-[var(--harbor-ink)] py-4 pl-2 pr-3 text-[var(--harbor-sand)] shadow-lg transition hover:pr-4"
        >
          <PanelLeftOpen className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wide [writing-mode:vertical-rl]">
            Windows
          </span>
        </button>
      ) : null}

      {/* Pinned sidebar on Operations home */}
      {open && onHome ? (
        <div className="fixed inset-y-0 left-0 z-40">{panel}</div>
      ) : null}

      {/* Pull-out overlay when opened off the home page */}
      {open && !onHome ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close the team member window menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[var(--harbor-ink)]/55"
          />
          <div className="relative z-10">{panel}</div>
        </div>
      ) : null}
    </>
  );
}
