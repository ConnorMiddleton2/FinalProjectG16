export type WorkOrderStatus = "pending" | "in_progress" | "completed";
export type WorkOrderSource = "tenant_submitted" | "management_submitted";
export type WorkOrderLabor = "in_house" | "third_party";

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
  source: WorkOrderSource;
  labor: WorkOrderLabor;
  vendorName: string;
  estimatedCost: string;
  actualCost: string;
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

export const WORK_ORDER_STORAGE_KEY = "harborline_work_orders";
export const VENDOR_STORAGE_KEY = "harborline_vendors";
export const BUDGET_STORAGE_KEY = "harborline_maintenance_budget";

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

export function categoryLabel(value: string) {
  return (
    WORK_ORDER_CATEGORIES.find((c) => c.value === value)?.label ??
    value.charAt(0).toUpperCase() + value.slice(1)
  );
}

export function statusLabel(value: WorkOrderStatus) {
  return WORK_ORDER_STATUSES.find((s) => s.value === value)?.label ?? value;
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
