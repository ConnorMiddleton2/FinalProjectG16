"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  HelpCircle,
  MessageCircle,
  RefreshCw,
  Shield,
  XCircle,
} from "lucide-react";
import { useLeaseOffers } from "@/hooks/useLeaseOffers";
import {
  downloadOfferDocument,
  formatOfferDate,
  formatOfferDateTime,
  isOfferExpired,
  leaseOfferStatusLabel,
  readLeaseOffer,
  type LeaseOffer,
  type LeaseOfferDocument,
} from "@/lib/lease-offers";

type ConfirmMode = "accept" | "decline" | null;

function StatusBadge({ offer }: { offer: LeaseOffer }) {
  const expired = isOfferExpired(offer);
  const status = expired && offer.status === "available" ? "expired" : offer.status;
  const classes =
    status === "accepted-pending-signature"
      ? "border-success/30 bg-success/10 text-success"
      : status === "declined" || status === "expired"
        ? "border-error/25 bg-error/10 text-error"
        : "border-info/25 bg-info/10 text-info";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}>
      {leaseOfferStatusLabel(status)}
    </span>
  );
}

function DocumentActions({
  documents,
  onReview,
}: {
  documents: LeaseOfferDocument[];
  onReview: (document: LeaseOfferDocument) => void;
}) {
  return (
    <ul className="space-y-3">
      {documents.map((document) => (
        <li
          key={document.id}
          className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{document.title}</p>
              <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
                {document.description}
              </p>
              <p className="mt-1 text-xs text-[var(--harbor-ink)]/45">
                {document.fileName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm gap-1"
                onClick={() => onReview(document)}
              >
                <FileText className="h-4 w-4" />
                Review
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-1"
                onClick={() => downloadOfferDocument(document)}
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function LeaseOfferReview({ offerId }: { offerId: string }) {
  const { accept, decline, refresh, error: hookError } = useLeaseOffers();
  const [offer, setOffer] = useState<LeaseOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<LeaseOfferDocument | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setError(null);
    try {
      refresh();
      setOffer(readLeaseOffer(offerId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load this lease offer."
      );
      setOffer(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load by offerId
  }, [offerId]);

  async function confirmAction() {
    if (!offer || !confirmMode || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated =
        confirmMode === "accept"
          ? accept(offer.id)
          : decline(offer.id, declineReason);
      setOffer(updated);
      setActionMessage(
        confirmMode === "accept"
          ? "Acceptance recorded. This is not a completed legal lease until required signatures and Harborline backend processing finish."
          : "Offer declined. You can still contact leasing with questions."
      );
      setConfirmMode(null);
      setDeclineReason("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update this offer."
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading lease offer">
        <div className="skeleton h-36 w-full rounded-3xl" />
        <div className="skeleton h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-error" />
        <h1 className="mt-4 font-display text-3xl">Offer not found</h1>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
          {error || hookError || "This lease offer is unavailable in this browser."}
        </p>
        <Link href="/portal/offers" className="btn btn-neutral mt-6">
          Back to lease offers
        </Link>
      </div>
    );
  }

  const canRespond =
    offer.status === "available" && !isOfferExpired(offer);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-3xl bg-[var(--harbor-ink)] px-6 py-8 text-[var(--harbor-sand)] sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-glow)]">
          Lease offer
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl">
              {offer.property}
            </h1>
            <p className="mt-2 text-white/70">{offer.unit}</p>
            <p className="mt-1 text-sm text-white/55">
              Application {offer.applicationNumber} · {offer.applicantName}
            </p>
          </div>
          <StatusBadge offer={offer} />
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-[var(--harbor-mid)]/25 bg-white/70 px-4 py-3 text-sm text-[var(--harbor-ink)]/70">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
        <p>
          Review carefully before you respond. Accepting in this portal records
          your intent only — it is{" "}
          <strong className="font-semibold">not a legally complete lease</strong>{" "}
          until required signatures and Harborline backend processes are finished.
        </p>
      </div>

      {(error || hookError) && (
        <div className="alert border-error/20 bg-error/10">
          <AlertCircle className="h-5 w-5 text-error" />
          <div className="flex-1 text-sm">{error || hookError}</div>
          <button type="button" className="btn btn-sm btn-outline gap-1" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {actionMessage ? (
        <div className="flex items-start gap-2 rounded-2xl border border-[var(--harbor-mid)]/30 bg-[var(--harbor-mist)]/30 px-4 py-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
          <p>{actionMessage}</p>
        </div>
      ) : null}

      <section className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5 sm:p-6">
        <h2 className="font-semibold">Offer summary</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["Property", offer.property],
            ["Unit", offer.unit],
            ["Monthly rent", offer.monthlyRent],
            ["Security deposit", offer.securityDeposit],
            ["Lease start", formatOfferDate(offer.leaseStartDate)],
            ["Lease end", formatOfferDate(offer.leaseEndDate)],
            ["Lease term", offer.leaseTerm],
            ["Parking", offer.parking],
            ["Pet terms", offer.petTerms],
            [
              "Offer expiration",
              formatOfferDateTime(offer.offerExpirationDate),
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl bg-[var(--harbor-sand)]/50 px-3 py-2"
            >
              <dt className="text-[10px] uppercase tracking-wide opacity-50">
                {label}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5 sm:p-6">
        <h2 className="font-semibold">Included utilities</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-[var(--harbor-ink)]/70">
          {offer.includedUtilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5 sm:p-6">
        <h2 className="font-semibold">Fees</h2>
        <ul className="mt-3 space-y-2">
          {offer.fees.map((fee) => (
            <li
              key={fee.label}
              className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-[var(--harbor-sand)]/45 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold">{fee.label}</p>
                <p className="text-xs text-[var(--harbor-ink)]/55">{fee.note}</p>
              </div>
              <p className="text-sm font-semibold">{fee.amount}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5 sm:p-6">
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-4 w-4 text-[var(--harbor-mid)]" />
          <div>
            <h2 className="font-semibold">Required next steps</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--harbor-ink)]/70">
              {offer.requiredNextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5 sm:p-6">
        <h2 className="font-semibold">Offer documents</h2>
        <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
          Review or download the package before you accept or decline.
        </p>
        <div className="mt-4">
          <DocumentActions
            documents={offer.documents}
            onReview={setReviewing}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline btn-sm gap-1"
            onClick={() => {
              for (const document of offer.documents) {
                downloadOfferDocument(document);
              }
            }}
          >
            <Download className="h-4 w-4" />
            Download all documents
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5 sm:p-6">
        <h2 className="font-semibold">Respond to this offer</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {canRespond ? (
            <>
              <button
                type="button"
                className="btn btn-neutral gap-1"
                onClick={() => setConfirmMode("accept")}
              >
                <CheckCircle2 className="h-4 w-4" />
                Accept offer
              </button>
              <button
                type="button"
                className="btn btn-outline gap-1 text-error"
                onClick={() => setConfirmMode("decline")}
              >
                <XCircle className="h-4 w-4" />
                Decline offer
              </button>
            </>
          ) : (
            <p className="text-sm text-[var(--harbor-ink)]/60">
              {offer.status === "accepted-pending-signature"
                ? "You accepted this offer. Watch for the signing package from leasing — the lease is not complete until signatures and processing finish."
                : offer.status === "declined"
                  ? "You declined this offer."
                  : "This offer is no longer available to accept or decline."}
            </p>
          )}
          <Link
            href={`/portal/messages?intent=lease-offer&application=${encodeURIComponent(offer.applicationId)}`}
            className="btn btn-ghost gap-1"
          >
            <MessageCircle className="h-4 w-4" />
            Ask a question
          </Link>
          <Link href="/portal/offers" className="btn btn-ghost">
            All offers
          </Link>
        </div>
      </section>

      {reviewing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--harbor-ink)]/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Review ${reviewing.title}`}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--harbor-deep)]/10 px-5 py-4">
              <div>
                <p className="font-semibold">{reviewing.title}</p>
                <p className="text-xs text-[var(--harbor-ink)]/50">
                  {reviewing.fileName}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setReviewing(null)}
              >
                Close
              </button>
            </div>
            <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap bg-[var(--harbor-sand)]/35 p-5 text-sm">
              {reviewing.mockContents}
            </pre>
            <div className="flex justify-end gap-2 border-t border-[var(--harbor-deep)]/10 px-5 py-3">
              <button
                type="button"
                className="btn btn-outline btn-sm gap-1"
                onClick={() => downloadOfferDocument(reviewing)}
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmMode ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--harbor-ink)]/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={
            confirmMode === "accept"
              ? "Confirm accept lease offer"
              : "Confirm decline lease offer"
          }
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            {confirmMode === "accept" ? (
              <>
                <CheckCircle2 className="h-8 w-8 text-[var(--harbor-mid)]" />
                <h2 className="mt-3 font-display text-3xl">Accept this offer?</h2>
                <p className="mt-2 text-sm text-[var(--harbor-ink)]/65">
                  Confirm that you want to accept the terms for {offer.unit} at{" "}
                  {offer.property}. This records your intent in the portal only.
                </p>
                <div className="mt-3 flex items-start gap-2 rounded-2xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Acceptance here is <strong>not legally complete</strong> until
                    you finish required signatures and Harborline completes
                    backend lease processing.
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="h-8 w-8 text-error" />
                <h2 className="mt-3 font-display text-3xl">Decline this offer?</h2>
                <p className="mt-2 text-sm text-[var(--harbor-ink)]/65">
                  This offer will no longer be available. You can still message
                  leasing if you have questions or want other options.
                </p>
                <label className="mt-4 block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                    Optional reason
                  </span>
                  <textarea
                    className="textarea textarea-bordered min-h-20 w-full"
                    value={declineReason}
                    onChange={(event) => setDeclineReason(event.target.value)}
                    placeholder="Share anything helpful for leasing (optional)"
                  />
                </label>
              </>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => {
                  setConfirmMode(null);
                  setDeclineReason("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${confirmMode === "accept" ? "btn-neutral" : "btn-error"}`}
                disabled={busy}
                onClick={() => void confirmAction()}
              >
                {busy
                  ? "Saving…"
                  : confirmMode === "accept"
                    ? "Confirm acceptance"
                    : "Confirm decline"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
