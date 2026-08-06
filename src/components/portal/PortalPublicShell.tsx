import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import {
  PORTAL_APPLY_PATH,
  PORTAL_START_PATH,
} from "@/lib/portal/auth";
import { resolvePortalPageMeta } from "@/lib/portal/nav";

type Props = {
  children: React.ReactNode;
  /** Pathname for page title meta — pass from layout via headers or hardcode in pages. */
  pathname?: string;
};

/**
 * Lightweight chrome for public portal routes (unauthorized).
 * Does not expose current-tenant navigation (those routes require login).
 */
export function PortalPublicShell({
  children,
  pathname = PORTAL_APPLY_PATH,
}: Props) {
  const meta = resolvePortalPageMeta(pathname);
  const isUnauthorized = pathname.startsWith("/portal/unauthorized");
  const contextLabel = isUnauthorized ? "Portal access" : "Future tenant";

  return (
    <div className="portal-page-bg min-h-screen overflow-x-hidden">
      <a
        href="#tenant-portal-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-[var(--harbor-ink)] focus:shadow-lg portal-focus"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b border-[var(--harbor-deep)]/15 bg-[var(--harbor-ink)] text-[var(--harbor-sand)] shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
          <Link
            href={PORTAL_START_PATH}
            className="flex min-w-0 items-center gap-2.5 rounded-lg portal-focus focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-glow)]"
          >
            <span className="rounded-xl bg-[var(--harbor-sand)]/15 p-2">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="font-display block truncate text-lg leading-tight sm:text-2xl">
                Harborline
              </span>
              <span className="block truncate text-[11px] text-[var(--harbor-sand)]/80 sm:text-xs">
                {contextLabel}
              </span>
            </span>
          </Link>

          <nav
            aria-label="Future tenant"
            className="flex flex-wrap items-center gap-1 sm:gap-2"
          >
            <Link
              href="/"
              className="btn btn-ghost min-h-11 text-[var(--harbor-sand)] portal-focus"
            >
              Website home
            </Link>
            <Link
              href={PORTAL_START_PATH}
              className="btn btn-ghost min-h-11 gap-1 text-[var(--harbor-sand)] portal-focus"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Choose path</span>
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 lg:py-8">
        <header className="portal-card space-y-1.5 p-4 sm:p-5">
          <h1 className="font-display text-2xl tracking-tight text-[var(--harbor-ink)] sm:text-3xl lg:text-4xl">
            {meta.title}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed portal-muted sm:text-base">
            {meta.description}
          </p>
        </header>
        <main id="tenant-portal-main" className="min-w-0" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
