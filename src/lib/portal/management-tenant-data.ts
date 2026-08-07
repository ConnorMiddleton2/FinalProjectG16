/**
 * Resolve portal tenant sessions against Management shared records
 * (property_tenants, tenants, rental_receivables).
 */

import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import type { SharedPropertyTenant } from "@/lib/management-contract";
import { getPaymentMethod, type TenantRecord } from "@/lib/tenants";
import {
  paymentMethodLabel,
  paymentMethodToPortalBrand,
  paymentMethodToPortalKind,
  type TenantPaymentMethod,
} from "@/lib/payment-methods";
import type { PortalTenantSession } from "@/lib/portal/auth";
import type { TenantDashboardData } from "@/lib/portal/dashboard-types";
import type { LeaseInformation } from "@/lib/portal/lease-types";
import type {
  PaymentTransaction,
  PaymentsOverview,
} from "@/lib/portal/payments-types";
import type { MakePaymentContext } from "@/lib/portal/make-payment-types";
import type { PaymentHistoryRecord } from "@/lib/portal/payment-history-types";
import {
  isOpenReceivableForAmountDue,
  normalizeCustomerId,
  openReceivableAmount,
  tenantAmountDue,
  tenantCurrentRentDue,
  tenantRentOverdue,
  type RentalReceivable,
} from "@/lib/rental-receivables";
import {
  getTenantPortalSession,
  saveTenantAccount,
  type TenantAccount,
} from "@/lib/tenant-portal-accounts";

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function moneyExact(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function prettyDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function unitsMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function emailsMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export type ManagementTenantSnapshot = {
  propertyId: string;
  propertyName: string;
  unitLabel: string;
  unitId: string;
  tenantRecordId: string;
  tenantName: string;
  tenantEmail: string;
  monthlyRent: number;
  amountDue: number;
  currentRentDue: number | null;
  overdueAmount: number;
  paymentStatus: "Paid" | "Due" | "Overdue" | "Processing";
  leaseStart: string;
  leaseEnd: string;
  dueDate: string;
  achAutopay: boolean;
  paymentMethod: TenantPaymentMethod;
  paymentMethodLast4?: string;
  openReceivables: RentalReceivable[];
  paidReceivables: RentalReceivable[];
};

function pickDueDate(
  open: RentalReceivable[],
  currentRentDue: number | null,
  fallbackIso: string
) {
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...open].sort((a, b) =>
    (a.dueDate || "").localeCompare(b.dueDate || "")
  );
  if (currentRentDue != null && currentRentDue > 0) {
    const current = sorted.find(
      (r) =>
        r.category === "base_rent" &&
        (r.dueDate || "").slice(0, 10) <= today &&
        openReceivableAmount(r) > 0
    );
    if (current?.dueDate) return current.dueDate.slice(0, 10);
  }
  const nextOpen = sorted.find((r) => openReceivableAmount(r) > 0);
  return (nextOpen?.dueDate || fallbackIso).slice(0, 10);
}

function paymentStatusFor(
  amountDue: number,
  overdueAmount: number
): ManagementTenantSnapshot["paymentStatus"] {
  if (amountDue <= 0.009) return "Paid";
  if (overdueAmount > 0.009) return "Overdue";
  return "Due";
}

async function resolveUnitAndTenant(
  session: PortalTenantSession,
  account: TenantAccount | null
): Promise<{
  unit: SharedPropertyTenant;
  tenant: TenantRecord | null;
  tenantId: string;
} | null> {
  const client = await createClient();
  const [units, tenants] = await Promise.all([
    listSharedRecords<SharedPropertyTenant>(
      client,
      COLLECTIONS.propertyTenants
    ),
    listSharedRecords<TenantRecord>(client, COLLECTIONS.tenants),
  ]);

  const email = (session.email || account?.email || "").toLowerCase();
  const propertyId = session.propertyId || account?.propertyId || "";
  const unitLabel = session.unit || account?.unit || "";
  const knownTenantId =
    session.tenantRecordId || account?.tenantRecordId || "";

  let unit =
    units.find(
      (u) =>
        u.status === "active" &&
        email &&
        emailsMatch(u.email || "", email) &&
        (!propertyId || u.propertyId === propertyId) &&
        (!unitLabel || unitsMatch(u.unit, unitLabel))
    ) ||
    units.find(
      (u) =>
        u.status === "active" &&
        propertyId &&
        u.propertyId === propertyId &&
        unitLabel &&
        unitsMatch(u.unit, unitLabel)
    ) ||
    units.find(
      (u) =>
        knownTenantId &&
        (knownTenantId === `ten-movein-${u.id}` || knownTenantId === u.id)
    ) ||
    null;

  if (!unit && knownTenantId) {
    const tenantRow = tenants.find(
      (t) => normalizeCustomerId(t.id) === normalizeCustomerId(knownTenantId)
    );
    if (tenantRow) {
      unit =
        units.find(
          (u) =>
            unitsMatch(u.unit, tenantRow.unit) &&
            (u.propertyName === tenantRow.propertyLeased ||
              u.propertyId === propertyId)
        ) || null;
    }
  }

  if (!unit) return null;

  const expectedId = `ten-movein-${unit.id}`;
  const tenant =
    tenants.find(
      (t) => normalizeCustomerId(t.id) === normalizeCustomerId(knownTenantId)
    ) ||
    tenants.find(
      (t) => normalizeCustomerId(t.id) === normalizeCustomerId(expectedId)
    ) ||
    tenants.find(
      (t) =>
        unitsMatch(t.unit, unit!.unit) &&
        t.propertyLeased === unit!.propertyName
    ) ||
    null;

  return {
    unit,
    tenant,
    tenantId: tenant?.id || expectedId,
  };
}

/** Load Management AR + unit rent for the signed-in portal tenant. */
export async function loadManagementTenantSnapshot(
  session: PortalTenantSession
): Promise<ManagementTenantSnapshot | null> {
  const account = await getTenantPortalSession();
  const resolved = await resolveUnitAndTenant(session, account);
  if (!resolved) return null;

  const { unit, tenant, tenantId } = resolved;
  const client = await createClient();
  const receivables = await listSharedRecords<RentalReceivable>(
    client,
    COLLECTIONS.rentalReceivables
  );

  const mine = receivables.filter(
    (r) =>
      normalizeCustomerId(r.customerId) === normalizeCustomerId(tenantId) ||
      (unitsMatch(r.unit || "", unit.unit) &&
        (r.property || "") === unit.propertyName)
  );

  const openReceivables = mine
    .filter(isOpenReceivableForAmountDue)
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  const paidReceivables = mine
    .filter((r) => !isCanceledReceivableSafe(r) && openReceivableAmount(r) <= 0)
    .sort((a, b) => (b.dueDate || "").localeCompare(a.dueDate || ""));

  const amountDue = tenantAmountDue(tenantId, receivables);
  const currentRentDue = tenantCurrentRentDue(tenantId, receivables);
  const overdueAmount = tenantRentOverdue(tenantId, receivables);
  const monthlyRent =
    Number(tenant?.monthlyRent) ||
    Number(unit.monthlyRent) ||
    Number(unit.askingRent) ||
    Number(session.monthlyRent) ||
    0;

  const dueDate = pickDueDate(
    openReceivables,
    currentRentDue,
    `${new Date().toISOString().slice(0, 7)}-05`
  );

  // Keep portal account aligned with Management unit / AR tenant id
  if (account) {
    const nextMonthly = monthlyRent > 0 ? monthlyRent : account.monthlyRent;
    const needsUpdate =
      account.tenantRecordId !== tenantId ||
      account.propertyId !== unit.propertyId ||
      account.propertyName !== unit.propertyName ||
      account.unit !== unit.unit ||
      account.monthlyRent !== nextMonthly ||
      account.status !== "active";
    if (needsUpdate) {
      await saveTenantAccount({
        ...account,
        status: "active",
        tenantRecordId: tenantId,
        propertyId: unit.propertyId,
        propertyName: unit.propertyName,
        unit: unit.unit,
        monthlyRent: nextMonthly,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const accountMethod = account?.preferredPaymentMethod;
  const paymentMethod = tenant
    ? getPaymentMethod(tenant)
    : accountMethod === "ach" ||
        accountMethod === "check" ||
        accountMethod === "debit_card"
      ? accountMethod
      : unit.achAutopay
        ? "ach"
        : "check";

  return {
    propertyId: unit.propertyId,
    propertyName: unit.propertyName,
    unitLabel: unit.unit,
    unitId: unit.id,
    tenantRecordId: tenantId,
    tenantName: tenant?.name || unit.name || session.displayName,
    tenantEmail: unit.email || session.email,
    monthlyRent,
    amountDue,
    currentRentDue,
    overdueAmount,
    paymentStatus: paymentStatusFor(amountDue, overdueAmount),
    leaseStart: unit.leaseStart || tenant?.dateLeased || "",
    leaseEnd: unit.leaseEnd || tenant?.leaseEnd || "",
    dueDate,
    achAutopay: paymentMethod === "ach",
    paymentMethod,
    paymentMethodLast4: account?.paymentMethodLast4 || undefined,
    openReceivables,
    paidReceivables,
  };
}

function isCanceledReceivableSafe(r: RentalReceivable) {
  const raw = (r as RentalReceivable & { status?: string }).status;
  if (typeof raw !== "string") return false;
  const status = raw.trim().toLowerCase();
  return (
    status === "canceled" ||
    status === "cancelled" ||
    status === "void" ||
    status === "voided"
  );
}

export function snapshotToDashboard(
  snap: ManagementTenantSnapshot,
  displayName: string
): TenantDashboardData {
  const propertyLabel = `${snap.propertyName} · ${snap.unitLabel}`;
  const dueAmount = snap.amountDue;
  const displayAmount =
    dueAmount > 0.009
      ? dueAmount
      : snap.paymentStatus === "Paid"
        ? 0
        : snap.monthlyRent;
  const dueDisplay = moneyExact(displayAmount);
  const rentDisplay = money(snap.monthlyRent);
  const term =
    snap.leaseStart && snap.leaseEnd
      ? `${prettyDate(snap.leaseStart)} – ${prettyDate(snap.leaseEnd)}`
      : "Active lease";

  return {
    tenantName: displayName || snap.tenantName,
    summary: {
      nextRentAmount: dueDisplay,
      rentDueDate: prettyDate(snap.dueDate),
      paymentStatus: snap.paymentStatus,
      leaseEndDate: snap.leaseEnd ? prettyDate(snap.leaseEnd) : "—",
      openMaintenanceCount: 0,
      unreadAnnouncements: 0,
      unreadMessages: 0,
    },
    upcomingPayment:
      dueAmount > 0.009
        ? {
            id: snap.openReceivables[0]?.id || "pay-upcoming-mgmt",
            label:
              snap.openReceivables[0]?.description ||
              `Rent · ${snap.unitLabel}`,
            amount: moneyExact(dueAmount),
            dueDate: prettyDate(snap.dueDate),
            status: snap.paymentStatus,
            property: propertyLabel,
          }
        : snap.monthlyRent > 0
          ? {
              id: "pay-next-period",
              label: `Monthly rent · ${snap.unitLabel}`,
              amount: rentDisplay,
              dueDate: prettyDate(snap.dueDate),
              status: "Paid" as const,
              property: propertyLabel,
            }
          : null,
    recentPayments: snap.paidReceivables.slice(0, 5).map((r) => ({
      id: r.id,
      label: r.description || `Rent · ${r.period || r.dueDate}`,
      amount: moneyExact(Number(r.amount) || 0),
      paidOn: prettyDate(r.dueDate),
      method: r.paymentMethod || "Portal / ACH",
      status: "Paid" as const,
    })),
    activeMaintenance: [],
    announcements: [
      {
        id: "ann-mgmt-lease",
        title: `Lease active · ${snap.propertyName}`,
        postedAt: prettyDate(snap.leaseStart || snap.dueDate),
        preview: `Management records show ${propertyLabel} at ${rentDisplay}/mo. Amount due reflects open rental receivables.`,
        unread: false,
      },
    ],
    lease: {
      propertyName: snap.propertyName,
      unit: snap.unitLabel,
      occupancyClass: "commercial",
      propertyType: "office",
      term,
      monthlyRent: rentDisplay,
      securityDeposit: rentDisplay,
      endDate: snap.leaseEnd ? prettyDate(snap.leaseEnd) : "—",
    },
  };
}

export function snapshotToLease(
  snap: ManagementTenantSnapshot,
  displayName: string
): LeaseInformation {
  const rentDisplay = money(snap.monthlyRent);
  const shortId = snap.tenantRecordId.slice(0, 8).toUpperCase();
  return {
    id: `lease-${snap.unitId}`,
    leaseNumber: `HL-${shortId}`,
    status: "Active",
    occupancyClass: "commercial",
    propertyType: "office",
    propertyName: snap.propertyName,
    propertyAddress: snap.propertyName,
    unitNumber: snap.unitLabel,
    leaseStartDate: snap.leaseStart || new Date().toISOString().slice(0, 10),
    leaseEndDate:
      snap.leaseEnd ||
      new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        .toISOString()
        .slice(0, 10),
    monthlyRent: rentDisplay,
    securityDeposit: rentDisplay,
    occupants: [
      {
        id: "occ-primary",
        name: displayName || snap.tenantName,
        role: "Primary tenant",
      },
    ],
    parking: {
      spaces: 0,
      locations: "As stated in your lease",
      permits: "—",
      notes: "",
    },
    pets: {
      allowed: false,
      summary: "Per lease",
      details: "See your signed lease for pet and service-animal terms.",
    },
    renewalDeadline: snap.leaseEnd || "",
    moveOutNoticeRequirement:
      "Written notice required at least 60 days before the lease end date.",
    documentTitle: `Lease — ${snap.propertyName} · ${snap.unitLabel}`,
    documentFileName: `cpmc-lease-${snap.unitId.slice(0, 8)}.pdf`,
  };
}

export function snapshotToPaymentsOverview(
  snap: ManagementTenantSnapshot
): PaymentsOverview {
  const propertyLabel = `${snap.propertyName} · ${snap.unitLabel}`;
  const balance = snap.amountDue;
  const rentDue =
    snap.currentRentDue != null && snap.currentRentDue > 0
      ? snap.currentRentDue
      : snap.monthlyRent;

  const lateFee = lateFeeFromOpenReceivables(snap.openReceivables);
  const method = snap.paymentMethod;
  const portalKind = paymentMethodToPortalKind(method);
  const portalBrand = paymentMethodToPortalBrand(method);

  return {
    currentBalance: moneyExact(balance),
    amountDue: moneyExact(balance > 0 ? balance : rentDue),
    dueDate: prettyDate(snap.dueDate),
    paymentStatus: snap.paymentStatus,
    lateFee: lateFee > 0 ? moneyExact(lateFee) : null,
    autopay: {
      enabled: method === "ach",
      nextRunDate: method === "ach" ? prettyDate(snap.dueDate) : null,
      methodLabel: method === "ach" ? "ACH" : paymentMethodLabel(method),
    },
    savedMethod: {
      id: `pm-${method}`,
      brand: portalBrand,
      last4: snap.paymentMethodLast4 || "****",
      kind: portalKind,
      isDefault: true,
    },
    ledger: snap.openReceivables.map((r) => ({
      id: r.id,
      label: r.description || `${r.category} · ${propertyLabel}`,
      amount: moneyExact(openReceivableAmount(r)),
      kind: isLateFeeReceivable(r) || (r.category || "").toLowerCase().includes("fee")
        ? ("fee" as const)
        : ("charge" as const),
      date: prettyDate(r.dueDate),
    })),
    transactions: [
      ...snap.openReceivables.slice(0, 4).map((r) => {
        const isLate = isLateFeeReceivable(r);
        const status: PaymentTransaction["status"] =
          snap.paymentStatus === "Overdue" ? "Overdue" : "Due";
        const type: PaymentTransaction["type"] = isLate ? "Late fee" : "Rent";
        return {
          id: `open-${r.id}`,
          label: r.description || `${isLate ? "Late fee" : "Charge"} · ${propertyLabel}`,
          amount: moneyExact(openReceivableAmount(r)),
          date: (r.dueDate || "").slice(0, 10),
          displayDate: prettyDate(r.dueDate),
          status,
          type,
          methodSummary: "Not paid",
          receiptAvailable: false,
        };
      }),
      ...snap.paidReceivables.slice(0, 12).map((r) => {
        const isLate = isLateFeeReceivable(r);
        const type: PaymentTransaction["type"] = isLate ? "Late fee" : "Rent";
        return {
          id: r.id,
          label: r.description || `${isLate ? "Late fee" : "Rent"} · ${propertyLabel}`,
          amount: moneyExact(Number(r.amount) || 0),
          date: (r.dueDate || "").slice(0, 10),
          displayDate: prettyDate(r.dueDate),
          status: "Paid" as const,
          type,
          methodSummary: r.paymentMethod || "Recorded payment",
          receiptAvailable: true,
        };
      }),
    ],
    pendingCheck: null,
  };
}

function isLateFeeReceivable(r: RentalReceivable) {
  const cat = (r.category || "").toLowerCase();
  const desc = (r.description || "").toLowerCase();
  return cat === "late_fee" || cat.includes("late") || desc.includes("late fee");
}

function lateFeeFromOpenReceivables(open: RentalReceivable[]) {
  let sum = 0;
  for (const r of open) {
    if (isLateFeeReceivable(r)) {
      sum += openReceivableAmount(r);
    }
  }
  return Number(sum.toFixed(2));
}

export function snapshotToMakePaymentContext(
  snap: ManagementTenantSnapshot
): MakePaymentContext {
  const balance = snap.amountDue;
  const rent =
    snap.currentRentDue != null && snap.currentRentDue > 0
      ? snap.currentRentDue
      : snap.monthlyRent;
  const lateFee = lateFeeFromOpenReceivables(snap.openReceivables);
  const achEnrolled = snap.paymentMethod === "ach";

  const methods = achEnrolled
    ? [
        {
          id: "pm-ach",
          brand: "ACH",
          last4: "****",
          kind: "ACH" as const,
          isDefault: true,
        },
      ]
    : [
        {
          id: "pm-debit",
          brand: "Debit",
          last4: "4242",
          kind: "Debit card" as const,
          isDefault: snap.paymentMethod === "debit_card",
        },
        {
          id: "pm-check",
          brand: "Check",
          last4: "****",
          kind: "Check" as const,
          isDefault: snap.paymentMethod === "check",
        },
      ];

  return {
    propertyLabel: `${snap.propertyName} · ${snap.unitLabel}`,
    currentBalance: Number(balance.toFixed(2)),
    currentRent: Number(rent.toFixed(2)),
    lateFee,
    dueDate: prettyDate(snap.dueDate),
    currencySymbol: "$",
    allowCustomAmount: true,
    maxPayable: Math.max(balance, rent, 0),
    achEnrolled,
    methods,
  };
}

export function snapshotToPaymentHistory(
  snap: ManagementTenantSnapshot
): PaymentHistoryRecord[] {
  const propertyLabel = `${snap.propertyName} · ${snap.unitLabel}`;
  return snap.paidReceivables.map((r) => ({
    id: r.id,
    date: (r.dueDate || "").slice(0, 10),
    description: r.description || `Rent · ${propertyLabel}`,
    amount: Number(r.amount) || 0,
    methodSummary: r.paymentMethod || "Recorded payment",
    status: "Paid" as const,
    confirmationNumber: r.paymentReference || r.receivableId || r.id,
    receiptAvailable: true,
    propertyLabel,
  }));
}
