import { Suspense } from "react";
import { TenantAuthShell } from "@/components/portal/auth/TenantAuthShell";
import { TenantPortalAuth } from "@/components/portal/auth/TenantPortalAuth";

/**
 * Current-tenant portal login.
 * Demo cookies are cleared in the auth proxy when this path is hit,
 * so the form always shows (including sample credentials in demo mode).
 * Multi-role workspace auth remains at `/login`.
 */
export default function PortalLoginPage() {
  return (
    <TenantAuthShell
      title="Future tenant sign in"
      subtitle="Sign in or create an account to apply and track your Harborline application."
    >
      <Suspense
        fallback={
          <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-6 text-sm text-[var(--harbor-muted)]">
            Loading sign-in…
          </div>
        }
      >
        <TenantPortalAuth initialMode="login" />
      </Suspense>
    </TenantAuthShell>
  );
}
