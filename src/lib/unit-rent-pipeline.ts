import { createClient } from "@/lib/supabase/server";
import type { Receivable } from "@/lib/accounts-receivable";
import type { TenantRecord } from "@/lib/tenants";
import type {
  ManagementContractDraft,
  SharedPropertyTenant,
} from "@/lib/management-contract";
import type { OwnerApplication } from "@/lib/owner-auth";
import {
  provisionPropertiesFromApplication,
} from "@/lib/owner-properties";
import type { PropertyUnitRentSchedule } from "@/lib/fair-market-rent";
import type { TenantContract, TenantInvoice } from "@/lib/portal-records";
import {
  COLLECTIONS,
  deleteSharedRecord,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function periodNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Publish FMR unit schedules into managed_properties + vacant property_tenants. */
export async function publishUnitRentSchedules(input: {
  application: OwnerApplication;
  schedules: PropertyUnitRentSchedule[];
}): Promise<{
  ok: true;
  propertyIds: string[];
  unitCount: number;
  schedules: PropertyUnitRentSchedule[];
} | { error: string }> {
  if (!input.application.inspected) {
    return {
      error: "Confirm inspection before publishing fair-market unit rents.",
    };
  }
  if (input.schedules.length === 0) {
    return { error: "Generate a unit rent schedule first." };
  }

  const client = await createClient();

  // Ensure managed properties exist (Management path previously skipped this).
  let propertyIds = input.application.contractPropertyIds ?? [];
  if (propertyIds.length === 0) {
    const created = await provisionPropertiesFromApplication(input.application);
    propertyIds = created.map((p) => p.id);
  }

  const managed = await listSharedRecords<ManagementContractDraft>(
    client,
    COLLECTIONS.managedProperties
  );
  const byId = new Map(managed.map((p) => [p.id, p]));

  const published: PropertyUnitRentSchedule[] = [];
  let unitCount = 0;

  for (let i = 0; i < input.schedules.length; i++) {
    const schedule = input.schedules[i];
    const propertyId =
      schedule.managedPropertyId ||
      propertyIds[schedule.propertyIndex] ||
      propertyIds[i];
    if (!propertyId) {
      return { error: `No managed property for schedule ${schedule.propertyName}.` };
    }

    const property = byId.get(propertyId);
    if (property) {
      const updated: ManagementContractDraft = {
        ...property,
        monthlyRentRoll: String(Math.round(schedule.gprAtAsking)),
        annualGpr: String(Math.round(schedule.gprAtAsking * 12)),
        unitsSuites: String(schedule.unitCount),
        notes: [
          property.notes,
          `FMR unit schedule published ${new Date().toISOString().slice(0, 10)} (${schedule.marketLabel}).`,
        ]
          .filter(Boolean)
          .join("\n"),
      };
      await upsertSharedRecord(
        client,
        COLLECTIONS.managedProperties,
        updated.id,
        updated as unknown as Record<string, unknown>
      );
    }

    // Replace vacant roster rows for this property with the FMR schedule.
    const existing = await listSharedRecords<SharedPropertyTenant>(
      client,
      COLLECTIONS.propertyTenants
    );
    for (const row of existing.filter((t) => t.propertyId === propertyId)) {
      const occupied = row.status !== "vacant" && Boolean(row.name?.trim());
      if (!occupied) {
        await deleteSharedRecord(client, COLLECTIONS.propertyTenants, row.id);
      }
    }

    for (const unit of schedule.units) {
      const row: SharedPropertyTenant = {
        id: `${propertyId}-${unit.unit}`.replace(/\s+/g, "-").toLowerCase(),
        propertyId,
        propertyName: schedule.propertyName,
        unit: unit.unit,
        name: "",
        email: "",
        phone: "",
        leaseStart: "",
        leaseEnd: "",
        monthlyRent: String(unit.askingRent),
        sqft: String(unit.sqft),
        status: "vacant",
        floorPlan: unit.floorPlan,
        fairMarketRent: String(unit.fairMarketRent),
        askingRent: String(unit.askingRent),
        bedrooms: String(unit.bedrooms),
        rentPerSfMo: String(unit.rentPerSfMo),
        sourceApplicationId: input.application.id,
      };
      await upsertSharedRecord(
        client,
        COLLECTIONS.propertyTenants,
        row.id,
        row as unknown as Record<string, unknown>
      );
      unitCount += 1;
    }

    published.push({
      ...schedule,
      managedPropertyId: propertyId,
      publishedAt: new Date().toISOString(),
      inspectionConfirmed: true,
    });
  }

  return {
    ok: true,
    propertyIds,
    unitCount,
    schedules: published,
  };
}

/**
 * Move an approved S&M applicant into a vacant unit at asking/FMR rent
 * and create the first month base-rent receivable.
 */
export async function moveInTenantAtUnitRent(input: {
  propertyId: string;
  unitId: string;
  tenantName: string;
  tenantEmail: string;
  applicationId?: string;
  leaseMonths?: number;
}): Promise<
  | {
      ok: true;
      monthlyRent: number;
      receivableId: string;
      unit: SharedPropertyTenant;
    }
  | { error: string }
> {
  const client = await createClient();
  const units = await listSharedRecords<SharedPropertyTenant>(
    client,
    COLLECTIONS.propertyTenants
  );
  const unit = units.find((u) => u.id === input.unitId);
  if (!unit || unit.propertyId !== input.propertyId) {
    return { error: "Selected unit was not found on this property." };
  }
  if (unit.status === "active" && unit.name.trim()) {
    return { error: "That unit is already occupied." };
  }

  const rent = Number(unit.askingRent || unit.monthlyRent || 0);
  if (!Number.isFinite(rent) || rent <= 0) {
    return {
      error: "Unit has no asking / fair-market rent. Publish FMR schedule first.",
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const months = input.leaseMonths ?? 12;
  const end = new Date();
  end.setMonth(end.getMonth() + months);
  const leaseEnd = end.toISOString().slice(0, 10);

  const occupied: SharedPropertyTenant = {
    ...unit,
    name: input.tenantName.trim(),
    email: input.tenantEmail.trim().toLowerCase(),
    leaseStart: today,
    leaseEnd,
    monthlyRent: String(round2(rent)),
    status: "active",
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.propertyTenants,
    occupied.id,
    occupied as unknown as Record<string, unknown>
  );

  const tenant: TenantRecord = {
    id: `ten-movein-${occupied.id}`,
    name: occupied.name,
    unit: occupied.unit,
    propertyLeased: occupied.propertyName,
    category: "active",
    pendingDue: round2(rent),
    monthlyRent: round2(rent),
    sqft: Number(occupied.sqft) || 0,
    ageYears: 0,
    dateLeased: today,
    leaseEnd,
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.tenants,
    tenant.id,
    tenant as unknown as Record<string, unknown>
  );

  const period = periodNow();
  const receivableId = `RR-${occupied.propertyId}-${occupied.unit}-${period}`
    .replace(/\s+/g, "")
    .toUpperCase();
  const receivable: Receivable = {
    id: `ar-${occupied.id}-${period}`,
    receivableId,
    kind: "rental",
    customerName: occupied.name,
    customerId: tenant.id,
    property: occupied.propertyName,
    unit: occupied.unit,
    period,
    category: "base_rent",
    amount: round2(rent),
    amountReceived: 0,
    disputed: false,
    invoiceDate: `${period}-01`,
    dueDate: `${period}-05`,
    paymentMethod: "",
    paymentReference: "",
    fileName: "",
    description: `Monthly base rent — ${occupied.propertyName} · ${occupied.unit}`,
    notes: input.applicationId
      ? `Opened on move-in from application ${input.applicationId}`
      : "Opened on move-in from approved lease",
    createdAt: new Date().toISOString(),
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.rentalReceivables,
    receivable.id,
    receivable as unknown as Record<string, unknown>
  );

  const email = occupied.email.trim().toLowerCase();
  const contract: TenantContract = {
    id: `tcon-${occupied.id}`,
    property: occupied.propertyName,
    term: `${months} months`,
    rent: String(round2(rent)),
    status: "Active",
    propertyId: occupied.propertyId,
    unit: occupied.unit,
    tenantName: occupied.name,
    tenantEmail: email,
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.tenantContracts,
    contract.id,
    contract as unknown as Record<string, unknown>
  );

  const invoice: TenantInvoice = {
    id: `inv-${occupied.id}-${period}`,
    label: `${occupied.propertyName} · ${occupied.unit} rent — ${period}`,
    amount: String(round2(rent)),
    due: `${period}-05`,
    status: "Due",
    propertyId: occupied.propertyId,
    propertyName: occupied.propertyName,
    unit: occupied.unit,
    tenantName: occupied.name,
    tenantEmail: email,
    dueDate: `${period}-05`,
  };
  await upsertSharedRecord(
    client,
    COLLECTIONS.tenantInvoices,
    invoice.id,
    invoice as unknown as Record<string, unknown>
  );

  return {
    ok: true,
    monthlyRent: round2(rent),
    receivableId: receivable.id,
    unit: occupied,
  };
}
