"use client";

import { useId, useState } from "react";
import { usePathname } from "next/navigation";
import { PortalBreadcrumbs } from "@/components/portal/PortalBreadcrumbs";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalNav } from "@/components/portal/PortalNav";
import {
  getPortalBreadcrumbs,
  resolvePortalPageMeta,
} from "@/lib/portal/nav";

type Props = {
  email: string;
  displayName: string;
  isSignedIn: boolean;
  children: React.ReactNode;
};

/** Reusable tenant portal chrome for all /portal pages (main-dash tenant entry). */
export function PortalShell({
  email,
  displayName,
  isSignedIn,
  children,
}: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileNavId = useId();
  const meta = resolvePortalPageMeta(pathname);
  const breadcrumbs = getPortalBreadcrumbs(pathname);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3efe6_0%,#e8f4f6_100%)]">
      <PortalHeader
        email={email}
        displayName={displayName}
        isSignedIn={isSignedIn}
        mobileNavId={mobileNavId}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-[var(--harbor-ink)]/40 lg:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:py-8">
        <aside
          id={mobileNavId}
          className={`z-50 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-3 shadow-sm lg:sticky lg:top-6 lg:z-auto lg:block lg:self-start ${
            mobileOpen
              ? "fixed left-4 right-4 top-20 max-h-[calc(100vh-6rem)] overflow-y-auto"
              : "hidden"
          }`}
        >
          <PortalNav onNavigate={() => setMobileOpen(false)} />
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="space-y-3">
            <PortalBreadcrumbs items={breadcrumbs} />
            <header className="space-y-2">
              <h1 className="font-display text-3xl tracking-tight text-[var(--harbor-ink)] sm:text-4xl">
                {meta.title}
              </h1>
              <p className="max-w-2xl text-[var(--harbor-ink)]/70">
                {meta.description}
              </p>
            </header>
          </div>

          <main id="tenant-portal-main" className="min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
