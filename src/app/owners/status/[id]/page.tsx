import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileSignature, ScrollText } from "lucide-react";
import { OwnerAlert } from "@/components/OwnerAlert";
import { OwnerApplicationSignForm } from "@/components/OwnerApplicationSignForm";
import { OwnerShell } from "@/components/OwnerShell";
import {
  getOwnerApplicationDetailForEmail,
  listOwnerProposedContracts,
} from "@/lib/owner-application-portal";
import { OwnerApplicationPropertySummary } from "@/components/OwnerApplicationPropertySummary";
import { getCurrentOwner } from "@/lib/owner-auth";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
};

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return "badge-warning";
    case "needs_info":
      return "badge-info";
    case "approved":
      return "badge-success";
    case "declined":
      return "badge-error";
    default:
      return "badge-ghost";
  }
}

export default async function OwnerApplicationDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { email: emailParam } = await searchParams;
  const owner = await getCurrentOwner();
  const email = (emailParam ?? owner?.email ?? "").trim().toLowerCase();

  if (!email) {
    return (
      <OwnerShell variant="auth">
        <div className="mx-auto max-w-lg px-6 py-12">
          <OwnerAlert variant="error" title="Sign in required">
            <Link href="/owners" className="underline">
              Sign in to the owner portal
            </Link>{" "}
            to view this application.
          </OwnerAlert>
        </div>
      </OwnerShell>
    );
  }

  const detail = await getOwnerApplicationDetailForEmail({ id, email });
  if ("error" in detail) {
    notFound();
  }

  const { application: app } = detail;
  const contracts = await listOwnerProposedContracts(email);
  const related = contracts.filter(
    (c) =>
      c.relatedApplicationId === app.id ||
      c.id === app.contractId ||
      (!c.relatedApplicationId &&
        c.ownerEmail.toLowerCase() === app.email.toLowerCase())
  );
  const awaitingSignature = related.filter(
    (c) => c.status === "pending_owner_signature"
  );

  const backHref = owner ? "/owners/dashboard" : "/owners";
  const backLabel = owner ? "Back to portfolio" : "Owner access";

  return (
    <OwnerShell variant="auth">
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        <Link
          href={backHref}
          className="owner-muted inline-flex items-center gap-2 text-sm transition hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <div className="owner-card space-y-5 p-6 shadow-xl sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="owner-muted text-xs uppercase tracking-wide">
                Your application
              </p>
              <h1 className="font-display text-3xl tracking-tight text-[var(--harbor-ink)]">
                {app.fullName}
              </h1>
              <p className="owner-muted mt-1 text-sm">
                {app.companyName || "No company listed"} · {app.email}
                {app.phone ? ` · ${app.phone}` : ""}
              </p>
            </div>
            <span className={`badge ${statusBadge(app.status)}`}>
              {app.status.replaceAll("_", " ")}
            </span>
          </div>

          {app.accountMessage ? (
            <OwnerAlert variant="info" title="Message from CPMC">
              <span className="whitespace-pre-wrap">{app.accountMessage}</span>
            </OwnerAlert>
          ) : null}

          {app.reviewNotes ? (
            <OwnerAlert variant="info" title="Staff review note">
              {app.reviewNotes}
            </OwnerAlert>
          ) : null}

          <section className="space-y-2 border-t border-[var(--harbor-deep)]/10 pt-4">
            <h2 className="text-sm font-semibold text-[var(--harbor-ink)]">
              Properties you submitted
            </h2>
            {app.properties.length === 0 ? (
              <p className="owner-muted text-sm">No properties listed.</p>
            ) : (
              <ul className="space-y-2">
                {app.properties.map((p, i) => (
                  <li key={`${p.propertyName || p.location || i}-${i}`}>
                    <OwnerApplicationPropertySummary property={p} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {app.message ? (
            <section className="space-y-1 border-t border-[var(--harbor-deep)]/10 pt-4">
              <h2 className="text-sm font-semibold text-[var(--harbor-ink)]">
                Your message
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {app.message}
              </p>
            </section>
          ) : null}

          {(app.proposedFeePercent ||
            app.proposedTermYears ||
            app.negotiationTerms ||
            app.paymentTerms ||
            app.exclusiveManagement != null ||
            app.draftContract) && (
            <section className="space-y-3 border-t border-[var(--harbor-deep)]/10 pt-4">
              <h2 className="text-sm font-semibold text-[var(--harbor-ink)]">
                Management terms to review
              </h2>
              <p className="owner-muted text-xs">
                CPMC set these terms during diligence. Review carefully
                before signing the management agreement below.
              </p>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {app.proposedFeePercent ? (
                  <>
                    <dt className="opacity-60">Proposed management fee</dt>
                    <dd className="font-medium">{app.proposedFeePercent}%</dd>
                  </>
                ) : null}
                {app.proposedTermYears ? (
                  <>
                    <dt className="opacity-60">Proposed term</dt>
                    <dd className="font-medium">{app.proposedTermYears} years</dd>
                  </>
                ) : null}
                {app.exclusiveManagement != null ? (
                  <>
                    <dt className="opacity-60">Exclusive management</dt>
                    <dd className="font-medium">
                      {app.exclusiveManagement ? "Yes" : "No"}
                    </dd>
                  </>
                ) : null}
              </dl>
              {app.negotiationTerms ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-55">
                    Negotiated terms
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {app.negotiationTerms}
                  </p>
                </div>
              ) : null}
              {app.paymentTerms ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-55">
                    Payment / remittance terms
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {app.paymentTerms}
                  </p>
                </div>
              ) : null}
              {app.draftContract ? (
                <details className="rounded-lg border border-[var(--harbor-deep)]/10 bg-white/80">
                  <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                    Draft terms package from management
                  </summary>
                  <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap border-t border-[var(--harbor-deep)]/10 p-3 text-xs leading-relaxed">
                    {app.draftContract}
                  </pre>
                </details>
              ) : null}
            </section>
          )}

          <p className="text-xs opacity-50">
            Submitted {new Date(app.createdAt).toLocaleString()} · ID{" "}
            <span className="font-mono">{app.id}</span>
            {app.mgmtStatus ? ` · CPMC: ${app.mgmtStatus.replaceAll("_", " ")}` : ""}
          </p>
        </div>

        <div className="owner-card space-y-4 p-6 shadow-xl sm:p-7">
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-[var(--harbor-mid)]" />
            <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
              Management contract
            </h2>
          </div>

          {related.length === 0 ? (
            <p className="owner-muted text-sm">
              No contract has been sent yet. When CPMC signs and sends an
              agreement, it will appear here for you to review and sign.
            </p>
          ) : (
            <div className="space-y-5">
              {awaitingSignature.length > 0 ? (
                <OwnerAlert variant="info" title="Action needed">
                  CPMC sent a management agreement for your signature.
                </OwnerAlert>
              ) : null}
              {related.map((c) => (
                <article
                  key={c.id}
                  className="space-y-3 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/35 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--harbor-ink)]">
                        {c.documentTitle}
                      </p>
                      <p className="owner-muted text-sm">{c.propertyName}</p>
                    </div>
                    <span className="badge badge-outline badge-sm capitalize">
                      {c.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  {c.cpmcSignedBy ? (
                    <p className="text-xs opacity-60">
                      Signed by CPMC ({c.cpmcSignedBy})
                      {c.cpmcSignedAt
                        ? ` · ${new Date(c.cpmcSignedAt).toLocaleString()}`
                        : ""}
                    </p>
                  ) : null}
                  <details className="rounded-lg border border-[var(--harbor-deep)]/10 bg-white/80">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <FileSignature className="h-4 w-4" />
                        View full agreement
                      </span>
                    </summary>
                    <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap border-t border-[var(--harbor-deep)]/10 p-3 font-[Georgia,serif] text-xs leading-relaxed">
                      {c.body}
                    </pre>
                  </details>
                  <OwnerApplicationSignForm
                    contract={c}
                    email={email}
                    applicationId={app.id}
                    defaultName={app.fullName}
                  />
                </article>
              ))}
            </div>
          )}
        </div>

        {app.status === "approved" ? (
          <Link
            href={owner ? "/owners/dashboard" : "/owners"}
            className="owner-btn-primary"
          >
            {owner ? "Back to portfolio" : "Go to owner login"}
          </Link>
        ) : null}
      </div>
    </OwnerShell>
  );
}
