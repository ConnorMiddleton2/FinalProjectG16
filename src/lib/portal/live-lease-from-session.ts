import type { PortalTenantSession } from "@/lib/portal/auth";
import type { TenantDashboardData } from "@/lib/portal/dashboard-types";
import type { LeaseInformation } from "@/lib/portal/lease-types";
import type { MakePaymentContext } from "@/lib/portal/make-payment-types";
import type { PaymentsOverview } from "@/lib/portal/payments-types";
import {
  paymentMethodToPortalBrand,
  paymentMethodToPortalKind,
  type TenantPaymentMethod,
} from "@/lib/payment-methods";

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

function formatRent(monthlyRent?: number) {
  if (monthlyRent == null || !Number.isFinite(monthlyRent) || monthlyRent <= 0) {
    return "—";
  }
  return money(monthlyRent);
}

function leaseDates() {
  const start = new Date();
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const pretty = (d: Date) =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  return {
    startIso: iso(start),
    endIso: iso(end),
    startPretty: pretty(start),
    endPretty: pretty(end),
    nextDuePretty: pretty(
      new Date(start.getFullYear(), start.getMonth() + 1, 1)
    ),
  };
}

/** True when S&M approval linked a building/unit onto this portal account. */
export function sessionHasAssignedLease(session: PortalTenantSession) {
  const hasPlace = Boolean(
    session.propertyName || session.unit || session.propertyId
  );
  if (!hasPlace) return false;
  return (
    session.accountStatus === "active" ||
    session.lifecycle === "current" ||
    Boolean(session.propertyName && session.unit)
  );
}

export function buildLiveLeaseFromSession(
  session: PortalTenantSession
): LeaseInformation | null {
  if (!sessionHasAssignedLease(session)) return null;

  const propertyName = session.propertyName || "Your property";
  const unit = session.unit || "—";
  const rent = formatRent(session.monthlyRent);
  const dates = leaseDates();
  const shortId = (session.tenantAccountId || session.userId).slice(0, 8);

  return {
    id: `lease-${session.tenantScopeId}`,
    leaseNumber: `HL-${shortId.toUpperCase()}`,
    status: "Active",
    occupancyClass: "commercial",
    propertyType: "office",
    propertyName,
    propertyAddress: propertyName,
    unitNumber: unit,
    leaseStartDate: dates.startIso,
    leaseEndDate: dates.endIso,
    monthlyRent: rent,
    securityDeposit: rent === "—" ? "—" : rent,
    occupants: [
      {
        id: "occ-primary",
        name: session.displayName,
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
    renewalDeadline: dates.endIso,
    moveOutNoticeRequirement:
      "Written notice required at least 60 days before the lease end date.",
    documentTitle: `Lease — ${propertyName} · ${unit}`,
    documentFileName: `cpmc-lease-${shortId}.pdf`,
  };
}

export function buildLiveDashboardFromSession(
  session: PortalTenantSession
): TenantDashboardData | null {
  if (!sessionHasAssignedLease(session)) return null;

  const propertyName = session.propertyName || "Your property";
  const unit = session.unit || "—";
  const propertyLabel = [propertyName, unit].filter(Boolean).join(" · ");
  const rent = formatRent(session.monthlyRent);
  const dates = leaseDates();

  return {
    tenantName: session.displayName,
    summary: {
      nextRentAmount: rent,
      rentDueDate: dates.nextDuePretty,
      paymentStatus: "Due",
      leaseEndDate: dates.endPretty,
      openMaintenanceCount: 0,
      unreadAnnouncements: 0,
      unreadMessages: 0,
    },
    upcomingPayment:
      rent === "—"
        ? null
        : {
            id: "pay-upcoming-live",
            label: "Next rent",
            amount: rent,
            dueDate: dates.nextDuePretty,
            status: "Due",
            property: propertyLabel,
          },
    recentPayments: [],
    activeMaintenance: [],
    announcements: [
      {
        id: "ann-welcome",
        title: `Welcome to ${propertyName}`,
        postedAt: dates.startPretty,
        preview: `Sales & Marketing approved your lease for ${propertyLabel}. You are now a current CPMC tenant.`,
        unread: true,
      },
    ],
    lease: {
      propertyName,
      unit,
      occupancyClass: "commercial",
      propertyType: "office",
      term: `${dates.startPretty} – ${dates.endPretty}`,
      monthlyRent: rent,
      securityDeposit: rent === "—" ? "—" : rent,
      endDate: dates.endPretty,
    },
  };
}

/**
 * Payments overview from the portal account when Management AR is not linked yet.
 * Keeps the Payments tab aligned with dashboard rent due.
 */
export function buildLivePaymentsFromSession(
  session: PortalTenantSession
): PaymentsOverview | null {
  if (!sessionHasAssignedLease(session)) return null;

  const rent = Number(session.monthlyRent) || 0;
  if (rent <= 0) return null;

  const propertyName = session.propertyName || "Your property";
  const unit = session.unit || "—";
  const propertyLabel = [propertyName, unit].filter(Boolean).join(" · ");
  const dates = leaseDates();
  const amount = moneyExact(rent);

  const preferred = session.preferredPaymentMethod;
  const method: TenantPaymentMethod =
    preferred === "ach" || preferred === "check" || preferred === "debit_card"
      ? preferred
      : "check";
  const last4 = session.paymentMethodLast4 || "****";
  const portalKind = paymentMethodToPortalKind(method);
  const portalBrand = paymentMethodToPortalBrand(method);
  const ach = method === "ach";

  return {
    currentBalance: amount,
    amountDue: amount,
    dueDate: dates.nextDuePretty,
    paymentStatus: "Due",
    lateFee: null,
    autopay: {
      enabled: ach,
      nextRunDate: ach ? dates.nextDuePretty : null,
      methodLabel: ach ? "ACH" : null,
    },
    savedMethod: preferred
      ? {
          id: `pm-session-${method}`,
          brand: portalBrand,
          last4,
          kind: portalKind,
          isDefault: true,
        }
      : null,
    ledger: [
      {
        id: "led-session-rent",
        label: `Rent · ${propertyLabel}`,
        amount,
        kind: "charge",
        date: dates.nextDuePretty,
      },
    ],
    transactions: [
      {
        id: "txn-session-due",
        label: `Rent · ${propertyLabel}`,
        amount,
        date: dates.startIso.slice(0, 8) + "01",
        displayDate: dates.nextDuePretty,
        status: "Due",
        type: "Rent",
        methodSummary: "Not paid",
        receiptAvailable: false,
      },
    ],
    pendingCheck: null,
  };
}

export function buildLiveMakePaymentFromSession(
  session: PortalTenantSession
): MakePaymentContext | null {
  if (!sessionHasAssignedLease(session)) return null;
  const rent = Number(session.monthlyRent) || 0;
  if (rent <= 0) return null;

  const propertyLabel =
    [session.propertyName, session.unit].filter(Boolean).join(" · ") ||
    "Your leased unit";
  const dates = leaseDates();
  const preferred = session.preferredPaymentMethod;
  const achEnrolled = preferred === "ach";

  return {
    propertyLabel,
    currentBalance: rent,
    currentRent: rent,
    lateFee: 0,
    dueDate: dates.nextDuePretty,
    currencySymbol: "$",
    allowCustomAmount: true,
    maxPayable: rent,
    achEnrolled,
    methods: achEnrolled
      ? [
          {
            id: "pm-ach",
            brand: "ACH",
            last4: "****",
            kind: "ACH",
            isDefault: true,
          },
        ]
      : [
          {
            id: "pm-debit",
            brand: "Debit",
            last4: "****",
            kind: "Debit card",
            isDefault: true,
          },
          {
            id: "pm-check",
            brand: "Check",
            last4: "****",
            kind: "Check",
            isDefault: false,
          },
        ],
  };
}
