"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  ExternalLink,
  FileText,
  Gavel,
  MapPin,
  Scale,
  UserRound,
} from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  balanceOf,
  money as arMoney,
  seedRentalReceivables,
  type Receivable,
} from "@/lib/accounts-receivable";
import {
  buildTenantCollectionsSnapshot,
  getTenantContact,
  type CollectionsAccountState,
  type CollectionsNotice,
  type ManagementAlert,
} from "@/lib/collections";
import {
  buildEvictionChecklist,
  getJurisdictionProfile,
} from "@/lib/eviction-jurisdiction";
import type {
  ManagementContractDraft,
  SharedPropertyTenant,
} from "@/lib/management-contract";
import {
  emptyOverdueCase,
  overdueCaseId,
  type OverdueTenantCase,
} from "@/lib/overdue-tenant-cases";
import { normalizeCustomerId } from "@/lib/rental-receivables";
import type { SmTenantApplication } from "@/lib/sales-marketing";
import {
  softPropertyNamesMatch,
  seedTenants,
  type TenantRecord,
} from "@/lib/tenants";

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function riskBadge(days: number) {
  if (days >= 60) return "badge-error";
  if (days >= 30) return "badge-warning";
  return "badge-ghost";
}

function findProperty(
  properties: ManagementContractDraft[],
  tenant: TenantRecord
) {
  const byId = properties.find(
    (p) =>
      (tenant as TenantRecord & { propertyId?: string }).propertyId &&
      p.id === (tenant as TenantRecord & { propertyId?: string }).propertyId
  );
  if (byId) return byId;
  return (
    properties.find((p) =>
      softPropertyNamesMatch(p.propertyName, tenant.propertyLeased)
    ) ?? null
  );
}

function findApplication(
  apps: SmTenantApplication[],
  tenant: TenantRecord,
  email: string
) {
  const e = email.trim().toLowerCase();
  if (e) {
    const byEmail = apps.find(
      (a) =>
        (a.email || a.preLeaseEmail || "").trim().toLowerCase() === e
    );
    if (byEmail) return byEmail;
  }
  return (
    apps.find(
      (a) =>
        softPropertyNamesMatch(a.property || a.building || "", tenant.propertyLeased) &&
        (a.name || "").trim().toLowerCase() === tenant.name.trim().toLowerCase()
    ) ?? null
  );
}

export function MissedPaymentsDashboard() {
  const tenantsCol = useSharedCollection<TenantRecord>(
    COLLECTIONS.tenants,
    seedTenants
  );
  const receivablesCol = useSharedCollection<Receivable>(
    COLLECTIONS.rentalReceivables,
    seedRentalReceivables
  );
  const noticesCol = useSharedCollection<CollectionsNotice>(
    COLLECTIONS.collectionsNotices
  );
  const accountStatesCol = useSharedCollection<CollectionsAccountState>(
    COLLECTIONS.collectionsAccountState
  );
  const alertsCol = useSharedCollection<ManagementAlert>(
    COLLECTIONS.managementAlerts
  );
  const propertiesCol = useSharedCollection<ManagementContractDraft>(
    COLLECTIONS.managedProperties
  );
  const appsCol = useSharedCollection<SmTenantApplication>(
    COLLECTIONS.tenantApplications
  );
  const casesCol = useSharedCollection<OverdueTenantCase>(
    COLLECTIONS.overdueTenantCases
  );
  const propertyTenantsCol = useSharedCollection<SharedPropertyTenant>(
    COLLECTIONS.propertyTenants
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [cureSynced, setCureSynced] = useState<Set<string>>(new Set());

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 5000);
  }

  const overdueRows = useMemo(() => {
    const rows = tenantsCol.items
      .map((tenant) => {
        const snap = buildTenantCollectionsSnapshot(
          tenant,
          receivablesCol.items,
          noticesCol.items,
          accountStatesCol.items,
          alertsCol.items
        );
        const caseRow =
          casesCol.items.find(
            (c) =>
              normalizeCustomerId(c.tenantId) ===
              normalizeCustomerId(tenant.id)
          ) ?? null;
        return { tenant, snap, caseRow };
      })
      .filter(({ snap, caseRow, tenant }) => {
        if (caseRow?.status === "evicted") return false;
        if (tenant.collectionsInfraction && snap.overdueRentBalance <= 0) {
          return false;
        }
        return snap.daysOverdue >= 1 && snap.overdueRentBalance > 0;
      })
      .sort(
        (a, b) =>
          b.snap.daysOverdue - a.snap.daysOverdue ||
          b.snap.overdueRentBalance - a.snap.overdueRentBalance
      );
    return rows;
  }, [
    tenantsCol.items,
    receivablesCol.items,
    noticesCol.items,
    accountStatesCol.items,
    alertsCol.items,
    casesCol.items,
  ]);

  const selected =
    overdueRows.find((r) => r.tenant.id === selectedId) ??
    overdueRows[0] ??
    null;

  useEffect(() => {
    if (selected && !selectedId) setSelectedId(selected.tenant.id);
  }, [selected, selectedId]);

  /** When portal/A/R payment clears the balance, drop from list and flag the account. */
  useEffect(() => {
    let cancelled = false;
    async function syncCures() {
      for (const tenant of tenantsCol.items) {
        if (cancelled) return;
        if (cureSynced.has(tenant.id)) continue;
        if (tenant.collectionsInfraction) continue;

        const snap = buildTenantCollectionsSnapshot(
          tenant,
          receivablesCol.items,
          noticesCol.items,
          accountStatesCol.items,
          alertsCol.items
        );
        if (snap.overdueRentBalance > 0.009) continue;

        const caseRow =
          casesCol.items.find(
            (c) =>
              normalizeCustomerId(c.tenantId) ===
              normalizeCustomerId(tenant.id)
          ) ?? null;
        if (caseRow?.status === "evicted") continue;
        if (caseRow?.status === "cured_with_infraction") continue;

        const hadCollections =
          snap.noticesGenerated > 0 ||
          caseRow?.status === "open" ||
          (caseRow?.checklist.length ?? 0) > 0;
        if (!hadCollections) continue;

        setCureSynced((prev) => new Set(prev).add(tenant.id));
        const now = new Date().toISOString();
        const note =
          "Paid after delinquency — account flagged for overdue-rent infraction.";
        const daysAtCure = caseRow?.peakDaysOverdue ?? snap.daysOverdue ?? 0;
        const amountAtCure = caseRow?.peakAmountDue ?? 0;

        if (caseRow) {
          await casesCol.saveOne({
            ...caseRow,
            status: "cured_with_infraction",
            curedAt: now,
            infractionNote: note,
            updatedAt: now,
          });
        } else {
          await casesCol.saveOne({
            ...emptyOverdueCase(tenant.id),
            status: "cured_with_infraction",
            curedAt: now,
            infractionNote: note,
            peakDaysOverdue: daysAtCure,
            peakAmountDue: amountAtCure,
            updatedAt: now,
          });
        }

        await tenantsCol.saveOne({
          ...tenant,
          paymentStatus: "current",
          pendingDue: 0,
          collectionsInfraction: {
            flaggedAt: now,
            reason: note,
            daysPastDueAtCure: daysAtCure,
            amountAtCure,
            noticeCount: snap.noticesGenerated,
          },
        });
      }
    }
    void syncCures();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when ledgers change
  }, [tenantsCol.items, receivablesCol.items, casesCol.items, noticesCol.items]);

  useEffect(() => {
    if (!selected || selected.caseRow?.status === "evicted") return;
    const peakDays = Math.max(
      selected.caseRow?.peakDaysOverdue ?? 0,
      selected.snap.daysOverdue
    );
    const peakAmt = Math.max(
      selected.caseRow?.peakAmountDue ?? 0,
      selected.snap.overdueRentBalance
    );
    if (
      selected.caseRow &&
      peakDays === (selected.caseRow.peakDaysOverdue ?? 0) &&
      peakAmt === (selected.caseRow.peakAmountDue ?? 0)
    ) {
      return;
    }
    const base = selected.caseRow ?? emptyOverdueCase(selected.tenant.id);
    void casesCol.saveOne({
      ...base,
      id: overdueCaseId(selected.tenant.id),
      tenantId: selected.tenant.id,
      status: base.status === "cured_with_infraction" ? base.status : "open",
      peakDaysOverdue: peakDays,
      peakAmountDue: peakAmt,
      updatedAt: new Date().toISOString(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track peaks while reviewing
  }, [selected?.tenant.id, selected?.snap.daysOverdue, selected?.snap.overdueRentBalance]);

  const detail = useMemo(() => {
    if (!selected) return null;
    const { tenant, snap, caseRow } = selected;
    const property = findProperty(propertiesCol.items, tenant);
    const contact = getTenantContact(tenant);
    const application = findApplication(
      appsCol.items,
      tenant,
      contact.email
    );
    const paymentHistory = receivablesCol.items
      .filter(
        (r) =>
          normalizeCustomerId(r.customerId) ===
          normalizeCustomerId(tenant.id)
      )
      .sort((a, b) =>
        (b.invoiceDate || b.dueDate || "").localeCompare(
          a.invoiceDate || a.dueDate || ""
        )
      );
    const address = property
      ? [property.streetAddress, property.city, property.state, property.zip]
          .filter(Boolean)
          .join(", ")
      : contact.mailingAddress || "Address not on file";
    const jurisdiction = getJurisdictionProfile(property?.state);
    return {
      tenant,
      snap,
      caseRow,
      property,
      contact,
      application,
      paymentHistory,
      address,
      jurisdiction,
    };
  }, [selected, propertiesCol.items, appsCol.items, receivablesCol.items]);

  async function handleDetermineSteps() {
    if (!detail) return;
    setBusy(true);
    try {
      const { profile, items } = buildEvictionChecklist({
        stateRaw: detail.property?.state || detail.jurisdiction.stateCode,
        tenantName: detail.tenant.name,
        property: detail.tenant.propertyLeased,
        unit: detail.tenant.unit,
        daysOverdue: detail.snap.daysOverdue,
        amountDue: detail.snap.overdueRentBalance,
        noticeCount: detail.snap.noticesGenerated,
      });
      const now = new Date().toISOString();
      const next: OverdueTenantCase = {
        ...(detail.caseRow ?? emptyOverdueCase(detail.tenant.id)),
        id: overdueCaseId(detail.tenant.id),
        tenantId: detail.tenant.id,
        status: "open",
        jurisdictionState: profile.stateCode,
        jurisdictionSummary: profile.summary,
        checklist: items,
        checklistGeneratedAt: now,
        peakDaysOverdue: Math.max(
          detail.caseRow?.peakDaysOverdue ?? 0,
          detail.snap.daysOverdue
        ),
        peakAmountDue: Math.max(
          detail.caseRow?.peakAmountDue ?? 0,
          detail.snap.overdueRentBalance
        ),
        updatedAt: now,
      };
      await casesCol.saveOne(next);
      flash(`Action plan generated for ${profile.stateName}.`);
    } finally {
      setBusy(false);
    }
  }

  async function toggleChecklistItem(itemId: string) {
    if (!detail?.caseRow) return;
    const checklist = detail.caseRow.checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    await casesCol.saveOne({
      ...detail.caseRow,
      checklist,
      updatedAt: new Date().toISOString(),
    });
  }

  async function handleMarkEvicted() {
    if (!detail) return;
    const ok = window.confirm(
      `Mark ${detail.tenant.name} as evicted?\n\nThey will be removed from the current tenant list. This cannot be easily undone.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const leaseEnd = yesterday.toISOString().slice(0, 10);

      await tenantsCol.saveOne({
        ...detail.tenant,
        category: "terminated",
        leaseEnd,
        pendingDue: 0,
        paymentStatus: "late",
      });

      const roster = propertyTenantsCol.items.filter(
        (pt) =>
          softPropertyNamesMatch(
            pt.propertyName,
            detail.tenant.propertyLeased
          ) &&
          (pt.unit || "").trim().toLowerCase() ===
            detail.tenant.unit.trim().toLowerCase()
      );
      for (const pt of roster) {
        await propertyTenantsCol.saveOne({ ...pt, status: "vacant" });
      }

      const caseRow = detail.caseRow ?? emptyOverdueCase(detail.tenant.id);
      await casesCol.saveOne({
        ...caseRow,
        id: overdueCaseId(detail.tenant.id),
        tenantId: detail.tenant.id,
        status: "evicted",
        evictedAt: now,
        updatedAt: now,
        checklist: (caseRow.checklist || []).map((c) =>
          c.id === "possession-turnover" ? { ...c, done: true } : c
        ),
      });

      setSelectedId(null);
      flash(
        `${detail.tenant.name} marked evicted and removed from current tenants.`
      );
      await tenantsCol.refresh();
    } finally {
      setBusy(false);
    }
  }

  /** Cleaner cure flag when balance clears while viewing. */
  async function handleFlagAfterPayment() {
    if (!detail) return;
    if (detail.snap.overdueRentBalance > 0) {
      flash("Balance is still open — wait until the tenant pays in full.");
      return;
    }
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const note =
        "Paid after delinquency — account flagged for overdue-rent infraction.";
      await tenantsCol.saveOne({
        ...detail.tenant,
        paymentStatus: "current",
        pendingDue: 0,
        collectionsInfraction: {
          flaggedAt: now,
          reason: note,
          daysPastDueAtCure:
            detail.caseRow?.peakDaysOverdue ?? detail.snap.daysOverdue,
          amountAtCure:
            detail.caseRow?.peakAmountDue ?? detail.snap.overdueRentBalance,
          noticeCount: detail.snap.noticesGenerated,
        },
      });
      if (detail.caseRow) {
        await casesCol.saveOne({
          ...detail.caseRow,
          status: "cured_with_infraction",
          curedAt: now,
          infractionNote: note,
          updatedAt: now,
        });
      }
      setSelectedId(null);
      flash("Removed from overdue list; tenant account flagged for this infraction.");
    } finally {
      setBusy(false);
    }
  }

  const loading =
    tenantsCol.loading ||
    receivablesCol.loading ||
    noticesCol.loading ||
    casesCol.loading;

  const checklistDone = detail?.caseRow?.checklist.filter((c) => c.done).length ?? 0;
  const checklistTotal = detail?.caseRow?.checklist.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm opacity-65">
          Review each overdue tenant&apos;s application, residence, payment and
          outreach history, then generate a state-aware action checklist — or
          mark them evicted when the process is complete.
        </p>
        <Link href="/ops/ar" className="btn btn-outline btn-sm">
          Open Accounts Receivable →
        </Link>
      </div>

      {msg ? (
        <div className="rounded-xl border border-[var(--harbor-mid)]/30 bg-white/90 px-4 py-3 text-sm">
          {msg}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide opacity-55">
            Overdue tenants ({overdueRows.length})
          </p>
          {loading ? (
            <p className="text-sm opacity-60">Loading overdue tenants…</p>
          ) : overdueRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--harbor-deep)]/20 px-4 py-8 text-sm opacity-60">
              No tenants with open overdue rent right now.
            </p>
          ) : (
            overdueRows.map(({ tenant, snap }) => (
              <button
                key={tenant.id}
                type="button"
                onClick={() => setSelectedId(tenant.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  selected?.tenant.id === tenant.id
                    ? "border-[var(--harbor-mid)] bg-white shadow-sm"
                    : "border-[var(--harbor-deep)]/10 bg-white/80 hover:bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{tenant.name}</p>
                    <p className="text-sm opacity-70">
                      {tenant.propertyLeased}
                      {tenant.unit ? ` · ${tenant.unit}` : ""}
                    </p>
                  </div>
                  <span className={`badge badge-sm ${riskBadge(snap.daysOverdue)}`}>
                    {snap.daysOverdue}d overdue
                  </span>
                </div>
                <p className="mt-1 text-sm">
                  {money(snap.overdueRentBalance)} · {snap.noticesGenerated}{" "}
                  outreach
                  {snap.noticesGenerated === 1 ? "" : "s"}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-5 shadow-sm">
          {!detail ? (
            <p className="text-sm opacity-60">Select an overdue tenant.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-semibold">
                    <UserRound className="h-5 w-5 opacity-60" />
                    {detail.tenant.name}
                  </h2>
                  <p className="mt-1 text-sm opacity-70">
                    {detail.tenant.propertyLeased}
                    {detail.tenant.unit ? ` · Unit ${detail.tenant.unit}` : ""}
                  </p>
                  {detail.tenant.collectionsInfraction ? (
                    <p className="mt-2 rounded-lg border border-amber-300/60 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-950">
                      Account flagged:{" "}
                      {detail.tenant.collectionsInfraction.reason}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/ops/tenant`}
                    className="btn btn-ghost btn-sm gap-1"
                  >
                    Tenant roster
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/30 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide opacity-55">
                    Amount overdue
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {money(detail.snap.overdueRentBalance)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/30 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide opacity-55">
                    Days overdue
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {detail.snap.daysOverdue}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/30 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide opacity-55">
                    Times reached out
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {detail.snap.noticesGenerated}
                  </p>
                  <p className="text-xs opacity-55">
                    {detail.snap.weeklyNoticesCount} weekly · last{" "}
                    {detail.snap.lastNoticeDate || "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/30 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide opacity-55">
                    Stage
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {detail.snap.stageLabel}
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <MapPin className="h-4 w-4 opacity-60" />
                  Where they live / lease
                </p>
                <div className="rounded-xl border border-[var(--harbor-deep)]/10 px-3 py-2.5 text-sm">
                  <p className="font-medium">{detail.address}</p>
                  <p className="mt-1 opacity-65">
                    Moved in{" "}
                    <strong>{detail.tenant.dateLeased || "—"}</strong>
                    {detail.tenant.leaseEnd
                      ? ` · Lease ends ${detail.tenant.leaseEnd}`
                      : " · Open-ended / end date not on file"}
                    {" · "}
                    Rent {money(detail.tenant.monthlyRent)}/mo
                  </p>
                  <p className="mt-1 opacity-65">
                    Jurisdiction:{" "}
                    <strong>
                      {detail.jurisdiction.stateName} (
                      {detail.jurisdiction.stateCode})
                    </strong>
                  </p>
                </div>
              </section>

              <section className="space-y-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <FileText className="h-4 w-4 opacity-60" />
                  Application rundown
                </p>
                {detail.application ? (
                  <div className="rounded-xl border border-[var(--harbor-deep)]/10 px-3 py-2.5 text-sm space-y-1">
                    <p>
                      <span className="opacity-55">Applicant:</span>{" "}
                      {detail.application.name}
                    </p>
                    <p>
                      <span className="opacity-55">Email:</span>{" "}
                      {detail.application.email ||
                        detail.application.preLeaseEmail ||
                        "—"}
                    </p>
                    <p>
                      <span className="opacity-55">Status:</span>{" "}
                      {detail.application.status}
                      {detail.application.smStatus
                        ? ` · ${detail.application.smStatus}`
                        : ""}
                    </p>
                    <p>
                      <span className="opacity-55">Applied:</span>{" "}
                      {detail.application.createdAt?.slice(0, 10) || "—"}
                      {detail.application.movedInAt
                        ? ` · Moved in ${detail.application.movedInAt.slice(0, 10)}`
                        : ""}
                    </p>
                    <p>
                      <span className="opacity-55">Unit / rent:</span>{" "}
                      {detail.application.unitLabel ||
                        detail.application.roomSize ||
                        "—"}
                      {detail.application.proposedRent
                        ? ` · ${money(detail.application.proposedRent)} proposed`
                        : ""}
                    </p>
                    {detail.application.notes ? (
                      <p className="opacity-70">{detail.application.notes}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-[var(--harbor-deep)]/20 px-3 py-4 text-sm opacity-60">
                    No linked lease application on file for this tenant.
                  </p>
                )}
              </section>

              <section className="space-y-2">
                <p className="text-sm font-semibold">Payment history</p>
                {detail.paymentHistory.length === 0 ? (
                  <p className="text-sm opacity-60">No A/R rows for this tenant.</p>
                ) : (
                  <ul className="max-h-44 space-y-1.5 overflow-y-auto">
                    {detail.paymentHistory.slice(0, 12).map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--harbor-deep)]/10 px-2.5 py-1.5 text-xs"
                      >
                        <span>
                          {row.period || row.invoiceDate || "—"} ·{" "}
                          {row.receivableId || row.id}
                        </span>
                        <span className="tabular-nums">
                          {arMoney(row.amountReceived)} / {arMoney(row.amount)}
                          {balanceOf(row) > 0
                            ? ` · ${arMoney(balanceOf(row))} open`
                            : " · paid"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2">
                <p className="text-sm font-semibold">Outreach history</p>
                {detail.snap.notices.length === 0 ? (
                  <p className="text-sm opacity-60">
                    No collections notices generated yet.
                  </p>
                ) : (
                  <ul className="max-h-36 space-y-1 overflow-y-auto text-xs">
                    {detail.snap.notices
                      .slice()
                      .reverse()
                      .map((n) => (
                        <li
                          key={n.id}
                          className="rounded-lg border border-[var(--harbor-deep)]/10 px-2.5 py-1.5"
                        >
                          {n.generatedAt.slice(0, 10)} · {n.noticeType.replaceAll("_", " ")}{" "}
                          #{n.noticeSequenceNumber || n.overdueWeekIndex} ·{" "}
                          {n.deliveryStatus}
                        </li>
                      ))}
                  </ul>
                )}
              </section>

              <section className="space-y-3 rounded-xl border border-[var(--harbor-deep)]/15 bg-[var(--harbor-sand)]/25 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      <Scale className="h-4 w-4 opacity-60" />
                      Eviction / cure action plan
                    </p>
                    <p className="mt-1 text-xs opacity-60">
                      Uses {detail.jurisdiction.stateName} notice baseline (~
                      {detail.jurisdiction.noticeToQuitDays} days). Demo
                      guidance only — confirm with counsel.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-neutral btn-sm gap-1"
                    disabled={busy}
                    onClick={() => void handleDetermineSteps()}
                  >
                    <Gavel className="h-3.5 w-3.5" />
                    Determine appropriate steps
                  </button>
                </div>

                {detail.caseRow?.checklist.length ? (
                  <>
                    <p className="text-xs opacity-65">
                      {detail.caseRow.jurisdictionSummary}
                    </p>
                    <ul className="space-y-1.5">
                      {getJurisdictionProfile(
                        detail.caseRow.jurisdictionState
                      ).restrictions.map((r) => (
                        <li
                          key={r}
                          className="text-xs text-amber-950/80 before:mr-1 before:content-['•']"
                        >
                          {r}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs font-medium opacity-55">
                      Checklist ({checklistDone}/{checklistTotal})
                    </p>
                    <ul className="space-y-2">
                      {detail.caseRow.checklist.map((item) => (
                        <li key={item.id}>
                          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[var(--harbor-deep)]/10 bg-white/80 px-3 py-2 text-sm">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm mt-0.5"
                              checked={item.done}
                              onChange={() => void toggleChecklistItem(item.id)}
                            />
                            <span
                              className={
                                item.done ? "opacity-50 line-through" : ""
                              }
                            >
                              {item.label}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-sm opacity-60">
                    Click <strong>Determine appropriate steps</strong> to
                    generate a state-aware checklist you can check off.
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className="btn btn-outline btn-error btn-sm gap-1"
                    disabled={busy}
                    onClick={() => void handleMarkEvicted()}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    Mark as evicted
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={busy || detail.snap.overdueRentBalance > 0}
                    title={
                      detail.snap.overdueRentBalance > 0
                        ? "Available once the tenant pays in full via portal / A/R"
                        : undefined
                    }
                    onClick={() => void handleFlagAfterPayment()}
                  >
                    Clear overdue &amp; flag account
                  </button>
                </div>
                <p className="text-[11px] opacity-50">
                  If the tenant pays from their portal, they leave this list
                  automatically and their account is flagged for the
                  infraction. Eviction removes them from the current tenant
                  roster.
                </p>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
