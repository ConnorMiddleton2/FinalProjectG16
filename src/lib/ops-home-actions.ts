import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COLLECTIONS,
  listSharedRecords,
} from "@/lib/shared-store";
import type { HrOpsModule } from "@/lib/hr";
import type { OwnerApplication } from "@/lib/owner-auth";
import type { SmReceipt, SmTenantApplication } from "@/lib/sales-marketing";
import type { MaintenanceDocument, WorkOrder } from "@/lib/maintenance";
import {
  MANAGEMENT_REVIEW_DAYS,
  listQualifyingObligations,
} from "@/lib/collections";
import type { DepartmentExpense } from "@/lib/management";
import type { RentalReceivable } from "@/lib/rental-receivables";

export type OpsHomePropertyCount = {
  name: string;
  count: number;
};

export type OpsHomeActionTile = {
  id: string;
  label: string;
  count: number;
  href: string;
  /** Required module; null = show to everyone with ops access. */
  module: HrOpsModule | null;
  /** Top properties contributing to the count (for the ops home cards). */
  byProperty: OpsHomePropertyCount[];
};

function isOpenLeaseApp(app: SmTenantApplication) {
  if (app.movedInAt || app.status === "Completed") return false;
  const sm = app.smStatus ?? "new";
  return sm !== "approved" && sm !== "declined";
}

function isPendingApprovalStatus(status: string | undefined) {
  return (status || "").toLowerCase() === "pending";
}

function propertyLabel(raw: string | undefined | null, fallback = "Unassigned") {
  const name = (raw || "").trim();
  return name || fallback;
}

/** Aggregate counts by property name, sorted by count desc then name. */
function tallyProperties(names: string[], limit = 4): OpsHomePropertyCount[] {
  const map = new Map<string, number>();
  for (const raw of names) {
    const name = propertyLabel(raw);
    map.set(name, (map.get(name) || 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function extractPropertyFromText(text: string | undefined): string {
  const t = (text || "").trim();
  if (!t) return "Company-wide";
  // Prefer an explicit " · Property" suffix used on S&M receipts.
  const parts = t.split(" · ");
  if (parts.length >= 2) {
    const last = parts[parts.length - 1]?.trim();
    if (last && last.length < 60) return last;
  }
  return "Company-wide";
}

/** Load bottom-row action counts for the operations welcome screen. */
export async function loadOpsHomeActionTiles(
  client: SupabaseClient
): Promise<OpsHomeActionTile[]> {
  const [
    ownerApps,
    leaseApps,
    workOrders,
    receivables,
    deptExpenses,
    smReceipts,
    maintDocs,
  ] = await Promise.all([
    listSharedRecords<OwnerApplication>(client, COLLECTIONS.ownerApplications),
    listSharedRecords<SmTenantApplication>(
      client,
      COLLECTIONS.tenantApplications
    ),
    listSharedRecords<WorkOrder>(client, COLLECTIONS.workOrders),
    listSharedRecords<RentalReceivable>(client, COLLECTIONS.rentalReceivables),
    listSharedRecords<DepartmentExpense>(
      client,
      COLLECTIONS.departmentExpenses
    ),
    listSharedRecords<SmReceipt>(client, COLLECTIONS.smReceipts),
    listSharedRecords<MaintenanceDocument>(
      client,
      COLLECTIONS.maintenanceDocuments
    ),
  ]);

  const openOwnerApps = ownerApps.filter(
    (a) =>
      a.status === "pending" ||
      a.status === "needs_info" ||
      a.status === "awaiting_signature"
  );
  const ownerPropertyNames = openOwnerApps.flatMap((a) => {
    const props = (a.properties || [])
      .map((p) => p.propertyName)
      .filter(Boolean) as string[];
    return props.length > 0 ? props : ["Portfolio / new owner"];
  });

  const openLeaseApps = leaseApps.filter(isOpenLeaseApp);
  const leasePropertyNames = openLeaseApps.map(
    (a) => a.building || a.property || "Unassigned"
  );

  const openWorkOrders = workOrders.filter(
    (w) => w.status === "pending" || w.status === "in_progress"
  );
  const woPropertyNames = openWorkOrders.map((w) => w.property || "Unassigned");

  const overdueObligations = listQualifyingObligations(receivables).filter(
    (o) => o.daysOverdue >= MANAGEMENT_REVIEW_DAYS
  );
  const overdueByTenant = new Map<string, string>();
  for (const o of overdueObligations) {
    if (!overdueByTenant.has(o.tenantId)) {
      overdueByTenant.set(
        o.tenantId,
        o.receivable.property || "Unassigned"
      );
    }
  }
  const overduePropertyNames = [...overdueByTenant.values()];

  const pendingDept = deptExpenses.filter((e) =>
    isPendingApprovalStatus(e.status)
  );
  const pendingSm = smReceipts.filter((r) =>
    isPendingApprovalStatus(r.status)
  );
  const pendingMaint = maintDocs.filter((d) =>
    isPendingApprovalStatus(d.approvalStatus ?? "approved")
  );
  const approvalPropertyNames = [
    ...pendingDept.map(() => "Company-wide"),
    ...pendingSm.map((r) => extractPropertyFromText(r.description)),
    ...pendingMaint.map((d) => d.property || "Unassigned"),
  ];

  return [
    {
      id: "owner-apps",
      label: "Owner Applications",
      count: openOwnerApps.length,
      href: "/ops/management/owners?tab=applications",
      module: "management",
      byProperty: tallyProperties(ownerPropertyNames),
    },
    {
      id: "tenant-apps",
      label: "Tenant Applications",
      count: openLeaseApps.length,
      href: "/ops/sales-marketing/applications",
      module: "sales-marketing",
      byProperty: tallyProperties(leasePropertyNames),
    },
    {
      id: "maintenance",
      label: "Maintenance WO",
      count: openWorkOrders.length,
      href: "/ops/maintenance",
      module: "maintenance",
      byProperty: tallyProperties(woPropertyNames),
    },
    {
      id: "tenant-60",
      label: "Overdue tenants",
      count: overdueByTenant.size,
      href: "/ops/management/missed-payments",
      module: "management",
      byProperty: tallyProperties(overduePropertyNames),
    },
    {
      id: "approvals",
      label: "Invoice/Receipt Approvals",
      count: pendingDept.length + pendingSm.length + pendingMaint.length,
      href: "/ops/management/approvals",
      module: "management",
      byProperty: tallyProperties(approvalPropertyNames),
    },
  ];
}

export function filterOpsHomeActionTiles(
  tiles: OpsHomeActionTile[],
  allowedModules: HrOpsModule[] | null
) {
  if (allowedModules === null) return tiles;
  return tiles.filter(
    (t) => t.module == null || allowedModules.includes(t.module)
  );
}
