import Link from "next/link";
import {
  PORTAL_APPLY_PATH,
  PORTAL_HOME_PATH,
  PORTAL_LOGIN_PATH,
  PORTAL_START_PATH,
} from "@/lib/portal/auth";

/**
 * Shown when a signed-in user without the current-tenant role
 * tries to open private `/portal` routes.
 * Page heading comes from PortalPublicShell.
 */
export default function PortalUnauthorizedPage() {
  return (
    <section className="mx-auto max-w-xl space-y-6 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-8 shadow-sm">
      <p className="text-sm text-[var(--harbor-ink)]/75">
        This area is only for authenticated users with the current-tenant role.
        Your account does not have access to another tenant&apos;s portal data,
        documents, payments, lease, maintenance, or messages.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--harbor-muted)]">
        <li>
          Current tenants: sign in with a tenant account (demo fields are
          prefilled on the login screen).
        </li>
        <li>
          Future tenants: use the application flow — no current-tenant login
          required.
        </li>
        <li>Staff and ops: use Team / Ops tools, not this tenant portal.</li>
      </ul>
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href={`${PORTAL_LOGIN_PATH}?next=${encodeURIComponent(PORTAL_HOME_PATH)}`}
          className="btn btn-primary min-h-11"
        >
          Sign in
        </Link>
        <Link href={PORTAL_APPLY_PATH} className="btn btn-ghost min-h-11">
          Future tenant apply
        </Link>
        <Link href={PORTAL_START_PATH} className="btn btn-ghost min-h-11">
          Choose path
        </Link>
        <Link href="/" className="btn btn-ghost min-h-11">
          Welcome
        </Link>
      </div>
    </section>
  );
}
