"use server";

import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import {
  emptyWorkOrder,
  type WorkOrder,
  type WorkOrderCategory,
  type WorkOrderPriority,
} from "@/lib/maintenance";
import { getCurrentPortalTenant } from "@/lib/portal/auth-server";
import { getTenantPortalSession } from "@/lib/tenant-portal-accounts";
import { revalidatePath } from "next/cache";

const CATEGORIES: WorkOrderCategory[] = [
  "hvac",
  "plumbing",
  "electrical",
  "structural",
  "janitorial",
  "landscaping",
  "security",
  "appliance",
  "general",
  "other",
];

const PRIORITIES: WorkOrderPriority[] = [
  "low",
  "normal",
  "high",
  "emergency",
];

export type PortalWorkOrderInput = {
  title: string;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  description: string;
};

export async function portalSubmitWorkOrder(input: PortalWorkOrderInput) {
  const session = await getCurrentPortalTenant();
  if (!session) return { error: "Sign in required." as const };

  const title = input.title.trim();
  const description = input.description.trim();
  if (!title) return { error: "Title is required." as const };
  if (!description) return { error: "Description is required." as const };
  if (!CATEGORIES.includes(input.category)) {
    return { error: "Choose a valid category." as const };
  }
  if (!PRIORITIES.includes(input.priority)) {
    return { error: "Choose a valid priority." as const };
  }

  const account = await getTenantPortalSession();
  const property =
    account?.propertyName ||
    session.propertyName ||
    "";
  const unit = account?.unit || session.unit || "";
  if (!property) {
    return {
      error:
        "Your account is not linked to a property yet. Complete lease activation first, or contact CPMC." as const,
    };
  }

  const requestedBy =
    `${session.displayName || account?.fullName || "Tenant"} · ${unit || "unit TBD"}`.trim();

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString().slice(0, 10);
  const base = emptyWorkOrder();
  const order: WorkOrder = {
    ...base,
    id,
    title,
    category: input.category,
    priority: input.priority,
    property,
    unit,
    description,
    status: "pending",
    source: "tenant_submitted",
    labor: "in_house",
    vendorName: "",
    estimatedCost: "",
    actualCost: "",
    requestedBy,
    createdAt,
    dueDate: "",
    completedAt: "",
  };

  const client = await createClient();
  await upsertSharedRecord(
    client,
    COLLECTIONS.workOrders,
    id,
    order as unknown as Record<string, unknown>
  );

  revalidatePath("/ops/maintenance");
  revalidatePath("/portal/maintenance");
  revalidatePath("/portal/maintenance/new");

  return {
    ok: true as const,
    id,
    requestNumber: `WO-${createdAt.replace(/-/g, "")}-${id.slice(0, 4).toUpperCase()}`,
    submittedAt: new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    order,
  };
}

export async function portalListMyWorkOrders() {
  const session = await getCurrentPortalTenant();
  if (!session) return [];

  const account = await getTenantPortalSession();
  const property =
    account?.propertyName || session.propertyName || "";
  const unit = account?.unit || session.unit || "";
  const name = (session.displayName || account?.fullName || "").toLowerCase();

  const client = await createClient();
  const all = await listSharedRecords<WorkOrder>(
    client,
    COLLECTIONS.workOrders
  );

  return all
    .filter((wo) => {
      if (wo.source === "tenant_submitted") {
        const byName =
          name &&
          (wo.requestedBy || "").toLowerCase().includes(name.split(" ")[0] || "");
        const byProperty =
          property &&
          (wo.property || "").toLowerCase() === property.toLowerCase();
        const byUnit =
          !unit ||
          (wo.unit || "").toLowerCase().includes(unit.toLowerCase()) ||
          unit.toLowerCase().includes((wo.unit || "").toLowerCase());
        if (byProperty && byUnit) return true;
        if (byName && byProperty) return true;
      }
      // Also show management-created WOs on this tenant's unit
      if (
        property &&
        (wo.property || "").toLowerCase() === property.toLowerCase() &&
        unit &&
        ((wo.unit || "").toLowerCase().includes(unit.toLowerCase()) ||
          unit.toLowerCase().includes((wo.unit || "").toLowerCase()))
      ) {
        return true;
      }
      return false;
    })
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}
