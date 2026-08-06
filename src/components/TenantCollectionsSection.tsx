"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  buildNoticeDraft,
  buildTenantCollectionsSnapshot,
  emptyAccountState,
  formatIsoDisplay,
  MISSING_TENANT_CONTACT_MESSAGE,
  nextDueNoticeWeek,
  noticeUniqueKey,
  obligationDisplayId,
  type CollectionsAccountState,
  type CollectionsNotice,
  type ManagementAlert,
  type NoticeDeliveryStatus,
} from "@/lib/collections";
import type { RentalReceivable } from "@/lib/rental-receivables";
import { tenantAmountDue } from "@/lib/rental-receivables";
import type { ManagementContractDraft } from "@/lib/management-contract";
import { formatCurrency, type TenantRecord } from "@/lib/tenants";
import {
  ManagedPropertyLink,
  resolveUniqueManagedPropertyId,
} from "@/components/ManagedPropertyLink";

const ACTOR = "management_team";

type Props = {
  tenant: TenantRecord;
};

export function TenantCollectionsSection({ tenant }: Props) {
  const { items: receivables, loading: arLoading } =
    useSharedCollection<RentalReceivable>(COLLECTIONS.rentalReceivables);
  const { items: managedProperties } =
    useSharedCollection<ManagementContractDraft>(COLLECTIONS.managedProperties);
  const {
    items: notices,
    saveOne: saveNotice,
    refresh: refreshNotices,
    loading: noticesLoading,
  } = useSharedCollection<CollectionsNotice>(COLLECTIONS.collectionsNotices);
  const {
    items: accountStates,
    saveOne: saveAccountState,
    refresh: refreshAccount,
  } = useSharedCollection<CollectionsAccountState>(
    COLLECTIONS.collectionsAccountState
  );
  const { items: alerts } = useSharedCollection<ManagementAlert>(
    COLLECTIONS.managementAlerts
  );

  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<CollectionsNotice | null>(null);
  const [pauseReason, setPauseReason] = useState("");
  const [planNotes, setPlanNotes] = useState("");
  const [disputeNotes, setDisputeNotes] = useState("");

  const snap = useMemo(
    () =>
      buildTenantCollectionsSnapshot(
        tenant,
        receivables,
        notices,
        accountStates,
        alerts
      ),
    [tenant, receivables, notices, accountStates, alerts]
  );

  const account = snap.accountState ?? emptyAccountState(tenant.id);

  async function persistAccount(next: CollectionsAccountState) {
    await saveAccountState({
      ...next,
      id: emptyAccountState(tenant.id).id,
      tenantId: tenant.id.toLowerCase(),
      updatedAt: new Date().toISOString(),
    });
    await refreshAccount();
  }

  async function generateDueNotice() {
    setBusy(true);
    setMsg("");
    try {
      const week = nextDueNoticeWeek(snap);
      if (week == null || !snap.qualifyingObligations[0]) {
        setMsg("No weekly notice is currently due for this account.");
        return;
      }
      if (
        account.noticesPaused ||
        account.accountDisputed ||
        account.paymentPlanApproved
      ) {
        setMsg(
          "Notices are blocked by pause, dispute, or approved payment plan."
        );
        return;
      }
      const obligation = snap.qualifyingObligations[0];
      const obligationId = obligationDisplayId(obligation.receivable);
      const key = noticeUniqueKey(tenant.id, obligationId, week);
      if (notices.some((n) => n.uniqueKey === key || n.id === `cn-${tenant.id.toLowerCase()}-${obligationId.replace(/[^a-zA-Z0-9_-]/g, "_")}-w${week}`)) {
        setMsg("A notice for this overdue week already exists.");
        return;
      }
      const draft = buildNoticeDraft({
        tenant,
        obligation,
        weekIndex: week,
        createdBy: "management",
      });
      if (notices.some((n) => n.uniqueKey === draft.uniqueKey || n.id === draft.id)) {
        setMsg("Duplicate notice prevented for this tenant, obligation, and week.");
        return;
      }
      await saveNotice(draft);
      await refreshNotices();
      setMsg(
        draft.contactIncomplete
          ? "Notice logged. Contact information incomplete — notice could not be fully delivered."
          : `Notice #${week} generated (simulated). No email was actually sent.`
      );
      setPreview(draft);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not generate notice.");
    } finally {
      setBusy(false);
    }
  }

  function previewDueNotice() {
    const week = nextDueNoticeWeek(snap);
    if (week == null || !snap.qualifyingObligations[0]) {
      setMsg("No weekly notice is currently due to preview.");
      setPreview(null);
      return;
    }
    setPreview(
      buildNoticeDraft({
        tenant,
        obligation: snap.qualifyingObligations[0],
        weekIndex: week,
        createdBy: "management",
      })
    );
    setMsg("Preview only — not saved until you generate the notice.");
  }

  async function updateNoticeStatus(
    notice: CollectionsNotice,
    status: NoticeDeliveryStatus
  ) {
    if (
      (status === "Simulated sent" || status === "Generated") &&
      notice.contactIncomplete
    ) {
      setMsg(
        "Contact information incomplete — email and postal delivery could not be completed."
      );
      return;
    }
    setBusy(true);
    try {
      const next: CollectionsNotice = {
        ...notice,
        deliveryStatus: status,
        emailChannelStatus:
          notice.contactIncomplete && !notice.intendedEmail
            ? "Failed — email missing"
            : status === "Simulated sent" && notice.intendedEmail
              ? "Simulated sent"
              : notice.emailChannelStatus || status,
        postalChannelStatus:
          notice.contactIncomplete && !notice.intendedMailingAddress
            ? "Failed — mailing address missing"
            : status === "Simulated sent" && notice.intendedMailingAddress
              ? "Simulated sent"
              : notice.postalChannelStatus || status,
      };
      if (status === "Simulated sent") {
        if (!notice.intendedEmail) {
          next.emailChannelStatus = "Failed — email missing";
        }
        if (!notice.intendedMailingAddress) {
          next.postalChannelStatus = "Failed — mailing address missing";
        }
        if (!notice.intendedEmail || !notice.intendedMailingAddress) {
          next.deliveryStatus = "Failed — contact information incomplete";
        }
      }
      await saveNotice(next);
      await refreshNotices();
      setMsg(`Notice status updated to ${next.deliveryStatus}.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function pauseNotices(e: FormEvent) {
    e.preventDefault();
    if (!pauseReason.trim()) {
      setMsg("A pause reason is required.");
      return;
    }
    setBusy(true);
    try {
      await persistAccount({
        ...account,
        noticesPaused: true,
        pauseReason: pauseReason.trim(),
        pausedAt: new Date().toISOString(),
        pausedBy: ACTOR,
      });
      setMsg("Notices paused.");
      setPauseReason("");
    } finally {
      setBusy(false);
    }
  }

  async function resumeNotices() {
    setBusy(true);
    try {
      await persistAccount({
        ...account,
        noticesPaused: false,
        pauseReason: "",
        pausedAt: "",
        pausedBy: "",
      });
      setMsg("Notices resumed.");
    } finally {
      setBusy(false);
    }
  }

  async function markDisputed(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await persistAccount({
        ...account,
        accountDisputed: true,
        disputeNotes: disputeNotes.trim(),
        disputedAt: new Date().toISOString(),
        disputedBy: ACTOR,
      });
      setMsg("Account marked disputed — ordinary notices blocked.");
    } finally {
      setBusy(false);
    }
  }

  async function clearDispute() {
    setBusy(true);
    try {
      await persistAccount({
        ...account,
        accountDisputed: false,
        disputeNotes: "",
        disputedAt: "",
        disputedBy: "",
      });
      setMsg("Account dispute cleared.");
    } finally {
      setBusy(false);
    }
  }

  async function approvePlan(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await persistAccount({
        ...account,
        paymentPlanApproved: true,
        paymentPlanNotes: planNotes.trim(),
        paymentPlanApprovedAt: new Date().toISOString(),
        paymentPlanApprovedBy: ACTOR,
      });
      setMsg("Approved payment plan recorded — ordinary notices blocked.");
    } finally {
      setBusy(false);
    }
  }

  async function clearPlan() {
    setBusy(true);
    try {
      await persistAccount({
        ...account,
        paymentPlanApproved: false,
        paymentPlanNotes: "",
        paymentPlanApprovedAt: "",
        paymentPlanApprovedBy: "",
      });
      setMsg("Payment plan cleared.");
    } finally {
      setBusy(false);
    }
  }

  const loading = arLoading || noticesLoading;
  const propertyId = resolveUniqueManagedPropertyId(
    managedProperties,
    tenant.propertyLeased
  );

  return (
    <section
      id="collections-and-notices"
      className="scroll-mt-6 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm space-y-5"
    >
      <div>
        <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
          Collections and Notices
        </h2>
        <p className="mt-1 text-sm text-[var(--harbor-ink)]/70">
          Property:{" "}
          <ManagedPropertyLink
            propertyName={tenant.propertyLeased}
            propertyId={propertyId}
          />
        </p>
        <p className="mt-1 text-xs opacity-55">
          Overdue rent is derived from qualifying unpaid base-rent receivables.
          Amount due is the open A/R total. Weekly notices catch up
          automatically when managers load the Tenant master list or Management
          tab. Notices are simulated only.
        </p>
      </div>

      {loading ? (
        <p className="text-sm opacity-60">
          <span className="loading loading-spinner loading-sm mr-2" />
          Loading collections data…
        </p>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <Item
              label="Overdue rent"
              value={formatCurrency(snap.overdueRentBalance)}
            />
            <Item
              label="Amount due"
              value={formatCurrency(tenantAmountDue(tenant.id, receivables))}
            />
            <Item
              label="Oldest unpaid rent due"
              value={
                snap.oldestUnpaidDueDate
                  ? formatIsoDisplay(snap.oldestUnpaidDueDate)
                  : "—"
              }
            />
            <Item label="Days overdue" value={String(snap.daysOverdue || "—")} />
            <Item label="Collections stage" value={snap.stageLabel} />
            <Item
              label="Next scheduled notice"
              value={
                snap.nextNoticeDate
                  ? formatIsoDisplay(snap.nextNoticeDate)
                  : "None"
              }
            />
            <Item
              label="Weekly notices"
              value={String(snap.weeklyNoticesCount)}
            />
            <Item
              label="Day-90 escalation notice"
              value={
                snap.day90EscalationNoticeDate
                  ? formatIsoDisplay(snap.day90EscalationNoticeDate)
                  : "—"
              }
            />
            <Item
              label="90-day escalation date"
              value={
                snap.escalationDate
                  ? formatIsoDisplay(snap.escalationDate)
                  : "—"
              }
            />
            <Item
              label="Management review"
              value={
                snap.managementReviewRequired || snap.daysOverdue >= 90
                  ? "Required (internal)"
                  : "Not required"
              }
            />
            <Item
              label="Controls"
              value={[
                account.noticesPaused ? "Paused" : null,
                account.accountDisputed ? "Disputed" : null,
                account.paymentPlanApproved ? "Payment plan" : null,
              ]
                .filter(Boolean)
                .join(" · ") || "None"}
            />
          </dl>

          <div className="rounded-xl border border-base-200 bg-base-50/80 px-4 py-3 text-sm">
            <p className="text-xs uppercase tracking-wide opacity-55">
              Intended contact for notices
            </p>
            <p className="mt-1">
              Email: {snap.intendedEmail || "Not on file"}
            </p>
            <p>Mailing: {snap.intendedMailingAddress || "Not on file"}</p>
            {snap.contactIncomplete && (
              <p className="mt-2 font-medium text-amber-900">
                {!snap.intendedEmail && !snap.intendedMailingAddress
                  ? MISSING_TENANT_CONTACT_MESSAGE
                  : "Contact information incomplete — notice could not be fully delivered."}
              </p>
            )}
          </div>

          {snap.daysOverdue >= 1 && (
            <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-55">
                Collections timeline
              </p>
              <ol className="mt-2 space-y-1.5 border-l border-[var(--harbor-mid)]/30 pl-4">
                {snap.oldestUnpaidDueDate && (
                  <li>
                    Due date — {formatIsoDisplay(snap.oldestUnpaidDueDate)}
                  </li>
                )}
                {snap.weeklyNotices.map((n) => (
                  <li key={n.id}>
                    Weekly notice #{n.noticeSequenceNumber}
                    {n.isFinalPreEscalation || n.noticeSequenceNumber === 12
                      ? " (final pre-escalation / day 84)"
                      : ""}{" "}
                    — {formatIsoDisplay(n.generatedAt.slice(0, 10))}
                  </li>
                ))}
                {snap.day90EscalationNotice && (
                  <li className="font-medium text-red-900">
                    Day-90 management notification —{" "}
                    {formatIsoDisplay(
                      snap.day90EscalationNotice.generatedAt.slice(0, 10)
                    )}
                  </li>
                )}
                {snap.openAlert && (
                  <li>
                    Management review status — {snap.openAlert.reviewStatus}
                    {snap.openAlert.reviewedAt
                      ? ` (reviewed ${formatIsoDisplay(snap.openAlert.reviewedAt.slice(0, 10))})`
                      : ""}
                  </li>
                )}
              </ol>
            </div>
          )}

          {snap.openAlert && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
              <p className="font-semibold">{snap.openAlert.collectionsStatusLabel}</p>
              <p className="mt-1 opacity-80">
                Management notified{" "}
                {snap.openAlert.managementNotifiedAt
                  ? formatIsoDisplay(snap.openAlert.managementNotifiedAt)
                  : "—"}
                . Alert {snap.openAlert.reviewStatus} · obligation{" "}
                {snap.openAlert.obligationId}. This does not authorize eviction.
              </p>
            </div>
          )}

          {msg && (
            <p className="rounded-lg border border-[var(--harbor-deep)]/15 bg-white px-3 py-2 text-sm">
              {msg}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline"
              disabled={busy}
              onClick={previewDueNotice}
            >
              Preview due notice
            </button>
            <button
              type="button"
              className="btn btn-sm btn-neutral"
              disabled={busy || !snap.noticesCurrentlyDue}
              onClick={() => void generateDueNotice()}
            >
              Generate currently due notice
            </button>
            {account.noticesPaused ? (
              <button
                type="button"
                className="btn btn-sm"
                disabled={busy}
                onClick={() => void resumeNotices()}
              >
                Resume notices
              </button>
            ) : null}
          </div>

          {preview && (
            <div className="rounded-xl border border-[var(--harbor-mid)]/30 bg-[var(--harbor-sand)]/40 px-4 py-3 text-sm space-y-1">
              <p className="font-semibold">Notice preview / latest draft</p>
              <p>{preview.subject}</p>
              <pre className="whitespace-pre-wrap text-xs opacity-80 font-sans">
                {preview.noticeBody || preview.noticeSummary}
              </pre>
              <p className="text-xs opacity-60">
                Email: {preview.emailChannelStatus || preview.deliveryStatus} ·
                Postal: {preview.postalChannelStatus || preview.deliveryStatus}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold">Weekly notice history</h3>
            {snap.weeklyNotices.length === 0 ? (
              <p className="mt-2 text-sm opacity-60">
                No weekly notices yet. Catch-up runs when managers load the
                Tenant list or Management tab.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {[...snap.weeklyNotices].reverse().map((n) => {
                  const finalWarn =
                    n.isFinalPreEscalation || n.noticeSequenceNumber === 12;
                  return (
                    <li
                      key={n.id}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        finalWarn
                          ? "border-amber-300 bg-amber-50"
                          : "border-base-200"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          {finalWarn && (
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                              Final pre-escalation notice — 6 days remaining
                              before management review
                            </p>
                          )}
                          <p className="font-medium">
                            #{n.noticeSequenceNumber} · {n.subject}
                          </p>
                          <p className="text-xs opacity-60">
                            {formatIsoDisplay(n.generatedAt.slice(0, 10))} ·{" "}
                            {n.obligationId}
                          </p>
                          <p className="text-xs mt-1">
                            Email:{" "}
                            {n.emailChannelStatus || n.deliveryStatus} · Postal:{" "}
                            {n.postalChannelStatus || n.deliveryStatus}
                          </p>
                          {n.contactIncomplete && (
                            <p className="text-xs text-amber-800 mt-1">
                              Contact information incomplete — email and postal
                              delivery could not be completed.
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            disabled={busy || n.contactIncomplete}
                            onClick={() =>
                              void updateNoticeStatus(n, "Simulated sent")
                            }
                          >
                            Simulated sent
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            disabled={busy}
                            onClick={() => void updateNoticeStatus(n, "Failed")}
                          >
                            Failed
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            disabled={busy}
                            onClick={() => void updateNoticeStatus(n, "Paused")}
                          >
                            Paused
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold">
              Day-90 escalation communication
            </h3>
            {!snap.day90EscalationNotice ? (
              <p className="mt-2 text-sm opacity-60">
                No day-90 escalation communication yet (created once at 90
                completed overdue days).
              </p>
            ) : (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
                <p className="font-medium">
                  {snap.day90EscalationNotice.subject}
                </p>
                <p className="text-xs opacity-70 mt-1">
                  {formatIsoDisplay(
                    snap.day90EscalationNotice.generatedAt.slice(0, 10)
                  )}{" "}
                  · Email:{" "}
                  {snap.day90EscalationNotice.emailChannelStatus ||
                    snap.day90EscalationNotice.deliveryStatus}{" "}
                  · Postal:{" "}
                  {snap.day90EscalationNotice.postalChannelStatus ||
                    snap.day90EscalationNotice.deliveryStatus}
                </p>
                <pre className="mt-2 whitespace-pre-wrap text-xs font-sans opacity-90">
                  {snap.day90EscalationNotice.noticeBody ||
                    snap.day90EscalationNotice.noticeSummary}
                </pre>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-3 border-t border-base-200 pt-4">
            <form className="space-y-2" onSubmit={(e) => void pauseNotices(e)}>
              <p className="text-sm font-semibold">Pause notices</p>
              <input
                className="input input-bordered input-sm w-full"
                placeholder="Required reason"
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-sm" disabled={busy}>
                Pause
              </button>
            </form>
            <form className="space-y-2" onSubmit={(e) => void markDisputed(e)}>
              <p className="text-sm font-semibold">Account dispute</p>
              <input
                className="input input-bordered input-sm w-full"
                placeholder="Dispute notes"
                value={disputeNotes}
                onChange={(e) => setDisputeNotes(e.target.value)}
              />
              <div className="flex gap-2">
                <button type="submit" className="btn btn-sm" disabled={busy}>
                  Mark disputed
                </button>
                {account.accountDisputed && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy}
                    onClick={() => void clearDispute()}
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
            <form className="space-y-2" onSubmit={(e) => void approvePlan(e)}>
              <p className="text-sm font-semibold">Payment plan</p>
              <input
                className="input input-bordered input-sm w-full"
                placeholder="Plan notes"
                value={planNotes}
                onChange={(e) => setPlanNotes(e.target.value)}
              />
              <div className="flex gap-2">
                <button type="submit" className="btn btn-sm" disabled={busy}>
                  Record approved plan
                </button>
                {account.paymentPlanApproved && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy}
                    onClick={() => void clearPlan()}
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          </div>
        </>
      )}
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide opacity-55">{label}</dt>
      <dd className="font-medium text-[var(--harbor-ink)]">{value}</dd>
    </div>
  );
}
