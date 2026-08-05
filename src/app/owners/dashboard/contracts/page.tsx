import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, ScrollText } from "lucide-react";
import { OwnerEmptyState } from "@/components/OwnerEmptyState";
import { OwnerPortalHeader } from "@/components/OwnerPortalHeader";
import { OwnerShell } from "@/components/OwnerShell";
import { getCurrentOwner } from "@/lib/owner-auth";
import { getPendingApprovalsForOwner } from "@/lib/owner-approvals";
import {
  contractStatusBadgeClass,
  contractStatusLabel,
  formatContractAddress,
  formatTermRange,
  getContractStatus,
} from "@/lib/owner-contracts";
import {
  ensureDemoOwnerProperty,
  getPropertiesForOwner,
  ownerFacingFeeSummary,
} from "@/lib/owner-properties";

export default async function OwnerContractsPage() {
  const owner = await getCurrentOwner();
  if (!owner) {
    redirect("/owners");
  }

  await ensureDemoOwnerProperty(owner);
  const contracts = await getPropertiesForOwner(owner);
  const pendingApprovals = await getPendingApprovalsForOwner(owner.email);

  return (
    <OwnerShell
      header={
        <OwnerPortalHeader
          subtitle="Management contracts"
          pendingApprovals={pendingApprovals.length}
        />
      }
    >
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/owners/dashboard"
          className="owner-muted inline-flex items-center gap-2 text-sm transition hover:text-[var(--harbor-ink)] welcome-rise"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to portfolio
        </Link>

        <div className="welcome-rise-delay">
          <h1 className="font-display text-3xl tracking-tight text-[var(--harbor-ink)] sm:text-4xl">
            Management contracts
          </h1>
          <p className="owner-muted mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">
            Agreements between you and Harborline Management for properties under
            management. These are the same records Harborline staff create—scoped
            to your owner account only.
          </p>
        </div>

        {contracts.length === 0 ? (
          <OwnerEmptyState
            icon={ScrollText}
            title="No management contracts yet"
            description="When Harborline acquires a management engagement under your email, it will appear here."
            actionHref="/owners/status"
            actionLabel="Check application status"
          />
        ) : (
          <ul className="owner-stagger space-y-4">
            {contracts.map((contract) => {
              const status = getContractStatus(contract);
              return (
                <li key={contract.id}>
                  <Link
                    href={`/owners/dashboard/contracts/${contract.id}`}
                    className="owner-card owner-card-interactive group block p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
                          {contract.propertyName || "Untitled property"}
                        </h2>
                        <p className="owner-muted mt-1 text-sm">
                          {formatContractAddress(contract) || "Address pending"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${contractStatusBadgeClass(status)}`}
                        >
                          {contractStatusLabel(status)}
                        </span>
                        <ChevronRight className="h-5 w-5 text-[var(--harbor-mid)] opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </div>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-xs uppercase tracking-wide opacity-55">
                          Term
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {formatTermRange(contract)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide opacity-55">
                          Management fee
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {ownerFacingFeeSummary(contract)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide opacity-55">
                          Recorded
                        </dt>
                        <dd className="mt-0.5 font-medium">
                          {contract.createdAt
                            ? new Date(contract.createdAt).toLocaleDateString()
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </OwnerShell>
  );
}
