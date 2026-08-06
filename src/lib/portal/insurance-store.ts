import type { InsurancePolicy } from "@/lib/portal/insurance-types";
import { DEMO_TENANT_ID } from "@/lib/portal/documents-types";

const DEMO_POLICIES: InsurancePolicy[] = [
  {
    id: "ins-renter-1",
    occupancyClass: "personal",
    policyType: "Renters liability",
    carrier: "Harbor Mutual",
    policyNumber: "HM-RNT-88421",
    coverageAmount: "$100,000",
    effectiveDate: "2026-01-01",
    expirationDate: "2027-01-01",
    status: "valid",
    documentLabel: "Certificate-Renters-2026.pdf",
    notes: "Required for Pier 12 residential leases.",
  },
  {
    id: "ins-commercial-1",
    occupancyClass: "commercial",
    policyType: "General liability certificate",
    carrier: "Gulf Coast Commercial",
    policyNumber: "GCC-GL-55201",
    coverageAmount: "$1,000,000",
    effectiveDate: "2025-09-01",
    expirationDate: "2026-09-01",
    status: "expiring_soon",
    documentLabel: "Certificate-Suite210-General-Liability.pdf",
    notes:
      "Commercial suite certificate of insurance — renewal due before move-in anniversary.",
  },
  {
    id: "ins-commercial-2",
    occupancyClass: "commercial",
    policyType: "Workers compensation",
    carrier: "—",
    policyNumber: "—",
    coverageAmount: "—",
    effectiveDate: "",
    expirationDate: "",
    status: "missing",
    documentLabel: "",
    notes: "Required for commercial tenants with on-site employees.",
  },
];

const byTenant = new Map<string, InsurancePolicy[]>();

function cloneDemo(): InsurancePolicy[] {
  return DEMO_POLICIES.map((p) => ({ ...p }));
}

export function getInsurancePoliciesForTenant(
  tenantScopeId: string
): InsurancePolicy[] {
  if (!byTenant.has(tenantScopeId)) {
    byTenant.set(
      tenantScopeId,
      tenantScopeId === DEMO_TENANT_ID || tenantScopeId.includes("demo")
        ? cloneDemo()
        : cloneDemo()
    );
  }
  return byTenant.get(tenantScopeId)!.map((p) => ({ ...p }));
}

export function setInsurancePoliciesForTenant(
  tenantScopeId: string,
  policies: InsurancePolicy[]
) {
  byTenant.set(
    tenantScopeId,
    policies.map((p) => ({ ...p }))
  );
}
