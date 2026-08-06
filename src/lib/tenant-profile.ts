import {
  getLeaseEnd,
  getMonthlyRent,
  getOutstandingBalance,
  getPaymentStatus,
  isLeaseExpiringWithinDays,
  type TenantRecord,
} from "@/lib/tenants";
import type { ManagementContractDraft } from "@/lib/management-contract";
import type { WorkOrder } from "@/lib/maintenance";

export function daysRemainingOnLease(
  t: TenantRecord,
  now = new Date()
): number | null {
  const end = getLeaseEnd(t);
  if (!end) return null;
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(endDate.getTime())) return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = endDate.getTime() - start.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export type TenantWarning = {
  id: string;
  text: string;
  tone: "warn" | "danger";
};

export function tenantWarnings(t: TenantRecord): TenantWarning[] {
  const warnings: TenantWarning[] = [];
  if (isLeaseExpiringWithinDays(t, 90)) {
    warnings.push({
      id: "expiring",
      text: "Lease expiring within 90 days",
      tone: "warn",
    });
  }
  const payment = getPaymentStatus(t);
  if (payment === "late") {
    warnings.push({
      id: "late",
      text: "Payment status is late (delinquent)",
      tone: "danger",
    });
  }
  if (payment === "partial") {
    warnings.push({
      id: "partial",
      text: "Payment status is partial",
      tone: "warn",
    });
  }
  if (getOutstandingBalance(t) > 0) {
    warnings.push({
      id: "balance",
      text: "Outstanding balance greater than zero",
      tone: "danger",
    });
  }
  return warnings;
}

export type ActivityItem = {
  id: string;
  date: string;
  label: string;
};

/** Derive compact activity from real timestamps / statuses only — no invented events. */
export function deriveTenantActivity(
  t: TenantRecord,
  property: ManagementContractDraft | null,
  workOrders: WorkOrder[]
): ActivityItem[] {
  const items: ActivityItem[] = [];

  const created =
    (t as TenantRecord & { createdAt?: string }).createdAt || "";
  if (created) {
    items.push({
      id: "tenant-created",
      date: created.slice(0, 10),
      label: "Tenant record present in management master list",
    });
  }

  if (property?.createdAt) {
    items.push({
      id: "property-created",
      date: property.createdAt.slice(0, 10),
      label: `Managed property “${property.propertyName}” on file`,
    });
  }

  if (isLeaseExpiringWithinDays(t, 90)) {
    items.push({
      id: "lease-soon",
      date: getLeaseEnd(t) || "",
      label: "Lease ending within 90 days",
    });
  }

  if (getPaymentStatus(t) === "late" || t.category === "past_due") {
    items.push({
      id: "delinquent",
      date: new Date().toISOString().slice(0, 10),
      label: "Marked delinquent / past due on master list",
    });
  }

  for (const wo of workOrders.slice(0, 5)) {
    if (wo.createdAt) {
      items.push({
        id: `wo-${wo.id}`,
        date: wo.createdAt.slice(0, 10),
        label: `Work order: ${wo.title} (${wo.status})`,
      });
    }
  }

  return items
    .filter((i) => i.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);
}

export function matchWorkOrdersForTenant(
  orders: WorkOrder[],
  t: TenantRecord
): WorkOrder[] {
  const prop = t.propertyLeased.trim().toLowerCase();
  const unit = t.unit.trim().toLowerCase();
  return orders.filter((wo) => {
    const woProp = (wo.property || "").trim().toLowerCase();
    if (!prop || !woProp) return false;
    if (woProp !== prop) return false;
    if (!unit) return true;
    const woUnit = (wo.unit || "").trim().toLowerCase();
    return !woUnit || woUnit === unit;
  });
}

export function formatDaysRemaining(days: number | null): string {
  if (days == null) return "Not entered";
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Expires today";
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function leaseSummaryText(t: TenantRecord): string {
  const rent = getMonthlyRent(t);
  const end = getLeaseEnd(t);
  const start = t.dateLeased || "—";
  const rentText = rent > 0 ? `$${rent.toLocaleString()}/mo` : "rent not entered";
  const endText = end || "end date not entered";
  return `Lease from ${start} to ${endText} at ${rentText}. Status: ${t.category.replace("_", " ")}.`;
}
