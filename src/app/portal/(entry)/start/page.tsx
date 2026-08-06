import Link from "next/link";
import { ArrowLeft, ClipboardList, KeyRound } from "lucide-react";
import {
  PORTAL_APPLY_PATH,
  PORTAL_HOME_PATH,
  PORTAL_LOGIN_PATH,
} from "@/lib/portal/auth";

const CURRENT_TENANT_HREF = `${PORTAL_LOGIN_PATH}?next=${encodeURIComponent(PORTAL_HOME_PATH)}`;

/**
 * After the welcome “tenant or future tenant” CTA — pick which experience to open.
 */
export default function PortalStartPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <div
        className="absolute inset-0 welcome-wash"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(31,122,140,0.22), transparent 50%), radial-gradient(ellipse 50% 40% at 90% 80%, rgba(240,194,122,0.18), transparent 45%), linear-gradient(165deg, #f3efe6 0%, #d7eef2 48%, #134e5a 100%)",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16 sm:px-10">
        <Link
          href="/"
          className="absolute left-6 top-6 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-[var(--harbor-ink)]/80 transition hover:text-[var(--harbor-ink)] portal-focus sm:left-10 sm:top-10"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Harborline
        </Link>

        <div className="welcome-rise">
          <p className="font-display text-4xl tracking-tight text-[var(--harbor-ink)] sm:text-5xl">
            Harborline
          </p>
          <h1 className="mt-4 text-2xl font-semibold leading-snug text-[var(--harbor-deep)] sm:text-3xl">
            Are you a current tenant or a future tenant?
          </h1>
          <p className="mt-3 max-w-lg text-base text-[var(--harbor-muted)] sm:text-lg">
            Choose the path that matches your situation so we can open the right
            tools.
          </p>
        </div>

        <ul className="mt-10 grid list-none gap-4 p-0 sm:grid-cols-2 welcome-rise-delay">
          <li>
            <Link
              href={CURRENT_TENANT_HREF}
              className="group flex min-h-[11rem] h-full flex-col justify-between rounded-2xl bg-[var(--harbor-ink)] px-6 py-6 text-[var(--harbor-sand)] shadow-lg transition hover:-translate-y-0.5 hover:bg-[var(--harbor-deep)] portal-focus portal-motion-safe"
            >
              <div className="flex items-start gap-3">
                <KeyRound
                  className="mt-0.5 h-6 w-6 shrink-0 opacity-90"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-lg font-semibold leading-tight">
                    Current tenant
                  </p>
                  <p className="mt-2 text-sm opacity-80">
                    Already leasing with Harborline — pay rent, request
                    maintenance, view your lease, and message management.
                  </p>
                </div>
              </div>
              <span className="mt-6 text-sm font-medium opacity-90 group-hover:opacity-100">
                Continue to sign in →
              </span>
            </Link>
          </li>

          <li>
            <Link
              href={PORTAL_APPLY_PATH}
              className="group flex min-h-[11rem] h-full flex-col justify-between rounded-2xl border border-[var(--harbor-deep)]/15 bg-[var(--harbor-sand)] px-6 py-6 text-[var(--harbor-ink)] shadow-lg transition hover:-translate-y-0.5 hover:border-[var(--harbor-mid)] portal-focus portal-motion-safe"
            >
              <div className="flex items-start gap-3">
                <ClipboardList
                  className="mt-0.5 h-6 w-6 shrink-0 text-[var(--harbor-mid)]"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-lg font-semibold leading-tight">
                    Future tenant
                  </p>
                  <p className="mt-2 text-sm text-[var(--harbor-muted)]">
                    Looking for space — apply for a property, review contracts,
                    and track your application.
                  </p>
                </div>
              </div>
              <span className="mt-6 text-sm font-medium text-[var(--harbor-deep)]">
                Continue to apply →
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}
