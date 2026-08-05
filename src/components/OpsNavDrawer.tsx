"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, PanelLeftOpen, X } from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import type { HrOpsModule } from "@/lib/hr";
import {
  filterOpsWindows,
  isOpsWindowActive,
  OPS_WINDOWS,
} from "@/lib/ops-windows";

/**
 * Shared navigation for every team member window so switching dashboards does
 * not require returning to the operations console first.
 */
export function OpsNavDrawer({
  allowedModules,
}: {
  /** null = admin (all modules); array = employee grants */
  allowedModules: HrOpsModule[] | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [shownPath, setShownPath] = useState(pathname);
  const windows = filterOpsWindows(OPS_WINDOWS, allowedModules);

  // Close once navigation actually commits, so the menu stays up while a slower
  // window is still loading instead of leaving the user on the old page.
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const current = windows.find((item) =>
    isOpsWindowActive(pathname, item.href)
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label="Open the team member window menu"
        className="fixed left-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-2 rounded-r-xl border border-l-0 border-[var(--harbor-sand)]/20 bg-[var(--harbor-ink)] py-4 pl-2 pr-3 text-[var(--harbor-sand)] shadow-lg transition hover:pr-4"
      >
        <PanelLeftOpen className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wide [writing-mode:vertical-rl]">
          Windows
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close the team member window menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[var(--harbor-ink)]/55"
          />

          <nav
            aria-label="Team member windows"
            className="relative flex h-full w-80 max-w-[85vw] flex-col bg-[var(--harbor-ink)] text-[var(--harbor-sand)] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[var(--harbor-sand)]/15 px-5 py-4">
              <div>
                <p className="font-display text-2xl leading-tight">Harborline</p>
                <p className="text-xs opacity-70">
                  Team member windows
                  {current ? ` · ${current.label}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="btn btn-sm btn-ghost btn-circle text-[var(--harbor-sand)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {windows.map(({ href, label, hint, icon: Icon }) => {
                const active = isOpsWindowActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition ${
                        active
                          ? "bg-[var(--harbor-sand)] text-[var(--harbor-ink)]"
                          : "hover:bg-[var(--harbor-sand)]/10"
                      }`}
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 opacity-80" />
                      <span>
                        <span className="block text-sm font-semibold">
                          {label}
                        </span>
                        <span
                          className={`block text-xs ${
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

            <form
              action={teamLogout}
              className="border-t border-[var(--harbor-sand)]/15 px-5 py-4"
            >
              <button
                type="submit"
                className="btn btn-sm btn-ghost w-full justify-start gap-2 text-[var(--harbor-sand)]"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </nav>
        </div>
      ) : null}
    </>
  );
}
