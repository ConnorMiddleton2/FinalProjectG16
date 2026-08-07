import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FilePlus2 } from "lucide-react";
import { OwnerApplicationForm } from "@/components/OwnerApplicationForm";
import { OwnerPortalHeader } from "@/components/OwnerPortalHeader";
import { OwnerShell } from "@/components/OwnerShell";
import { getCurrentOwner } from "@/lib/owner-auth";
import { getPendingApprovalsForOwner } from "@/lib/owner-approvals";

export default async function OwnerApplyPage() {
  const owner = await getCurrentOwner();
  if (!owner) {
    redirect("/owners");
  }

  const pendingApprovals = await getPendingApprovalsForOwner(owner.email);

  return (
    <OwnerShell
      header={
        <OwnerPortalHeader
          subtitle="Submit application"
          pendingApprovals={pendingApprovals.length}
        />
      }
    >
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/owners/dashboard"
          className="owner-muted inline-flex items-center gap-2 text-sm transition hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div>
          <div className="mb-2 flex items-center gap-2 text-[var(--harbor-mid)]">
            <FilePlus2 className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-wide">
              Management intake
            </p>
          </div>
          <h1 className="font-display text-3xl tracking-tight text-[var(--harbor-ink)]">
            Commercial management application
          </h1>
          <p className="owner-muted mt-2 text-sm leading-relaxed sm:text-base">
            Provide the asset metrics, financials, tenancy, systems, and service
            needs CPMC requires to underwrite and onboard a commercial
            property. Short-term / individual vacation rentals are not accepted.
          </p>
        </div>

        <div className="owner-card p-6">
          <OwnerApplicationForm
            defaultFullName={owner.fullName}
            defaultEmail={owner.email}
            lockedEmail
          />
        </div>
      </main>
    </OwnerShell>
  );
}
