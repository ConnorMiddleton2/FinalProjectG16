import type { TenantProfile } from "@/lib/portal/profile-types";

/** Isolated mock profile for the current-tenant portal. */
export function getMockTenantProfile(): TenantProfile {
  return {
    legalName: "Alexandra Marie Tenant",
    propertyName: "Pier 12 Commerce",
    unitNumber: "Suite 210",
    occupancyClass: "commercial",
    propertyType: "office",
    tenantId: "TN-P12-210-001",
    leaseStatus: "Active",
    preferredName: "Alex Tenant",
    email: "alex.tenant@example.com",
    phone: "(662) 555-0142",
    preferredContactMethod: "email",
    emergencyContact: {
      name: "Jordan Tenant",
      phone: "(662) 555-0198",
      relationship: "Spouse / co-tenant",
    },
    vehicle: {
      hasVehicle: true,
      makeModel: "Honda CR-V",
      color: "Silver",
      licensePlate: "MS-4H210",
      parkingPermit: "Hangtag #P12-210-A",
    },
    pets: {
      hasPets: false,
      summary: "Service animals only",
      details: "Commercial suite — pets are not permitted except service animals.",
    },
    communication: {
      emailUpdates: true,
      smsUpdates: true,
      portalMessages: true,
      phoneCalls: false,
      marketingOptIn: false,
    },
  };
}
