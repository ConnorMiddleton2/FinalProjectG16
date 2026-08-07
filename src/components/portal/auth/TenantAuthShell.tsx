import Link from "next/link";
import { PORTAL_START_PATH } from "@/lib/portal/auth";
import { BrandLogo } from "@/components/BrandLogo";
import { COMPANY_SHORT } from "@/lib/brand";

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
};

/** Dedicated chrome for tenant portal login / signup / reset. */
export function TenantAuthShell({ children, title, subtitle }: Props) {
  return (
    <div className="portal-page-bg min-h-screen overflow-x-hidden">
      <a
        href="#tenant-auth-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-[var(--harbor-ink)] focus:shadow-lg portal-focus"
      >
        Skip to main content
      </a>

      <header className="border-b border-[var(--harbor-deep)]/15 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href={PORTAL_START_PATH}
            className="flex min-w-0 items-center gap-2.5 rounded-lg portal-focus focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-glow)]"
          >
            <BrandLogo size="sm" onDark />
            <span className="min-w-0">
              <span className="font-display block truncate text-lg leading-tight sm:text-xl">
                {COMPANY_SHORT}
              </span>
              <span className="block truncate text-[11px] text-[var(--harbor-sand)]/80 sm:text-xs">
                Tenant portal
              </span>
            </span>
          </Link>
          <Link
            href="/"
            className="btn btn-ghost btn-sm min-h-11 text-[var(--harbor-sand)] portal-focus"
          >
            Website home
          </Link>
        </div>
      </header>

      <main
        id="tenant-auth-main"
        className="mx-auto flex w-full max-w-lg flex-col px-4 py-8 sm:px-6 sm:py-12"
      >
        <div className="mb-6 space-y-2">
          <h1 className="font-display text-3xl tracking-tight text-[var(--harbor-ink)] sm:text-4xl">
            {title}
          </h1>
          <p className="text-sm text-[var(--harbor-muted)] sm:text-base">
            {subtitle}
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}
