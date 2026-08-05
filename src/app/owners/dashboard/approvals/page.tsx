import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { OwnerApprovalDecisionForm } from "@/components/OwnerApprovalDecisionForm";
import { OwnerEmptyState } from "@/components/OwnerEmptyState";
import { OwnerPortalHeader } from "@/components/OwnerPortalHeader";
import { OwnerShell } from "@/components/OwnerShell";
import { getCurrentOwner } from "@/lib/owner-auth";
import {
  getApprovalsForOwner,
  OWNER_SPEND_APPROVAL_THRESHOLD,
} from "@/lib/owner-approvals";

export default async function OwnerApprovalsPage() {
  const owner = await getCurrentOwner();
  if (!owner) {
    redirect("/owners");
  }

  const approvals = await getApprovalsForOwner(owner.email);
  const pending = approvals.filter((a) => a.status === "pending");
  const history = approvals.filter((a) => a.status !== "pending");

  return (
    <OwnerShell
      header={
        <OwnerPortalHeader
          subtitle="Owner approvals"
          pendingApprovals={pending.length}
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
            Expenditure approvals
          </h1>
          <p className="owner-muted mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">
            Harborline requests your approval for spend at or above $
            {OWNER_SPEND_APPROVAL_THRESHOLD.toLocaleString()} at your properties
            (or the threshold on your contract). Approve, reject, and leave a
            comment — decisions are audited.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="owner-section-title">Pending ({pending.length})</h2>
          {pending.length === 0 ? (
            <OwnerEmptyState
              icon={ClipboardCheck}
              title="No pending approval requests"
              description="When Harborline submits a spend request above your threshold, it will show up here for you to approve or reject."
              actionHref="/owners/dashboard"
              actionLabel="Back to portfolio"
            />
          ) : (
            <div className="owner-stagger space-y-4">
              {pending.map((item) => (
                <article key={item.id} className="owner-card space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--harbor-ink)]">
                        {item.title}
                      </h3>
                      <p className="owner-muted text-sm">
                        {item.propertyName} · Requested{" "}
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--harbor-glow)_45%,white)] px-2.5 py-1 text-xs font-semibold text-[var(--harbor-ink)]">
                      Pending
                    </span>
                  </div>
                  <p className="text-sm text-[var(--harbor-ink)]/80">
                    {item.description || "No description."}
                  </p>
                  <dl className="grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs uppercase tracking-wide opacity-55">
                        Amount
                      </dt>
                      <dd className="mt-0.5 font-semibold">
                        ${item.amount.toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide opacity-55">
                        Vendor
                      </dt>
                      <dd className="mt-0.5">{item.vendorName || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide opacity-55">
                        Requested by
                      </dt>
                      <dd className="mt-0.5">
                        {item.requestedBy || "Harborline staff"}
                      </dd>
                    </div>
                  </dl>
                  {item.staffNote ? (
                    <p className="owner-muted text-sm">
                      <span className="font-medium text-[var(--harbor-ink)]">
                        Staff note:{" "}
                      </span>
                      {item.staffNote}
                    </p>
                  ) : null}
                  <OwnerApprovalDecisionForm approvalId={item.id} />
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="owner-section-title">History</h2>
          {history.length === 0 ? (
            <p className="owner-muted owner-card p-5 text-sm">
              No decided requests yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {history.map((item) => (
                <li key={item.id} className="owner-card p-4 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-semibold text-[var(--harbor-ink)]">
                      {item.title}
                    </p>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.status === "approved"
                          ? "bg-[color-mix(in_srgb,var(--harbor-mid)_22%,white)] text-[var(--harbor-ink)]"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="owner-muted mt-1">
                    {item.propertyName} · ${item.amount.toLocaleString()} ·{" "}
                    {item.decidedAt
                      ? new Date(item.decidedAt).toLocaleString()
                      : ""}
                  </p>
                  {item.ownerComment ? (
                    <p className="mt-2 opacity-80">
                      Your comment: {item.ownerComment}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </OwnerShell>
  );
}
