import { Suspense } from "react";
import { TenantAuthShell } from "@/components/portal/auth/TenantAuthShell";
import { TenantPortalAuth } from "@/components/portal/auth/TenantPortalAuth";

/**
 * Current-tenant portal signup.
 * Requires a valid invitation code before the auth account is linked to a unit.
 * Multi-role workspace signup remains at `/signup`.
 */
export default function PortalSignupPage() {
  return (
    <TenantAuthShell
      title="Create tenant account"
      subtitle="Register to apply for a property or access your CPMC dashboard."
    >
      <Suspense
        fallback={
          <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-6 text-sm text-[var(--harbor-muted)]">
            Loading signup…
          </div>
        }
      >
        <TenantPortalAuth initialMode="signup" />
      </Suspense>
    </TenantAuthShell>
  );
}
