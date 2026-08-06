/**
 * Legacy /portal/apply route — kept for compatibility.
 * New leasing discovery lives at /portal/future.
 */
import Link from "next/link";
import { FutureTenantWorkspace } from "@/components/portal/FutureTenantWorkspace";
import { FUTURE_HOME, FUTURE_UNITS } from "@/lib/portal/future/paths";

export default function PortalApplyPage() {
  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border border-[var(--harbor-mid)]/30 bg-[var(--harbor-mist)]/50 px-4 py-3 text-sm text-[var(--harbor-ink)]"
        role="note"
      >
        Looking for available homes? Use the{" "}
        <Link
          href={FUTURE_HOME}
          className="font-medium text-[var(--harbor-mid)] underline portal-focus"
        >
          Future Tenant leasing portal
        </Link>{" "}
        to{" "}
        <Link
          href={FUTURE_UNITS}
          className="font-medium text-[var(--harbor-mid)] underline portal-focus"
        >
          browse units
        </Link>
        , schedule tours, and start an application. This page remains for
        approved move-in onboarding and legacy applications.
      </div>
      <FutureTenantWorkspace />
    </div>
  );
}
