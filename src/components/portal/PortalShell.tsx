"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PortalBreadcrumbs } from "@/components/portal/PortalBreadcrumbs";
import { PortalHeader } from "@/components/portal/PortalHeader";
import { PortalNav } from "@/components/portal/PortalNav";
import { usePortalModal } from "@/hooks/usePortalModal";
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
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const meta = resolvePortalPageMeta(pathname);
  const breadcrumbs = getPortalBreadcrumbs(pathname);

  const closeMobileNav = () => setMobileOpen(false);
  const { containerRef } = usePortalModal({
    open: mobileOpen,
    onClose: closeMobileNav,
    restoreFocusRef: menuButtonRef,
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--harbor-sand)]">
      <a
        href="#tenant-portal-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-[var(--harbor-ink)] focus:shadow-lg portal-focus"
      >
        Skip to main content
      </a>

      <PortalHeader
        email={email}
        displayName={displayName}
        isSignedIn={isSignedIn}
        mobileNavId={mobileNavId}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        menuButtonRef={menuButtonRef}
      />

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[var(--harbor-ink)]/40 lg:hidden"
          aria-label="Close navigation menu"
          onClick={closeMobileNav}
        />
      ) : null}

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:py-8">
        <aside
          id={mobileNavId}
          ref={mobileOpen ? containerRef : undefined}
          role={mobileOpen ? "dialog" : undefined}
          aria-modal={mobileOpen ? true : undefined}
          aria-label="Main navigation"
          tabIndex={mobileOpen ? -1 : undefined}
          className={`z-50 rounded-2xl border border-[var(--harbor-ink)] bg-[var(--harbor-ink)] p-3 text-[var(--harbor-on-dark)] shadow-sm outline-none lg:sticky lg:top-6 lg:z-auto lg:block lg:self-start ${
            mobileOpen
              ? "fixed left-4 right-4 top-20 max-h-[calc(100vh-6rem)] overflow-y-auto"
              : "hidden lg:block"
          }`}
        >
          <PortalNav onNavigate={closeMobileNav} />
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="space-y-3">
            <PortalBreadcrumbs items={breadcrumbs} />
            <header className="space-y-2">
              <h1 className="font-display text-3xl tracking-tight text-[var(--harbor-ink)] sm:text-4xl">
                {meta.title}
              </h1>
              <p className="max-w-2xl text-[var(--harbor-muted)]">
                {meta.description}
              </p>
            </header>
          </div>

          <main id="tenant-portal-main" className="min-w-0" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
