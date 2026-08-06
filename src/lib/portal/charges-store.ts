import type { AdditionalCharge } from "@/lib/portal/charges-types";
import { DEMO_TENANT_ID } from "@/lib/portal/documents-types";

const DEMO_CHARGES: AdditionalCharge[] = [
  {
    id: "chg-util-1",
    kind: "utility",
    label: "Water & sewer",
    description: "Metered water allocation for Suite 210.",
    amount: 48.25,
    dueDate: "2026-08-15",
    status: "open",
    occupancyClass: "commercial",
    periodLabel: "July 2026",
  },
  {
    id: "chg-cam-1",
    kind: "cam",
    label: "Common area maintenance reconciliation",
    description:
      "Common area maintenance true-up for Pier 12 Commerce (second quarter estimate).",
    amount: 312.0,
    dueDate: "2026-08-20",
    status: "open",
    occupancyClass: "commercial",
    periodLabel: "Second quarter 2026",
  },
  {
    id: "chg-park-1",
    kind: "parking",
    label: "Reserved parking",
    description: "Garage stall P-14 monthly fee.",
    amount: 75.0,
    dueDate: "2026-08-01",
    status: "paid",
    occupancyClass: "personal",
    periodLabel: "August 2026",
  },
  {
    id: "chg-fee-1",
    kind: "fee",
    label: "Amenity access",
    description: "Fitness center add-on for residential lease.",
    amount: 25.0,
    dueDate: "2026-08-01",
    status: "open",
    occupancyClass: "personal",
    periodLabel: "August 2026",
  },
];

const byTenant = new Map<string, AdditionalCharge[]>();

export function getChargesForTenant(tenantScopeId: string): AdditionalCharge[] {
  if (!byTenant.has(tenantScopeId)) {
    byTenant.set(
      tenantScopeId,
      DEMO_CHARGES.map((c) => ({ ...c }))
    );
  }
  return byTenant.get(tenantScopeId)!.map((c) => ({ ...c }));
}

export function setChargesForTenant(
  tenantScopeId: string,
  charges: AdditionalCharge[]
) {
  byTenant.set(
    tenantScopeId,
    charges.map((c) => ({ ...c }))
  );
}

export function getChargesDemoFixture(
  tenantId: string = DEMO_TENANT_ID
): AdditionalCharge[] {
  return getChargesForTenant(tenantId);
}
