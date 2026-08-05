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
  category: WorkOrderCategory | "all";
  label: string;
  budgetAmount: number;
  spentAmount: number;
  notes: string;
};

export type DocumentKind = "invoice" | "receipt";

export type DocumentApprovalStatus = "pending" | "approved" | "rejected";

export type MaintenanceDocument = {
  id: string;
  kind: DocumentKind;
  vendorName: string;
  property: string;
  amount: string;
  documentDate: string;
  workOrderId: string;
  category: WorkOrderCategory | "";
  fileName: string;
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
  return normalizeDocumentApproval(doc).approvalStatus === "approved";
}

export function approvalStatusLabel(status: DocumentApprovalStatus): string {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending approval";
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
  return [
    {
      id: "b-1",
      category: "hvac",
      label: "HVAC repairs & service",
      budgetAmount: 24000,
      spentAmount: 6850,
      notes: "Includes contract service calls",
    },
    {
      id: "b-2",
      category: "plumbing",
      label: "Plumbing",
      budgetAmount: 12000,
      spentAmount: 2140,
      notes: "",
    },
    {
      id: "b-3",
      category: "electrical",
      label: "Electrical",
      budgetAmount: 9000,
      spentAmount: 1325,
      notes: "",
    },
    {
      id: "b-4",
      category: "general",
      label: "General repairs",
      budgetAmount: 15000,
      spentAmount: 4780,
      notes: "Catch-all for small ticket work",
    },
    {
      id: "b-5",
      category: "all",
      label: "Total maintenance budget",
      budgetAmount: 75000,
      spentAmount: 18240,
      notes: "Annual allocation from management",
    },
  ];
}

export function seedDocuments(): MaintenanceDocument[] {
  const now = new Date().toISOString();
  return [
    {
      id: "doc-1",
      kind: "invoice",
      vendorName: "Oxford HVAC Pros",
      property: "Riverbend Commerce Center",
      amount: "850",
      documentDate: new Date().toISOString().slice(0, 10),
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

export function emptyDocument(): Omit<
  MaintenanceDocument,
  "id" | "submittedAt"
> {
  return {
    kind: "invoice",
    vendorName: "",
    property: "",
    amount: "",
    documentDate: new Date().toISOString().slice(0, 10),
    workOrderId: "",
    category: "",
    fileName: "",
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
