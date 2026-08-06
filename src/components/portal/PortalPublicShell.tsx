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
 * Lightweight chrome for public portal routes (apply, unauthorized).
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
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f3efe6_0%,#e8f4f6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href={PORTAL_START_PATH}
            className="flex min-w-0 items-center gap-3 rounded-lg portal-focus"
          >
            <span className="rounded-xl bg-[var(--harbor-sand)]/15 p-2">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="font-display block truncate text-xl leading-tight sm:text-2xl">
                Harborline
              </span>
              <span className="block truncate text-xs text-[var(--harbor-sand)]/80">
                {contextLabel}
              </span>
            </span>
          </Link>

          <nav
            aria-label="Future tenant"
            className="flex flex-wrap items-center gap-2"
          >
            <Link
              href="/"
              className="btn btn-ghost min-h-11 text-[var(--harbor-sand)] portal-focus"
            >
              Welcome
            </Link>
            <Link
              href={PORTAL_START_PATH}
              className="btn btn-ghost min-h-11 gap-1 text-[var(--harbor-sand)] portal-focus"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Choose path
            </Link>
            <Link
              href={PORTAL_APPLY_PATH}
              className="btn btn-ghost min-h-11 text-[var(--harbor-sand)] portal-focus"
              aria-current={
                pathname === PORTAL_APPLY_PATH ||
                pathname.startsWith(`${PORTAL_APPLY_PATH}/`)
                  ? "page"
                  : undefined
              }
            >
              Apply
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <header className="space-y-2">
          <h1 className="font-display text-3xl tracking-tight text-[var(--harbor-ink)] sm:text-4xl">
            {meta.title}
          </h1>
          <p className="max-w-2xl text-[var(--harbor-muted)]">{meta.description}</p>
        </header>
        <main id="tenant-portal-main" className="min-w-0" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
