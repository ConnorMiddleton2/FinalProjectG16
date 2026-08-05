import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ScrollText } from "lucide-react";
import { OwnerPortalHeader } from "@/components/OwnerPortalHeader";
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3efe6_0%,#e8f4f6_100%)]">
      <OwnerPortalHeader
        subtitle="Management contracts"
        pendingApprovals={pendingApprovals.length}
      />

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <Link
          href="/owners/dashboard"
          className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to portfolio
        </Link>

        <div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
            Management contracts
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
            Agreements between you and Harborline Management for properties under
            management. These are the same records Harborline staff create—scoped
            to your owner account only.
          </p>
        </div>

        {contracts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/60 px-6 py-14 text-center">
            <ScrollText className="mx-auto h-8 w-8 text-[var(--harbor-mid)] opacity-70" />
            <p className="mt-3 font-medium text-[var(--harbor-ink)]">
              No management contracts yet
            </p>
            <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
              When Harborline acquires a management engagement under your email,
              it will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {contracts.map((contract) => {
              const status = getContractStatus(contract);
              return (
                <li key={contract.id}>
                  <Link
                    href={`/owners/dashboard/contracts/${contract.id}`}
                    className="block rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm transition hover:border-[var(--harbor-mid)]/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
                          {contract.propertyName || "Untitled property"}
                        </h2>
                        <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
                          {formatContractAddress(contract) || "Address pending"}
                        </p>
                      </div>
                      <span
                        className={`badge ${contractStatusBadgeClass(status)}`}
                      >
                        {contractStatusLabel(status)}
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="opacity-55">Term</dt>
                        <dd className="font-medium">
                          {formatTermRange(contract)}
                        </dd>
                      </div>
                      <div>
                        <dt className="opacity-55">Management fee</dt>
                        <dd className="font-medium">
                          {ownerFacingFeeSummary(contract)}
                        </dd>
                      </div>
                      <div>
                        <dt className="opacity-55">Recorded</dt>
                        <dd className="font-medium">
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
    </div>
  );
}
