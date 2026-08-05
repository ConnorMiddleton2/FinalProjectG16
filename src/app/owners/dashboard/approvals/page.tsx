import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { ownerLogout } from "@/app/owners/actions";
import { OwnerApprovalDecisionForm } from "@/components/OwnerApprovalDecisionForm";
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3efe6_0%,#e8f4f6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Owner approvals</p>
          </div>
          <form action={ownerLogout}>
            <button
              type="submit"
              className="btn btn-sm btn-ghost gap-1 text-[var(--harbor-sand)]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </header>

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
            Expenditure approvals
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
            Harborline requests your approval for spend at or above $
            {OWNER_SPEND_APPROVAL_THRESHOLD.toLocaleString()} at your properties.
            Approve, reject, and leave a comment — decisions are audited.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            Pending ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/60 p-5 text-sm opacity-60">
              No pending approval requests.
            </p>
          ) : (
            pending.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--harbor-ink)]">
                      {item.title}
                    </h3>
                    <p className="text-sm opacity-60">
                      {item.propertyName} · Requested{" "}
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="badge badge-warning">Pending</span>
                </div>
                <p className="text-sm">{item.description || "No description."}</p>
                <dl className="grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="opacity-55">Amount</dt>
                    <dd className="font-semibold">
                      ${item.amount.toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="opacity-55">Vendor</dt>
                    <dd>{item.vendorName || "—"}</dd>
                  </div>
                  <div>
                    <dt className="opacity-55">Requested by</dt>
                    <dd>{item.requestedBy || "Harborline staff"}</dd>
                  </div>
                </dl>
                {item.staffNote ? (
                  <p className="text-sm opacity-75">
                    <span className="font-medium">Staff note: </span>
                    {item.staffNote}
                  </p>
                ) : null}
                <OwnerApprovalDecisionForm approvalId={item.id} />
              </article>
            ))
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            History
          </h2>
          {history.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/60 p-5 text-sm opacity-60">
              No decided requests yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 text-sm"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-semibold">{item.title}</p>
                    <span
                      className={`badge ${
                        item.status === "approved"
                          ? "badge-success"
                          : "badge-error"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="opacity-65">
                    {item.propertyName} · ${item.amount.toLocaleString()} ·{" "}
                    {item.decidedAt
                      ? new Date(item.decidedAt).toLocaleString()
                      : ""}
                  </p>
                  {item.ownerComment ? (
                    <p className="mt-2 opacity-80">Your comment: {item.ownerComment}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
