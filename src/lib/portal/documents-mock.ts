import {
  DEMO_TENANT_ID,
  OTHER_TENANT_ID,
  type TenantDocument,
} from "@/lib/portal/documents-types";

/**
 * Isolated document catalog for the portal.
 * Includes other-tenant files that must be stripped by authorization filtering.
 */
export function getAllMockDocuments(): TenantDocument[] {
  const alex = DEMO_TENANT_ID;
  const other = OTHER_TENANT_ID;

  return [
    {
      id: "doc-lease-1",
      fileName: "pier12-suite-210-lease-2026.pdf",
      category: "Lease Documents",
      dateAdded: "2026-01-02",
      fileType: "PDF",
      fileSizeBytes: 842_110,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "Fully executed commercial suite lease.",
      previewText:
        "Commercial Suite Lease — Pier 12 · Suite 210\nTerm: Jan 1, 2026 – Dec 31, 2027\nMonthly rent: $4,800.00\nSecurity deposit: $4,800.00\n\nTenant-facing summary only.",
      requiresAcknowledgment: true,
      acknowledgmentLabel: "I acknowledge I have received and can access my lease agreement.",
    },
    {
      id: "doc-lease-2",
      fileName: "suite-210-lease-addendum-parking.pdf",
      category: "Lease Documents",
      dateAdded: "2026-01-02",
      fileType: "PDF",
      fileSizeBytes: 214_500,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "Parking assignment addendum.",
      previewText:
        "Parking Addendum\nSpaces B-14 and B-15 · Garage Level B\nHangtags P12-210-A / P12-210-B.",
      requiresAcknowledgment: true,
      acknowledgmentLabel: "I acknowledge the parking addendum terms.",
    },
    {
      id: "doc-receipt-1",
      fileName: "receipt-apr-2026-rent.txt",
      category: "Payment Receipts",
      dateAdded: "2026-04-01",
      fileType: "TXT",
      fileSizeBytes: 1_842,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "April 2026 rent payment confirmation.",
      previewText:
        "CPMC Payment Receipt\nConfirmation: PAY-2026-0401-210\nAmount: $4,800.00\nPaid: Apr 1, 2026\nMethod: Card ending 4242",
    },
    {
      id: "doc-receipt-2",
      fileName: "receipt-mar-2026-rent.pdf",
      category: "Payment Receipts",
      dateAdded: "2026-03-01",
      fileType: "PDF",
      fileSizeBytes: 96_400,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "March 2026 rent receipt.",
      previewText:
        "Receipt — March 2026 Rent\nAmount: $4,800.00\nStatus: Paid\nMethod: ACH ····8812",
    },
    {
      id: "doc-policy-1",
      fileName: "pier12-building-rules.pdf",
      category: "Property Policies",
      dateAdded: "2026-01-05",
      fileType: "PDF",
      fileSizeBytes: 512_220,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "Building rules and quiet hours.",
      previewText:
        "Pier 12 Building Rules\nQuiet hours 10 PM – 7 AM\nLoading dock reservations required\nNo overnight storage in corridors.",
    },
    {
      id: "doc-policy-2",
      fileName: "cpmc-pet-policy.pdf",
      category: "Property Policies",
      dateAdded: "2026-01-05",
      fileType: "PDF",
      fileSizeBytes: 188_900,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "Pet policy for approved animals.",
      previewText:
        "Pet Policy\nApproved pets only\nRelief area east of Pier 12\nPet rent as listed on lease.",
    },
    {
      id: "doc-movein-1",
      fileName: "move-in-checklist-suite-210.pdf",
      category: "Move-In Documents",
      dateAdded: "2025-12-28",
      fileType: "PDF",
      fileSizeBytes: 301_100,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "Move-in checklist completed at keys pickup.",
      previewText:
        "Move-In Checklist — Suite 210\nKeys issued: 3\nAccess fobs: 2\nUtilities confirmed active.",
    },
    {
      id: "doc-movein-2",
      fileName: "welcome-packet-pier12.pdf",
      category: "Move-In Documents",
      dateAdded: "2025-12-20",
      fileType: "PDF",
      fileSizeBytes: 1_204_000,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "Welcome packet and amenity guide.",
      previewText:
        "Welcome to Pier 12\nLobby hours, wifi guest network, and maintenance portal guide.",
    },
    {
      id: "doc-inspect-1",
      fileName: "move-in-inspection-photos.webp",
      category: "Inspection Reports",
      dateAdded: "2025-12-29",
      fileType: "WEBP",
      fileSizeBytes: 640_800,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "Move-in condition photo set cover image.",
      previewText:
        "Inspection photo preview (demo)\nSuite 210 condition at move-in.\nImage files open in the preview modal when supported.",
    },
    {
      id: "doc-inspect-2",
      fileName: "move-in-inspection-report.pdf",
      category: "Inspection Reports",
      dateAdded: "2025-12-29",
      fileType: "PDF",
      fileSizeBytes: 455_600,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "Signed move-in inspection report.",
      previewText:
        "Move-In Inspection Report\nNo major deficiencies noted.\nMinor scuff on corridor-side door noted by tenant.",
      requiresAcknowledgment: true,
      acknowledgmentLabel: "I acknowledge this move-in inspection report.",
    },
    {
      id: "doc-notice-1",
      fileName: "fire-drill-notice-may-2026.pdf",
      category: "Notices",
      dateAdded: "2026-04-20",
      fileType: "PDF",
      fileSizeBytes: 112_300,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "Scheduled fire drill notice.",
      previewText:
        "Fire Drill Notice\nMay 8, 2026 · 10:00 AM\nExpect brief alarms. No evacuation required unless directed.",
      requiresAcknowledgment: true,
      acknowledgmentLabel: "I acknowledge I have read this fire drill notice.",
    },
    {
      id: "doc-notice-2",
      fileName: "garage-maintenance-notice.pdf",
      category: "Notices",
      dateAdded: "2026-03-12",
      fileType: "PDF",
      fileSizeBytes: 98_700,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "Garage Level B maintenance window.",
      previewText:
        "Garage Notice\nLevel B closed Apr 4, 2026 1 AM – 5 AM for sealing.",
    },
    {
      id: "doc-ins-1",
      fileName: "renter-liability-certificate.pdf",
      category: "Insurance Documents",
      dateAdded: "2026-01-08",
      fileType: "PDF",
      fileSizeBytes: 276_400,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "Proof of liability insurance on file.",
      previewText:
        "Certificate of Liability Insurance\nNamed insured: Alex Tenant\nCoverage meets lease minimums through Dec 31, 2026.",
    },
    {
      id: "doc-ins-2",
      fileName: "insurance-requirements.pdf",
      category: "Insurance Documents",
      dateAdded: "2026-01-03",
      fileType: "PDF",
      fileSizeBytes: 154_200,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "Required insurance coverage summary.",
      previewText:
        "Insurance Requirements\nMinimum liability as stated in lease Section 12.\nCPMC listed as additional interest.",
    },
    {
      id: "doc-renewal-1",
      fileName: "renewal-offer-2028-draft.pdf",
      category: "Renewal Documents",
      dateAdded: "2026-04-15",
      fileType: "PDF",
      fileSizeBytes: 388_900,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "Early renewal offer packet.",
      previewText:
        "Renewal Offer (Draft)\nProposed term: Jan 1, 2028 – Dec 31, 2028\nRespond by renewal deadline on lease page.",
    },
    {
      id: "doc-renewal-2",
      fileName: "renewal-faq.txt",
      category: "Renewal Documents",
      dateAdded: "2026-04-15",
      fileType: "TXT",
      fileSizeBytes: 4_120,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "Renewal process FAQ.",
      previewText:
        "Renewal FAQ\n1. Submit request in portal.\n2. CPMC confirms terms.\n3. Signed renewal appears here when complete.",
    },
    {
      id: "doc-moveout-1",
      fileName: "move-out-checklist.pdf",
      category: "Move-Out Documents",
      dateAdded: "2026-02-01",
      fileType: "PDF",
      fileSizeBytes: 201_500,
      authorizedTenantIds: [alex],
      previewSupported: true,
      description: "Move-out checklist for when you give notice.",
      previewText:
        "Move-Out Checklist\nReturn keys and fobs\nForwarding address\nFinal walkthrough scheduling.",
    },
    {
      id: "doc-moveout-2",
      fileName: "deposit-return-guide.docx",
      category: "Move-Out Documents",
      dateAdded: "2026-02-01",
      fileType: "DOCX",
      fileSizeBytes: 88_200,
      authorizedTenantIds: [alex],
      previewSupported: false,
      description: "Deposit return timing guide (Word).",
      previewText: "",
    },
    // Other-tenant documents — must never appear for demo-tenant-alex.
    {
      id: "doc-other-lease",
      fileName: "canal-yard-unit-b-lease.pdf",
      category: "Lease Documents",
      dateAdded: "2026-03-01",
      fileType: "PDF",
      fileSizeBytes: 700_000,
      authorizedTenantIds: [other],
      previewSupported: true,
      description: "Other tenant lease — restricted.",
      previewText: "RESTRICTED — other tenant",
    },
    {
      id: "doc-other-receipt",
      fileName: "receipt-other-tenant-private.pdf",
      category: "Payment Receipts",
      dateAdded: "2026-04-02",
      fileType: "PDF",
      fileSizeBytes: 50_000,
      authorizedTenantIds: [other],
      previewSupported: true,
      description: "Other tenant receipt — restricted.",
      previewText: "RESTRICTED — other tenant",
    },
  ];
}

export function getAuthorizedMockDocuments(
  tenantId: string
): TenantDocument[] {
  return getAllMockDocuments().filter((doc) =>
    doc.authorizedTenantIds.includes(tenantId)
  );
}

export function buildDocumentDownloadText(doc: TenantDocument): string {
  return [
    "CPMC Property Management Company",
    "Secure document center — tenant copy (demo)",
    "",
    `File: ${doc.fileName}`,
    `Category: ${doc.category}`,
    `Type: ${doc.fileType}`,
    `Date added: ${doc.dateAdded}`,
    `Size (bytes): ${doc.fileSizeBytes}`,
    "",
    doc.description,
    "",
    doc.previewSupported
      ? doc.previewText
      : "Preview is not supported for this file type in the portal demo. Download to keep a local copy.",
    "",
    "This file is authorized only for your tenant account.",
  ].join("\n");
}
