import type { PayableCategory } from "@/lib/accounts-payable";
import { round2, todayIso } from "@/lib/money";

export type WorkOrderStatus = "pending" | "in_progress" | "completed";
export type WorkOrderSource = "tenant_submitted" | "management_submitted";
export type WorkOrderLabor = "in_house" | "third_party";
export type WorkOrderPriority = "low" | "normal" | "high" | "emergency";

export type WorkOrderCategory =
  | "hvac"
  | "plumbing"
  | "electrical"
  | "structural"
  | "janitorial"
  | "landscaping"
  | "security"
  | "appliance"
  | "general"
  | "other";

export type WorkOrder = {
  id: string;
  title: string;
  category: WorkOrderCategory;
  property: string;
  unit: string;
  description: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  source: WorkOrderSource;
  labor: WorkOrderLabor;
  vendorName: string;
  estimatedCost: string;
  actualCost: string;
  /** Last cost amount pushed into budget_lines from this WO (for delta sync). */
  budgetAppliedAmount?: string;
  /** Budget line last used for that sync. */
  budgetAppliedLineId?: string;
  requestedBy: string;
  createdAt: string;
  dueDate: string;
  completedAt: string;
};

export type VendorRecord = {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  notes: string;
};

export type BudgetLine = {
  id: string;
  /** Work-order or Management budget category key (or "all" for rollup). */
  category: WorkOrderCategory | "all" | string;
  label: string;
  budgetAmount: number;
  spentAmount: number;
  notes: string;
};

export type DocumentKind = "invoice" | "receipt";

export type DocumentApprovalStatus = "pending" | "approved" | "rejected";

/**
 * Maintenance invoice/receipt. Field shape is AP-compatible for a future merge,
 * but rows stay in maintenance_documents only (never auto-written to AP).
 */
export type MaintenanceDocument = {
  id: string;
  kind: DocumentKind;
  vendorName: string;
  property: string;
  /** Numeric amount (legacy string amounts coerced in normalizeMaintenanceDocument). */
  amount: number;
  /** Alias of invoice date for older UI; keep in sync with invoiceDate. */
  documentDate: string;
  invoiceDate: string;
  dueDate: string;
  invoiceNumber: string;
  vendorId: string;
  amountPaid: number;
  disputed: boolean;
  /** AP-aligned category for future toPayableInvoiceDraft mapping. */
  payableCategory: PayableCategory | "";
  workOrderId: string;
  category: WorkOrderCategory | "";
  fileName: string;
  /** Optional data-URL attachment (kept small for shared_records). */
  fileDataUrl?: string;
  notes: string;
  submittedAt: string;
  applyToBudget: boolean;
  budgetLineId: string;
  /** Management approval — missing on legacy rows; treat as approved via normalize. */
  approvalStatus?: DocumentApprovalStatus;
  submittedForApprovalAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
};

/** Form state uses string amount fields for inputs; parsed on save. */
export type MaintenanceDocumentForm = Omit<
  MaintenanceDocument,
  "id" | "submittedAt" | "amount" | "amountPaid"
> & {
  amount: string;
  amountPaid: string;
};

export function workOrderCategoryToPayableCategory(
  category: WorkOrderCategory | string | ""
): PayableCategory {
  const key = String(category || "")
    .toLowerCase()
    .replace(/\s+/g, "_");
  switch (key) {
    case "janitorial":
    case "housekeeping":
      return "janitorial";
    case "landscaping":
      return "lawncare";
    case "security":
      return "security";
    case "structural":
    case "painting_drywall":
    case "painting":
    case "doors_locks":
    case "doors":
      return "repairs";
    case "appliance":
    case "appliances":
      return "supplies";
    case "hvac":
    case "plumbing":
    case "electrical":
    case "general":
    case "general_repair":
    case "make_ready":
    case "emergency":
      return "maintenance";
    case "other":
    case "amenities":
    case "pest_control":
    case "":
    default:
      return "other";
  }
}

function coerceAmount(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return round2(raw);
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[$,\s]/g, "");
    const n = Number(cleaned);
    if (Number.isFinite(n)) return round2(n);
  }
  return 0;
}

/** Coerce legacy + new fields into a full MaintenanceDocument. */
export function normalizeMaintenanceDocument(
  raw: MaintenanceDocument | Record<string, unknown>
): MaintenanceDocument {
  const doc = raw as MaintenanceDocument & { amount?: unknown };
  const amount = coerceAmount(doc.amount);
  const amountPaid = coerceAmount(
    (doc as { amountPaid?: unknown }).amountPaid ?? 0
  );
  const documentDate =
    (doc.documentDate as string) ||
    (doc.invoiceDate as string) ||
    todayIso();
  const invoiceDate = (doc.invoiceDate as string) || documentDate;
  const category = (doc.category as WorkOrderCategory | "") || "";
  const payableCategory =
    (doc.payableCategory as PayableCategory | "") ||
    (category ? workOrderCategoryToPayableCategory(category) : "");

  const withFinance: MaintenanceDocument = {
    id: String(doc.id ?? ""),
    kind: doc.kind === "receipt" ? "receipt" : "invoice",
    vendorName: String(doc.vendorName ?? ""),
    property: String(doc.property ?? ""),
    amount,
    documentDate,
    invoiceDate,
    dueDate: String(doc.dueDate ?? ""),
    invoiceNumber: String(doc.invoiceNumber ?? ""),
    vendorId: String(doc.vendorId ?? ""),
    amountPaid,
    disputed: Boolean(doc.disputed),
    payableCategory,
    workOrderId: String(doc.workOrderId ?? ""),
    category,
    fileName: String(doc.fileName ?? ""),
    fileDataUrl: String(
      (doc as { fileDataUrl?: unknown }).fileDataUrl ?? ""
    ),
    notes: String(doc.notes ?? ""),
    submittedAt: String(doc.submittedAt ?? ""),
    applyToBudget: Boolean(doc.applyToBudget),
    budgetLineId: String(doc.budgetLineId ?? ""),
    approvalStatus: doc.approvalStatus,
    submittedForApprovalAt: doc.submittedForApprovalAt,
    approvedAt: doc.approvedAt,
    approvedBy: doc.approvedBy,
    rejectionReason: doc.rejectionReason,
  };

  return normalizeDocumentApproval(withFinance);
}

/** Legacy docs without approval fields count as already approved. */
export function normalizeDocumentApproval(
  doc: MaintenanceDocument
): MaintenanceDocument {
  const status = doc.approvalStatus ?? "approved";
  return {
    ...doc,
    approvalStatus: status,
    submittedForApprovalAt:
      doc.submittedForApprovalAt ?? doc.submittedAt ?? "",
    approvedAt:
      doc.approvedAt ??
      (status === "approved" ? doc.submittedAt || "" : ""),
    approvedBy:
      doc.approvedBy ?? (status === "approved" ? "legacy" : ""),
    rejectionReason: doc.rejectionReason ?? "",
  };
}

export function isDocumentApproved(doc: MaintenanceDocument): boolean {
  return normalizeMaintenanceDocument(doc).approvalStatus === "approved";
}

export function approvalStatusLabel(status: DocumentApprovalStatus): string {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending approval";
}

export function generateMaintenanceInvoiceNumber(id: string) {
  const short = id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `MNT-${short}`;
}

export const WORK_ORDER_STORAGE_KEY = "harborline_work_orders";
export const VENDOR_STORAGE_KEY = "harborline_vendors";
export const BUDGET_STORAGE_KEY = "harborline_maintenance_budget";
export const DOCUMENT_STORAGE_KEY = "harborline_maintenance_documents";

export const WORK_ORDER_CATEGORIES: {
  value: WorkOrderCategory;
  label: string;
}[] = [
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "structural", label: "Structural" },
  { value: "janitorial", label: "Janitorial" },
  { value: "landscaping", label: "Landscaping" },
  { value: "security", label: "Security" },
  { value: "appliance", label: "Appliance" },
  { value: "general", label: "General repair" },
  { value: "other", label: "Other" },
];

export const WORK_ORDER_STATUSES: { value: WorkOrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export const WORK_ORDER_PRIORITIES: {
  value: WorkOrderPriority;
  label: string;
}[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
];

export function categoryLabel(value: string) {
  return (
    WORK_ORDER_CATEGORIES.find((c) => c.value === value)?.label ??
    value.charAt(0).toUpperCase() + value.slice(1)
  );
}

export function statusLabel(value: WorkOrderStatus) {
  return WORK_ORDER_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function priorityLabel(value?: WorkOrderPriority | string) {
  const key = (value as WorkOrderPriority) || "normal";
  return (
    WORK_ORDER_PRIORITIES.find((p) => p.value === key)?.label ?? "Normal"
  );
}

export function normalizePriority(
  value?: WorkOrderPriority | string | null
): WorkOrderPriority {
  if (
    value === "low" ||
    value === "normal" ||
    value === "high" ||
    value === "emergency"
  ) {
    return value;
  }
  return "normal";
}

export function sourceLabel(value: WorkOrderSource) {
  return value === "tenant_submitted"
    ? "Tenant submitted"
    : "Management submitted";
}

export function laborLabel(value: WorkOrderLabor) {
  return value === "third_party" ? "3rd party required" : "In-house";
}

export function emptyWorkOrder(): Omit<WorkOrder, "id" | "createdAt"> {
  return {
    title: "",
    category: "general",
    property: "",
    unit: "",
    description: "",
    status: "pending",
    priority: "normal",
    source: "management_submitted",
    labor: "in_house",
    vendorName: "",
    estimatedCost: "",
    actualCost: "",
    requestedBy: "",
    dueDate: "",
    completedAt: "",
  };
}

export function seedWorkOrders(): WorkOrder[] {
  const today = new Date();
  const iso = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  return [
    {
      id: "wo-1",
      title: "Suite 210 HVAC not cooling",
      category: "hvac",
      property: "Riverbend Commerce Center",
      unit: "210",
      description: "Tenant reports warm air from vents since Monday.",
      status: "in_progress",
      priority: "high",
      source: "tenant_submitted",
      labor: "third_party",
      vendorName: "Oxford HVAC Pros",
      estimatedCost: "850",
      actualCost: "",
      requestedBy: "Tenant · Suite 210",
      createdAt: iso(-4),
      dueDate: iso(2),
      completedAt: "",
    },
    {
      id: "wo-2",
      title: "Lobby light ballast replacement",
      category: "electrical",
      property: "Pier 12 Commerce Center",
      unit: "Lobby",
      description: "Flickering lobby fixtures on east wall.",
      status: "pending",
      priority: "normal",
      source: "management_submitted",
      labor: "in_house",
      vendorName: "",
      estimatedCost: "120",
      actualCost: "",
      requestedBy: "Jordan Hale",
      createdAt: iso(-1),
      dueDate: iso(5),
      completedAt: "",
    },
    {
      id: "wo-3",
      title: "Restroom sink leak",
      category: "plumbing",
      property: "Canal Yard",
      unit: "Common",
      description: "Slow drip under vanity; mop bucket in place.",
      status: "completed",
      priority: "normal",
      source: "management_submitted",
      labor: "in_house",
      vendorName: "",
      estimatedCost: "95",
      actualCost: "110",
      requestedBy: "Front desk",
      createdAt: iso(-10),
      dueDate: iso(-7),
      completedAt: iso(-6),
    },
  ];
}

export function seedVendors(): VendorRecord[] {
  return [
    {
      id: "v-1",
      name: "Oxford HVAC Pros",
      specialty: "HVAC",
      phone: "(662) 555-0190",
      email: "dispatch@oxfordhvac.example",
      notes: "Preferred for commercial rooftop units.",
    },
    {
      id: "v-2",
      name: "Delta Roofing",
      specialty: "Structural / roofing",
      phone: "(662) 555-0177",
      email: "jobs@deltaroofing.example",
      notes: "Used for membrane patches and annual inspections.",
    },
  ];
}

export function seedBudget(): BudgetLine[] {
  const lines: BudgetLine[] = WORK_ORDER_CATEGORIES.map((cat) => ({
    id: `maint-budget-${cat.value}`,
    category: cat.value,
    label: cat.label,
    budgetAmount:
      cat.value === "hvac"
        ? 15000
        : cat.value === "plumbing"
          ? 9000
          : cat.value === "electrical"
            ? 8000
            : cat.value === "structural"
              ? 10000
              : cat.value === "janitorial"
                ? 6000
                : cat.value === "landscaping"
                  ? 5000
                  : cat.value === "security"
                    ? 4000
                    : cat.value === "appliance"
                      ? 6000
                      : cat.value === "general"
                        ? 12000
                        : 3000,
    spentAmount: 0,
    notes: "",
  }));
  const totalBudget = lines.reduce((s, l) => s + l.budgetAmount, 0);
  const totalSpent = lines.reduce((s, l) => s + l.spentAmount, 0);
  return [
    ...lines,
    {
      id: "b-total",
      category: "all",
      label: "Total maintenance budget",
      budgetAmount: totalBudget,
      spentAmount: totalSpent,
      notes: "Annual allocation from management",
    },
  ];
}

/** Align budget_lines to the shared work-order category list (merge legacy keys). */
export function reconcileBudgetLinesToWorkOrderCategories(
  existing: BudgetLine[],
  normalizeKey: (raw: string) => string
): BudgetLine[] | null {
  const nonTotal = existing.filter((b) => b.category !== "all");
  const byKey = new Map<string, BudgetLine>();
  for (const line of nonTotal) {
    const key = normalizeKey(String(line.category));
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...line, category: key });
      continue;
    }
    byKey.set(key, {
      ...prev,
      budgetAmount: Math.max(prev.budgetAmount, line.budgetAmount),
      spentAmount: round2(prev.spentAmount + line.spentAmount),
      notes: prev.notes || line.notes,
    });
  }

  const nextLines: BudgetLine[] = WORK_ORDER_CATEGORIES.map((cat) => {
    const prev = byKey.get(cat.value);
    if (prev) {
      return {
        ...prev,
        id: prev.id.startsWith("maint-budget-")
          ? prev.id
          : `maint-budget-${cat.value}`,
        category: cat.value,
        label: cat.label,
      };
    }
    return {
      id: `maint-budget-${cat.value}`,
      category: cat.value,
      label: cat.label,
      budgetAmount: 0,
      spentAmount: 0,
      notes: "",
    };
  });

  const totalBudget = nextLines.reduce((s, l) => s + l.budgetAmount, 0);
  const totalSpent = nextLines.reduce((s, l) => s + l.spentAmount, 0);
  const existingTotal = existing.find((b) => b.category === "all");
  const next: BudgetLine[] = [
    ...nextLines,
    {
      id: existingTotal?.id ?? "b-total",
      category: "all",
      label: existingTotal?.label ?? "Total maintenance budget",
      budgetAmount: totalBudget,
      spentAmount: totalSpent,
      notes: existingTotal?.notes ?? "",
    },
  ];

  const same =
    existing.length === next.length &&
    next.every((line, i) => {
      const cur = existing[i];
      return (
        cur &&
        cur.id === line.id &&
        cur.category === line.category &&
        cur.label === line.label &&
        cur.budgetAmount === line.budgetAmount &&
        cur.spentAmount === line.spentAmount
      );
    });
  return same ? null : next;
}

export function seedDocuments(): MaintenanceDocument[] {
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  return [
    {
      id: "doc-1",
      kind: "invoice",
      vendorName: "Oxford HVAC Pros",
      property: "Riverbend Commerce Center",
      amount: 850,
      documentDate: day,
      invoiceDate: day,
      dueDate: "",
      invoiceNumber: "MNT-DOC00001",
      vendorId: "",
      amountPaid: 0,
      disputed: false,
      payableCategory: "maintenance",
      workOrderId: "wo-1",
      category: "hvac",
      fileName: "oxford-hvac-invoice-4412.pdf",
      notes: "Service call + refrigerant top-off",
      submittedAt: now,
      applyToBudget: false,
      budgetLineId: "",
      approvalStatus: "approved",
      submittedForApprovalAt: now,
      approvedAt: now,
      approvedBy: "system-auto",
      rejectionReason: "",
    },
  ];
}

export function emptyDocument(): MaintenanceDocumentForm {
  const day = todayIso();
  return {
    kind: "invoice",
    vendorName: "",
    property: "",
    amount: "",
    amountPaid: "",
    documentDate: day,
    invoiceDate: day,
    dueDate: "",
    invoiceNumber: "",
    vendorId: "",
    disputed: false,
    payableCategory: "",
    workOrderId: "",
    category: "",
    fileName: "",
    fileDataUrl: "",
    notes: "",
    applyToBudget: true,
    budgetLineId: "",
    approvalStatus: "pending",
    submittedForApprovalAt: "",
    approvedAt: "",
    approvedBy: "",
    rejectionReason: "",
  };
}

export function documentToForm(doc: MaintenanceDocument): MaintenanceDocumentForm {
  const n = normalizeMaintenanceDocument(doc);
  return {
    kind: n.kind,
    vendorName: n.vendorName,
    property: n.property,
    amount: n.amount ? String(n.amount) : "",
    amountPaid: n.amountPaid ? String(n.amountPaid) : "",
    documentDate: n.documentDate,
    invoiceDate: n.invoiceDate,
    dueDate: n.dueDate,
    invoiceNumber: n.invoiceNumber,
    vendorId: n.vendorId,
    disputed: n.disputed,
    payableCategory: n.payableCategory,
    workOrderId: n.workOrderId,
    category: n.category,
    fileName: n.fileName,
    fileDataUrl: n.fileDataUrl ?? "",
    notes: n.notes,
    applyToBudget: n.applyToBudget,
    budgetLineId: n.budgetLineId,
    approvalStatus: n.approvalStatus,
    submittedForApprovalAt: n.submittedForApprovalAt,
    approvedAt: n.approvedAt,
    approvedBy: n.approvedBy,
    rejectionReason: n.rejectionReason,
  };
}
