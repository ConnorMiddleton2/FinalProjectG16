import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ContractPrintButton } from "@/components/ContractPrintButton";
import { OwnerPortalHeader } from "@/components/OwnerPortalHeader";
import { getCurrentOwner } from "@/lib/owner-auth";
import { getPendingApprovalsForOwner } from "@/lib/owner-approvals";
import {
  buildAgreementSections,
  contractStatusBadgeClass,
  contractStatusLabel,
  formatContractAddress,
  formatTermRange,
  getContractStatus,
  resolveOwnerApprovalThreshold,
} from "@/lib/owner-contracts";
import {
  getOwnerPropertyById,
  ownerFacingFeeSummary,
} from "@/lib/owner-properties";
import { feeStructureLabel } from "@/lib/management-contract";

export default async function OwnerContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const owner = await getCurrentOwner();
  if (!owner) {
    redirect("/owners");
  }

  const { id } = await params;
  const contract = await getOwnerPropertyById(owner, id);
  if (!contract) {
    notFound();
  }

  const pendingApprovals = await getPendingApprovalsForOwner(owner.email);
  const status = getContractStatus(contract);
  const threshold = resolveOwnerApprovalThreshold(contract);
  const sections = buildAgreementSections(contract);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3efe6_0%,#e8f4f6_100%)] print:bg-white">
      <OwnerPortalHeader
        subtitle="Management contract"
        pendingApprovals={pendingApprovals.length}
      />

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10 print:max-w-none print:px-8 print:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href="/owners/dashboard/contracts"
            className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
          >
            <ArrowLeft className="h-4 w-4" />
            All contracts
          </Link>
          <ContractPrintButton />
        </div>

        <div className="print:mb-6">
          <p className="hidden text-sm font-medium uppercase tracking-wide opacity-60 print:block">
            Harborline Management — Property Management Agreement
          </p>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)] print:text-3xl">
                {contract.propertyName || "Management agreement"}
              </h1>
              <p className="mt-2 text-[var(--harbor-ink)]/65">
                {formatContractAddress(contract) || "Address pending"}
              </p>
            </div>
            <span className={`badge ${contractStatusBadgeClass(status)} print:border print:border-black`}>
              {contractStatusLabel(status)}
            </span>
          </div>
          <p className="mt-3 text-xs text-[var(--harbor-ink)]/50">
            Record created{" "}
            {contract.createdAt
              ? new Date(contract.createdAt).toLocaleString()
              : "—"}
            . Version history of amendments is not tracked yet — this view
            always shows the current staff record.
          </p>
        </div>

        <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm print:border print:border-black print:shadow-none">
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            Key terms at a glance
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <Term label="Contract term" value={formatTermRange(contract)} />
            <Term
              label="Renewal"
              value={contract.renewalOptions || "Not specified"}
            />
            <Term
              label="Termination notice"
              value={`${contract.terminationNoticeDays || "30"} days`}
            />
            <Term
              label="Exclusive management"
              value={contract.exclusiveManagement ? "Yes" : "No"}
            />
            <Term
              label="Fee structure"
              value={feeStructureLabel(contract.feeStructure)}
            />
            <Term label="Management fee" value={ownerFacingFeeSummary(contract)} />
            <Term
              label="Leasing commission"
              value={
                contract.leasingCommissionPercent
                  ? `${contract.leasingCommissionPercent}%`
                  : "—"
              }
            />
            <Term
              label="Construction mgmt fee"
              value={
                contract.constructionMgmtFeePercent
                  ? `${contract.constructionMgmtFeePercent}%`
                  : "—"
              }
            />
            <Term
              label="Owner approval threshold"
              value={`$${threshold.amount.toLocaleString()}${
                threshold.source === "policy" ? " (default policy)" : ""
              }`}
            />
            <Term
              label="Property / units"
              value={`${contract.propertyType}${
                contract.unitsSuites ? ` · ${contract.unitsSuites} units` : ""
              }${contract.rentableSf ? ` · ${contract.rentableSf} RSF` : ""}`}
            />
            <Term
              label="Assigned manager"
              value={contract.assignedManager || "—"}
            />
            <Term
              label="Insurance"
              value={
                contract.insuranceRequirements
                  ? contract.insuranceRequirements.slice(0, 120) +
                    (contract.insuranceRequirements.length > 120 ? "…" : "")
                  : "—"
              }
            />
          </dl>
        </section>

        <section
          id="contract-document"
          className="space-y-6 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-6 shadow-sm print:border-0 print:p-0 print:shadow-none"
        >
          <div className="border-b border-[var(--harbor-deep)]/10 pb-4 print:border-black">
            <h2 className="font-display text-2xl text-[var(--harbor-ink)]">
              Full agreement
            </h2>
            <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
              Generated from the management contract record Harborline staff
              maintain for this property. Not a separately uploaded legal PDF.
            </p>
          </div>

          {sections.map((section) => (
            <article key={section.title} className="space-y-2">
              <h3 className="text-base font-semibold text-[var(--harbor-ink)]">
                {section.title}
              </h3>
              {section.paragraphs.map((p, i) => (
                <p
                  key={`${section.title}-${i}`}
                  className="text-sm leading-relaxed text-[var(--harbor-ink)]/80"
                >
                  {p}
                </p>
              ))}
            </article>
          ))}

          <footer className="border-t border-[var(--harbor-deep)]/10 pt-4 text-xs text-[var(--harbor-ink)]/50 print:border-black">
            Owner: {contract.ownerLegalName || "—"} · Manager: Harborline
            Management · Property ID: {contract.id}
          </footer>
        </section>
      </main>
    </div>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide opacity-55">{label}</dt>
      <dd className="mt-1 font-medium capitalize text-[var(--harbor-ink)]">
        {value}
      </dd>
    </div>
  );
}
