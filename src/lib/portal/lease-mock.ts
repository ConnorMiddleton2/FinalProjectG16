import type { LeaseInformation } from "@/lib/portal/lease-types";

/**
 * Isolated mock lease for the current-tenant portal.
 * Tenant-facing fields only — no private management notes.
 */
export function getMockLeaseInformation(): LeaseInformation {
  return {
    id: "lease-pier12-210",
    leaseNumber: "HL-P12-210-2026",
    status: "Active",
    occupancyClass: "commercial",
    propertyType: "office",
    propertyName: "Pier 12 Commerce",
    propertyAddress: "120 CPMC Pier, Suite Building A, Harbor City, MS 39501",
    unitNumber: "Suite 210",
    leaseStartDate: "2026-01-01",
    leaseEndDate: "2027-12-31",
    monthlyRent: "$4,800.00",
    securityDeposit: "$4,800.00",
    occupants: [
      {
        id: "occ-1",
        name: "Alex Tenant",
        role: "Primary tenant",
      },
      {
        id: "occ-2",
        name: "Jordan Tenant",
        role: "Business contact",
      },
      {
        id: "occ-3",
        name: "Casey Guest",
        role: "Authorized occupant",
      },
    ],
    parking: {
      spaces: 2,
      locations: "Garage Level B · Spaces B-14 and B-15",
      permits: "Hangtag #P12-210-A, Hangtag #P12-210-B",
      notes: "Visitor parking in Lot C after 5 PM and on weekends.",
    },
    pets: {
      allowed: false,
      summary: "Service animals only",
      details:
        "Commercial suite leases do not permit pets. Service animals are accommodated under applicable law.",
    },
    renewalDeadline: "2027-09-30",
    moveOutNoticeRequirement:
      "Written notice required at least 60 days before the lease end date.",
    documentTitle: "Commercial Suite Lease — Pier 12 · Suite 210",
    documentFileName: "pier12-suite-210-lease-2026.pdf",
  };
}

export function buildLeaseDocumentText(lease: LeaseInformation): string {
  const occupants = lease.occupants
    .map((person) => `- ${person.name} (${person.role})`)
    .join("\n");

  return [
    "CPMC Property Management Company",
    "Lease summary (tenant copy — demo)",
    "",
    `Lease number: ${lease.leaseNumber}`,
    `Status: ${lease.status}`,
    `Occupancy: ${lease.occupancyClass === "commercial" ? "Commercial" : "Personal"}`,
    `Property type: ${lease.propertyType}`,
    `Document: ${lease.documentTitle}`,
    "",
    `Property: ${lease.propertyName}`,
    `Address: ${lease.propertyAddress}`,
    `${lease.occupancyClass === "commercial" ? "Suite" : "Unit"}: ${lease.unitNumber}`,
    `Term: ${lease.leaseStartDate} to ${lease.leaseEndDate}`,
    `Monthly rent: ${lease.monthlyRent}`,
    `Security deposit: ${lease.securityDeposit}`,
    "",
    lease.occupancyClass === "commercial" ? "Authorized contacts:" : "Occupants:",
    occupants,
    "",
    "Parking:",
    `Spaces: ${lease.parking.spaces}`,
    `Locations: ${lease.parking.locations}`,
    `Permits: ${lease.parking.permits}`,
    `Notes: ${lease.parking.notes}`,
    "",
    "Pets:",
    lease.pets.summary,
    lease.pets.details,
    "",
    `Renewal deadline: ${lease.renewalDeadline}`,
    `Move-out notice: ${lease.moveOutNoticeRequirement}`,
    "",
    "This download is a tenant-facing demo summary. It does not include private management notes.",
  ].join("\n");
}
