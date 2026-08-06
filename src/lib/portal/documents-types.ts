export const DOCUMENT_CATEGORIES = [
  "Lease Documents",
  "Payment Receipts",
  "Property Policies",
  "Move-In Documents",
  "Inspection Reports",
  "Notices",
  "Insurance Documents",
  "Renewal Documents",
  "Move-Out Documents",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export type DocumentFileType =
  | "PDF"
  | "JPG"
  | "PNG"
  | "WEBP"
  | "TXT"
  | "DOCX";

export type DocumentSortKey = "dateAdded" | "fileName" | "category" | "fileSize";
export type SortDirection = "asc" | "desc";

/**
 * Tenant-authorized document metadata for the portal document center.
 * Preview content is a safe tenant-facing summary only (no private management notes).
 */
export type TenantDocument = {
  id: string;
  fileName: string;
  category: DocumentCategory;
  /** ISO date YYYY-MM-DD */
  dateAdded: string;
  fileType: DocumentFileType;
  /** Size in bytes */
  fileSizeBytes: number;
  /** Tenants authorized to view this document. Never expose to other tenants. */
  authorizedTenantIds: string[];
  previewSupported: boolean;
  /** Short tenant-facing preview body when preview is supported */
  previewText: string;
  description: string;
};

export type DocumentFilters = {
  search: string;
  category: "all" | DocumentCategory;
  sortKey: DocumentSortKey;
  sortDirection: SortDirection;
};

export type DocumentsLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "unauthorized";
      message: string;
    }
  | {
      status: "empty";
      message: string;
      /** Whether the empty result is after filters (vs no authorized docs at all). */
      filtered: boolean;
    }
  | {
      status: "success";
      documents: TenantDocument[];
      source: "live" | "mock";
      tenantId: string;
      viewerLabel: string;
    };

/** Demo tenant used when previewing authorized sample documents. */
export const DEMO_TENANT_ID = "demo-tenant-alex";

/** Another tenant — documents for this id must never appear for the demo tenant. */
export const OTHER_TENANT_ID = "demo-tenant-other";
