import { Suspense } from "react";
import { ProspectApplyForm } from "@/components/portal/ProspectApplyForm";
import { getTenantPortalSession } from "@/lib/tenant-portal-accounts";

/**
 * Start-application form — creates a tenant portal account (or adds another
 * application to an existing signed-in account) and notifies Sales & Marketing.
 * Multiple applications per account / property are allowed.
 */
export default async function PortalStartApplyPage() {
  const session = await getTenantPortalSession();
  const signedInAccount = session
    ? {
        fullName: session.fullName,
        email: session.email,
        phone: session.phone,
        dateOfBirth: session.dateOfBirth,
      }
    : null;

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[var(--harbor-sand)] text-sm opacity-60">
          Loading application…
        </main>
      }
    >
      <ProspectApplyForm signedInAccount={signedInAccount} />
    </Suspense>
  );
}
