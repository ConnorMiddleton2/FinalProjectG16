"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import { useCollectionsCatchUpSync } from "@/hooks/useEnsureManagementAlerts";
import {
  buildTenantCollectionsSnapshot,
  EVICTION_REVIEW_STATUS_LABEL,
  formatIsoDisplay,
  type ManagementAlert,
  type ManagementAlertFollowUp,
  type ManagementAlertReviewStatus,
  type CollectionsAccountState,
  type CollectionsNotice,
} from "@/lib/collections";
import { type RentalReceivable } from "@/lib/rental-receivables";
import type { ManagementContractDraft } from "@/lib/management-contract";
import { formatCurrency, type TenantRecord } from "@/lib/tenants";
import {
  ManagedPropertyLink,
  resolveUniqueManagedPropertyId,
} from "@/components/ManagedPropertyLink";

const REVIEWER = "management_team";

export function ManagementCollectionsPanel() {
  const { items: tenants, loading: tenantsLoading } =
    useSharedCollection<TenantRecord>(COLLECTIONS.tenants);
  const { items: receivables, loading: arLoading } =
    useSharedCollection<RentalReceivable>(COLLECTIONS.rentalReceivables);
  const {
    items: notices,
    saveOne: saveNotice,
    refresh: refreshNotices,
    loading: noticesLoading,
  } = useSharedCollection<CollectionsNotice>(COLLECTIONS.collectionsNotices);
  const { items: accountStates, loading: accountStatesLoading } =
    useSharedCollection<CollectionsAccountState>(
      COLLECTIONS.collectionsAccountState
    );
  const {
    items: alerts,
    loading: alertsLoading,
    saveOne: saveAlert,
    refresh: refreshAlerts,
  } = useSharedCollection<ManagementAlert>(COLLECTIONS.managementAlerts);
  const { items: managedProperties } =
    useSharedCollection<ManagementContractDraft>(COLLECTIONS.managedProperties);

  useCollectionsCatchUpSync({
    tenants,
    receivables,
    notices,
    accountStates,
    alerts,
    saveNotice,
    saveAlert,
    refreshNotices,
    refreshAlerts,
    ready:
      !tenantsLoading &&
      !arLoading &&
      !alertsLoading &&
      !noticesLoading &&
      !accountStatesLoading,
  });

  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const snapshots = useMemo(
    () =>
      tenants.map((t) =>
        buildTenantCollectionsSnapshot(
          t,
          receivables,
          notices,
          accountStates,
          alerts
        )
      ),
    [tenants, receivables, notices, accountStates, alerts]
  );

  const openAlerts = useMemo(() => {
    return alerts
      .filter(
        (a) => a.reviewStatus === "open" || a.reviewStatus === "under_review"
      )
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [alerts]);

  async function submitReview(
    e: FormEvent<HTMLFormElement>,
    alert: ManagementAlert
  ) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const decision = String(fd.get("decision") ?? "").trim();
    const notes = String(fd.get("notes") ?? "").trim();
    const reviewStatus = String(
      fd.get("reviewStatus") ?? "reviewed"
    ) as ManagementAlertReviewStatus;
    const followUpStatus = String(
      fd.get("followUpStatus") ?? "pending"
    ) as ManagementAlertFollowUp;
    if (!decision) {
      setMsg("Decision is required to record a review.");
      return;
    }
    setBusyId(alert.id);
    setMsg("");
    try {
      await saveAlert({
        ...alert,
        reviewStatus,
        reviewedAt: new Date().toISOString(),
        reviewedBy: REVIEWER,
        decision,
        notes,
        followUpStatus,
        collectionsStatusLabel: EVICTION_REVIEW_STATUS_LABEL,
      });
      await refreshAlerts();
      setMsg("Review recorded. This is an internal management decision only.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save review.");
    } finally {
      setBusyId(null);
    }
  }

  const loading = tenantsLoading || arLoading || alertsLoading;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-2xl text-[var(--harbor-ink)]">
          Collections — 90-day management review
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-[var(--harbor-ink)]/70">
          Internal alerts only when qualifying unpaid base rent reaches 90 days
          overdue. This does not authorize eviction, terminate a lease, or file
          legal action.
        </p>
      </div>

      {msg && (
        <p className="rounded-lg border border-[var(--harbor-deep)]/15 bg-white px-3 py-2 text-sm">
          {msg}
        </p>
      )}

      {loading ? (
        <p className="text-sm opacity-60">
          <span className="loading loading-spinner loading-sm mr-2" />
          Loading collections alerts…
        </p>
      ) : openAlerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/70 px-6 py-10 text-center text-sm text-[var(--harbor-ink)]/65">
          No open 90-day management-review alerts.
        </div>
      ) : (
        <ul className="space-y-4">
          {openAlerts.map((alert) => {
            const snap = snapshots.find((s) => s.tenantId === alert.tenantId);
            const propertyId = resolveUniqueManagedPropertyId(
              managedProperties,
              alert.property
            );
            return (
              <li
                key={alert.id}
                className="rounded-2xl border border-red-200 bg-red-50/80 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-800">
                      High priority · internal review
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[var(--harbor-ink)]">
                      {alert.tenantId ? (
                        <Link
                          href={`/ops/tenant/${encodeURIComponent(alert.tenantId)}`}
                          className="text-[var(--harbor-mid)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]"
                          aria-label={`Open tenant profile for ${alert.tenantName}`}
                        >
                          {alert.tenantName}
                        </Link>
                      ) : (
                        alert.tenantName
                      )}
                    </p>
                    <p className="text-sm opacity-70">
                      <ManagedPropertyLink
                        propertyName={alert.property}
                        propertyId={propertyId}
                      />
                      {alert.unit ? ` · ${alert.unit}` : ""} · Tenant ID{" "}
                      {alert.tenantId}
                    </p>
                    <p className="mt-2 text-sm font-medium text-red-900">
                      {EVICTION_REVIEW_STATUS_LABEL}
                    </p>
                  </div>
                  <Link
                    href={`/ops/tenant/${encodeURIComponent(alert.tenantId)}`}
                    className="btn btn-sm btn-outline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)]"
                  >
                    Open tenant profile
                  </Link>
                </div>

                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <Metric
                    label="AR overdue base rent"
                    value={formatCurrency(
                      snap?.overdueRentBalance ?? alert.overdueRentBalance
                    )}
                  />
                  <Metric
                    label="Oldest unpaid due"
                    value={formatIsoDisplay(alert.oldestUnpaidDueDate)}
                  />
                  <Metric
                    label="Days overdue"
                    value={String(snap?.daysOverdue ?? alert.daysOverdue)}
                  />
                  <Metric
                    label="Weekly notices"
                    value={String(
                      snap?.weeklyNoticesCount ??
                        alert.weeklyNoticesCount ??
                        alert.noticesGenerated
                    )}
                  />
                  <Metric
                    label="Notice 12 date"
                    value={
                      (snap?.notice12Date || alert.notice12Date)
                        ? formatIsoDisplay(
                            snap?.notice12Date || alert.notice12Date
                          )
                        : "—"
                    }
                  />
                  <Metric
                    label="Day-90 escalation notice"
                    value={
                      (snap?.day90EscalationNoticeDate ||
                      alert.day90EscalationNoticeDate)
                        ? formatIsoDisplay(
                            snap?.day90EscalationNoticeDate ||
                              alert.day90EscalationNoticeDate
                          )
                        : "—"
                    }
                  />
                  <Metric
                    label="Management notified"
                    value={
                      alert.managementNotifiedAt
                        ? formatIsoDisplay(alert.managementNotifiedAt)
                        : "—"
                    }
                  />
                  <Metric label="Review status" value={alert.reviewStatus} />
                  <Metric
                    label="Reviewing user"
                    value={alert.reviewedBy || "—"}
                  />
                  <Metric label="Obligation" value={alert.obligationId} />
                </dl>

                <form
                  className="mt-4 grid gap-3 rounded-xl border border-red-200/80 bg-white/90 p-4 sm:grid-cols-2"
                  onSubmit={(e) => void submitReview(e, alert)}
                >
                  <label className="form-control sm:col-span-2">
                    <span className="label-text text-xs">Decision (required)</span>
                    <input
                      name="decision"
                      className="input input-bordered input-sm"
                      placeholder="e.g. Continue monitoring; consult counsel; payment plan offered"
                      required
                    />
                  </label>
                  <label className="form-control">
                    <span className="label-text text-xs">Review status</span>
                    <select
                      name="reviewStatus"
                      className="select select-bordered select-sm"
                      defaultValue="reviewed"
                    >
                      <option value="under_review">Under review</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>
                  <label className="form-control">
                    <span className="label-text text-xs">Follow-up</span>
                    <select
                      name="followUpStatus"
                      className="select select-bordered select-sm"
                      defaultValue="monitoring"
                    >
                      <option value="pending">Pending</option>
                      <option value="monitoring">Monitoring</option>
                      <option value="legal_consult">Legal consult</option>
                      <option value="resolved">Resolved</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="form-control sm:col-span-2">
                    <span className="label-text text-xs">Notes</span>
                    <textarea
                      name="notes"
                      className="textarea textarea-bordered textarea-sm"
                      rows={2}
                      placeholder="Document the management decision. Do not treat this as legal approval of eviction."
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="btn btn-sm btn-neutral"
                      disabled={busyId === alert.id}
                    >
                      {busyId === alert.id ? "Saving…" : "Record review"}
                    </button>
                  </div>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide opacity-55">{label}</dt>
      <dd className="font-medium text-[var(--harbor-ink)]">{value}</dd>
    </div>
  );
}
