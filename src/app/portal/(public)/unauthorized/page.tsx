import Link from "next/link";
import {
  PORTAL_APPLY_PATH,
  PORTAL_HOME_PATH,
  PORTAL_START_PATH,
  TENANT_PORTAL_LOGIN_PATH,
} from "@/lib/portal/auth";

/**
 * Shown when a signed-in user without tenant access
 * tries to open private `/portal` routes.
 */
export default function PortalUnauthorizedPage() {
  return (
    <section className="mx-auto max-w-xl space-y-6 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-8 shadow-sm">
      <p className="text-sm text-[var(--harbor-ink)]/75">
        This area is only for authenticated CPMC tenants. Your account does
        not have access to another tenant&apos;s portal data, documents,
        payments, lease, maintenance, or messages.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--harbor-muted)]">
        <li>Existing tenants: sign in to open your dashboard.</li>
        <li>
          New renters: browse properties and start an application to create an
          account.
        </li>
        <li>Staff and ops: use Team / Ops tools, not this tenant portal.</li>
      </ul>
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href={`${TENANT_PORTAL_LOGIN_PATH}?next=${encodeURIComponent(PORTAL_HOME_PATH)}`}
          className="btn btn-primary min-h-11"
        >
          Sign in
        </Link>
        <Link href={PORTAL_APPLY_PATH} className="btn btn-ghost min-h-11">
          Start application
        </Link>
        <Link href={PORTAL_START_PATH} className="btn btn-ghost min-h-11">
          Browse properties
        </Link>
        <Link href="/" className="btn btn-ghost min-h-11">
          Welcome
        </Link>
      </div>
    </section>
  );
}
