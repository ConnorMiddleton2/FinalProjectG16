import type { OwnerApplication } from "@/lib/owner-auth";
import type { SmReceipt } from "@/lib/sales-marketing";
import {
  normalizeSmCode,
  SM_CATEGORY_TO_CODE,
} from "@/lib/sales-marketing";
import {
  normalizeDocumentApproval,
  normalizeMaintenanceDocument,
  type MaintenanceDocument,
} from "@/lib/maintenance";

export type OwnerContract = {
  id: string;
  ownerName: string;
  ownerEmail: string;
  propertyName: string;
  documentTitle: string;
  body: string;
  status:
    | "pending_owner_signature"
    | "signed_by_owner"
    | "fully_executed";
  createdAt: string;
  sentAt?: string;
  emailedTo?: string;
  ownerSignedAt?: string;
  ownerSignatureName?: string;
  harborlineSignedAt?: string;
  harborlineSignedBy?: string;
  relatedApplicationId?: string;
};

export type CapExVendorInvoice = {
  id: string;
  fileName: string;
  vendorName: string;
  amount: number;
  /** Optional data URL so the owner can preview the invoice in-portal. */
  dataUrl?: string;
  uploadedAt: string;
};

export type CapExPaymentMethod =
  | "pay_harborline_direct"
  | "credit_owner_account"
  | "owner_pays_vendor"
  | "financing_discussion";

export type CapitalExpenditure = {
  id: string;
  title: string;
  propertyId?: string;
  propertyName: string;
  ownerEmail: string;
  ownerName: string;
  ownerAccountId?: string;
  category: "renovation" | "addition" | "major_repair" | "equipment" | "other";
  estimatedCost: number;
  description: string;
  justification: string;
  source: "maintenance" | "management";
  relatedWorkOrderId?: string;
  /** Third-party vendor invoices attached for owner review. */
  vendorInvoices?: CapExVendorInvoice[];
  status:
    | "draft"
    | "pending_mgmt_edit"
    | "pending_owner_approval"
    | "approved_by_owner"
    | "declined_by_owner"
    | "cancelled"
    | "complete";
  createdAt: string;
  submittedToOwnerAt?: string;
  emailedTo?: string;
  emailedAt?: string;
  ownerRequestMessage?: string;
  ownerRespondedAt?: string;
  ownerResponseNotes?: string;
  /** How the owner chooses to fund an approved CapEx. */
  paymentMethod?: CapExPaymentMethod;
};

export const CAPEX_PAYMENT_METHODS: {
  value: CapExPaymentMethod;
  label: string;
  blurb: string;
}[] = [
  {
    value: "pay_harborline_direct",
    label: "Pay Harborline directly",
    blurb: "Owner remits funds to Harborline; we pay the vendor.",
  },
  {
    value: "credit_owner_account",
    label: "Credit my owner account",
    blurb: "Deduct / credit against reserves or amounts held by Harborline.",
  },
  {
    value: "owner_pays_vendor",
    label: "I will pay the vendor",
    blurb: "Owner pays the contractor directly after reviewing invoices.",
  },
  {
    value: "financing_discussion",
    label: "Discuss financing",
    blurb: "Need Harborline to propose financing or phased payment options.",
  },
];

export function capexPaymentLabel(method?: CapExPaymentMethod) {
  return (
    CAPEX_PAYMENT_METHODS.find((m) => m.value === method)?.label ?? "—"
  );
}

export type DepartmentExpense = {
  id: string;
  department:
    | "sales_marketing"
    | "maintenance"
    | "accounts_payable"
    | "human_resources"
    | "operations"
    | "other";
  code: string;
  vendor: string;
  amount: number;
  description: string;
  fileName: string;
  status: "pending" | "approved" | "declined";
  submittedAt: string;
  approvedAt?: string;
};

export type DepartmentKey = DepartmentExpense["department"];

/** Departments you can open when setting Management budgets. */
export type MgmtBudgetDepartment =
  | "maintenance"
  | "sales_marketing"
  | "executive";

/** 12 monthly amounts Jan=0 … Dec=11. Yearly = sum. */
export type MonthlyAmounts = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export type DepartmentBudget = {
  id: string;
  propertyId: string;
  propertyName: string;
  fiscalYear: number;
  /** Built-in dept id or custom dept id from PropertyBudgetPack. */
  department: string;
  categoryKey: string;
  label: string;
  /** Monthly budget; yearly is the sum of months. */
  months: MonthlyAmounts;
  /** Legacy single annual field (migrated into months when present). */
  budgeted?: number;
  notes: string;
  updatedAt: string;
};

export type BudgetCategoryDef = {
  key: string;
  label: string;
  defaultBudgeted: number;
};

export type CustomBudgetDepartment = {
  id: string;
  title: string;
  blurb: string;
  categories: BudgetCategoryDef[];
};

/** Which departments/categories are active for a property + fiscal year. */
export type PropertyBudgetPack = {
  id: string;
  propertyId: string;
  propertyName: string;
  fiscalYear: number;
  enabledBuiltIns: MgmtBudgetDepartment[];
  customDepartments: CustomBudgetDepartment[];
  createdAt: string;
  updatedAt: string;
};

/** Per-property fiscal year plan (legacy estimate — revenue now comes from AR). */
export type PropertyBudgetPlan = {
  id: string;
  propertyId: string;
  propertyName: string;
  fiscalYear: number;
  /** @deprecated Prefer AR paid revenue. Kept for older rows. */
  priorYearRevenueEstimate: number;
  createdAt: string;
  updatedAt: string;
};

export type ApPayableStatus =
  | "queued"
  | "in_progress"
  | "paid"
  | "on_hold";

/** Invoice/receipt forwarded to Accounts Payable after Management approval. */
export type ApPayable = {
  id: string;
  sourceExpenseId: string;
  source: "department" | "sales_marketing" | "maintenance";
  department: DepartmentKey | "sales_marketing";
  departmentLabel: string;
  code: string;
  vendor: string;
  amount: number;
  description: string;
  fileName: string;
  status: ApPayableStatus;
  receivedAt: string;
  approvedByManagementAt: string;
  notes: string;
  paidAt?: string;
};

export type MissedPayment = {
  id: string;
  tenantName: string;
  property: string;
  unit: string;
  amountDue: number;
  daysPastDue: number;
  lateCount12mo: number;
  risk: "watch" | "elevated" | "foreclosure_risk";
  lastPaymentAt: string;
  notes: string;
  foreclosureChecklist?: string[];
};

export function money(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function departmentLabel(d: DepartmentKey | "sales_marketing" | MgmtBudgetDepartment) {
  switch (d) {
    case "sales_marketing":
      return "Sales & Marketing";
    case "maintenance":
      return "Maintenance";
    case "accounts_payable":
      return "Accounts Payable";
    case "human_resources":
      return "Human Resources";
    case "operations":
      return "Operations";
    case "executive":
      return "Executive";
    default:
      return "Other";
  }
}

export const MGMT_BUDGET_DEPARTMENTS: {
  id: MgmtBudgetDepartment;
  title: string;
  blurb: string;
}[] = [
  {
    id: "maintenance",
    title: "Maintenance",
    blurb: "Trades, make-ready, amenities, and related property upkeep.",
  },
  {
    id: "sales_marketing",
    title: "Sales & Marketing",
    blurb: "Campaign spend, events, and leasing outreach.",
  },
  {
    id: "executive",
    title: "Executive",
    blurb: "Company-level executive operating budget.",
  },
];

export const MGMT_BUDGET_CATEGORIES: Record<
  MgmtBudgetDepartment,
  Array<{ key: string; label: string; defaultBudgeted: number }>
> = {
  maintenance: [
    { key: "general", label: "General", defaultBudgeted: 8000 },
    { key: "emergency", label: "Emergency", defaultBudgeted: 10000 },
    { key: "make_ready", label: "Make-ready", defaultBudgeted: 12000 },
    { key: "hvac", label: "HVAC", defaultBudgeted: 15000 },
    { key: "plumbing", label: "Plumbing", defaultBudgeted: 9000 },
    { key: "electrical", label: "Electrical", defaultBudgeted: 8000 },
    { key: "appliances", label: "Appliances", defaultBudgeted: 6000 },
    { key: "painting_drywall", label: "Painting & Drywall", defaultBudgeted: 7000 },
    { key: "doors_locks", label: "Doors & Locks", defaultBudgeted: 4000 },
    { key: "landscaping", label: "Landscaping", defaultBudgeted: 5000 },
    { key: "housekeeping", label: "Housekeeping", defaultBudgeted: 6000 },
    { key: "amenities", label: "Amenities", defaultBudgeted: 4500 },
    { key: "pest_control", label: "Pest Control", defaultBudgeted: 3500 },
    { key: "other", label: "Other", defaultBudgeted: 3000 },
  ],
  sales_marketing: [
    { key: "supplies", label: "Supplies", defaultBudgeted: 4000 },
    { key: "events", label: "Events", defaultBudgeted: 10000 },
    { key: "decoration", label: "Decoration", defaultBudgeted: 5000 },
    {
      key: "meals_entertainment",
      label: "Meals & entertainment",
      defaultBudgeted: 6000,
    },
    {
      key: "online_advertising",
      label: "Online Advertising",
      defaultBudgeted: 15000,
    },
  ],
  executive: [
    { key: "general", label: "General", defaultBudgeted: 20000 },
    { key: "travel", label: "Travel", defaultBudgeted: 8000 },
    {
      key: "professional_services",
      label: "Professional services",
      defaultBudgeted: 12000,
    },
    { key: "other", label: "Other", defaultBudgeted: 5000 },
  ],
};

export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type BudgetPeriodView = "year" | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export function emptyMonths(): MonthlyAmounts {
  return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

/** Spread an annual total evenly across 12 months (remainder on Dec). */
export function monthsFromAnnual(annual: number): MonthlyAmounts {
  const total = Math.max(0, Math.round(annual));
  const base = Math.floor(total / 12);
  const months = emptyMonths();
  for (let i = 0; i < 12; i++) months[i] = base;
  months[11] += total - base * 12;
  return months;
}

export function yearlyFromMonths(months: MonthlyAmounts | number[] | undefined): number {
  if (!months || months.length < 12) return 0;
  return months.reduce((s, n) => s + (Number(n) || 0), 0);
}

export function ensureMonths(line: DepartmentBudget): MonthlyAmounts {
  if (line.months && line.months.length === 12) {
    return line.months.map((n) => Number(n) || 0) as MonthlyAmounts;
  }
  if (typeof line.budgeted === "number" && line.budgeted > 0) {
    return monthsFromAnnual(line.budgeted);
  }
  return emptyMonths();
}

export function budgetLineId(
  propertyId: string,
  fiscalYear: number,
  department: string,
  categoryKey: string
) {
  return `mgmt-budget-${propertyId}-${fiscalYear}-${department}-${categoryKey}`;
}

export function budgetPlanId(propertyId: string, fiscalYear: number) {
  return `budget-plan-${propertyId}-${fiscalYear}`;
}

export function budgetPackId(propertyId: string, fiscalYear: number) {
  return `budget-pack-${propertyId}-${fiscalYear}`;
}

export function estimatePriorYearRevenue(property: {
  monthlyRentRoll?: string;
  annualGpr?: string;
  annualNoi?: string;
}): number {
  const rentRoll = Number(property.monthlyRentRoll) || 0;
  if (rentRoll > 0) return Math.round(rentRoll * 12);
  const gpr = Number(property.annualGpr) || 0;
  if (gpr > 0) return Math.round(gpr);
  return 0;
}

export function seedDepartmentBudgets(): DepartmentBudget[] {
  return [];
}

export function seedPropertyBudgetPlans(): PropertyBudgetPlan[] {
  return [];
}

export function seedPropertyBudgetPacks(): PropertyBudgetPack[] {
  return [];
}

export function defaultPropertyBudgetPack(input: {
  propertyId: string;
  propertyName: string;
  fiscalYear: number;
}): PropertyBudgetPack {
  const now = new Date().toISOString();
  return {
    id: budgetPackId(input.propertyId, input.fiscalYear),
    propertyId: input.propertyId,
    propertyName: input.propertyName,
    fiscalYear: input.fiscalYear,
    enabledBuiltIns: ["maintenance", "sales_marketing", "executive"],
    customDepartments: [],
    createdAt: now,
    updatedAt: now,
  };
}

export type ActiveBudgetDepartment = {
  id: string;
  title: string;
  blurb: string;
  categories: BudgetCategoryDef[];
  kind: "builtin" | "custom";
};

export function activeDepartmentsFromPack(
  pack: PropertyBudgetPack | null | undefined
): ActiveBudgetDepartment[] {
  const enabled = pack?.enabledBuiltIns ?? [
    "maintenance",
    "sales_marketing",
    "executive",
  ];
  const builtIns: ActiveBudgetDepartment[] = MGMT_BUDGET_DEPARTMENTS.filter(
    (d) => enabled.includes(d.id)
  ).map((d) => ({
    id: d.id,
    title: d.title,
    blurb: d.blurb,
    categories: MGMT_BUDGET_CATEGORIES[d.id],
    kind: "builtin" as const,
  }));
  const customs: ActiveBudgetDepartment[] = (pack?.customDepartments ?? []).map(
    (c) => ({
      id: c.id,
      title: c.title,
      blurb: c.blurb || "Custom department budget",
      categories: c.categories,
      kind: "custom" as const,
    })
  );
  return [...builtIns, ...customs];
}

/** Opex budget total for a property (or all properties) in a fiscal year. */
export function budgetTotalForYear(
  items: DepartmentBudget[],
  fiscalYear: number,
  propertyId?: string | null
): number {
  return items
    .filter(
      (r) =>
        r.fiscalYear === fiscalYear &&
        (!propertyId || r.propertyId === propertyId)
    )
    .reduce((s, r) => s + yearlyFromMonths(ensureMonths(r)), 0);
}

/**
 * Revenue figure for calendar/fiscal year Y.
 * Stored as priorYearRevenueEstimate on the plan for year Y+1
 * (i.e. “prior year revenue for Y+1 planning”).
 */
export function revenueForYear(
  plans: PropertyBudgetPlan[],
  fiscalYear: number,
  propertyId: string,
  fallbackEstimate = 0
): number {
  const fromNextPlan = plans.find(
    (p) => p.propertyId === propertyId && p.fiscalYear === fiscalYear + 1
  );
  if (fromNextPlan && fromNextPlan.priorYearRevenueEstimate > 0) {
    return fromNextPlan.priorYearRevenueEstimate;
  }
  const fromSamePlan = plans.find(
    (p) => p.propertyId === propertyId && p.fiscalYear === fiscalYear
  );
  if (fromSamePlan && fromSamePlan.priorYearRevenueEstimate > 0) {
    return fromSamePlan.priorYearRevenueEstimate;
  }
  return fallbackEstimate;
}

export function companyRevenueForYear(
  plans: PropertyBudgetPlan[],
  properties: { id: string; priorEstimate: number }[],
  fiscalYear: number
): number {
  return properties.reduce(
    (s, p) =>
      s + revenueForYear(plans, fiscalYear, p.id, p.priorEstimate),
    0
  );
}

export type YearCompareRow = {
  year: number;
  label: string;
  revenue: number;
  budget: number;
  net: number;
};

export function buildYearCompareRows(input: {
  thisYear: number;
  revenueFor: (year: number) => number;
  budgetFor: (year: number) => number;
}): YearCompareRow[] {
  const years = [input.thisYear - 1, input.thisYear, input.thisYear + 1];
  return years.map((year) => {
    const revenue = input.revenueFor(year);
    const budget = input.budgetFor(year);
    const tag =
      year === input.thisYear - 1
        ? "Prior"
        : year === input.thisYear
          ? "Current"
          : "Next";
    return {
      year,
      label: `${year} · ${tag}`,
      revenue,
      budget,
      net: revenue - budget,
    };
  });
}

export type CategorySpend = { approved: number; pending: number };

/** Map maintenance / work-order category strings onto budget category keys. */
export function normalizeMaintCategoryKey(raw: string): string {
  const k = raw.toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    appliance: "appliances",
    appliances: "appliances",
    janitorial: "housekeeping",
    housekeeping: "housekeeping",
    structural: "other",
    security: "other",
    painting: "painting_drywall",
    painting_drywall: "painting_drywall",
    doors: "doors_locks",
    doors_locks: "doors_locks",
    make_ready: "make_ready",
    makeready: "make_ready",
    pest: "pest_control",
    pest_control: "pest_control",
    emergency: "emergency",
    amenities: "amenities",
    landscaping: "landscaping",
    hvac: "hvac",
    plumbing: "plumbing",
    electrical: "electrical",
    general: "general",
    other: "other",
  };
  return map[k] ?? k;
}

/** Live approved/pending spend for one Management budget category. */
export function spendForBudgetCategory(input: {
  department: string;
  categoryKey: string;
  fiscalYear: number;
  /** 0–11 to restrict to one month; omit for full year. */
  month?: number;
  propertyName?: string | null;
  smReceipts: Array<{
    code: string;
    amount: number;
    status: string;
    submittedAt: string;
  }>;
  deptExpenses: Array<{
    department: string;
    code: string;
    amount: number;
    status: string;
    submittedAt: string;
    description?: string;
  }>;
  /** Maintenance module budget_lines (spent to date). */
  maintBudgetLines?: Array<{
    category: string;
    spentAmount: number;
  }>;
  /** Approved maintenance invoices/receipts. */
  maintDocs?: Array<{
    amount: string;
    category: string;
    property: string;
    documentDate: string;
    approvalStatus?: string;
  }>;
}): CategorySpend {
  let approved = 0;
  let pending = 0;
  const year = input.fiscalYear;
  const key = input.categoryKey;
  const month = input.month;

  function inPeriod(isoOrDate: string) {
    const d = new Date(isoOrDate);
    if (!Number.isFinite(d.getTime())) return false;
    if (d.getFullYear() !== year) return false;
    if (month !== undefined && d.getMonth() !== month) return false;
    return true;
  }

  if (input.department === "sales_marketing") {
    const code = SM_CATEGORY_TO_CODE[key];
    if (code) {
      for (const r of input.smReceipts) {
        if (normalizeSmCode(r.code) !== code) continue;
        if (!inPeriod(r.submittedAt)) continue;
        if (r.status === "approved") approved += r.amount;
        else if (r.status === "pending") pending += r.amount;
      }
    }
    return { approved, pending };
  }

  if (input.department === "maintenance") {
    for (const line of input.maintBudgetLines ?? []) {
      if (line.category === "all") continue;
      if (normalizeMaintCategoryKey(line.category) !== key) continue;
      const thisYear = new Date().getFullYear();
      if (year !== thisYear) continue;
      // Seeded YTD lines — only count on full-year (or current month) view
      if (month !== undefined && month !== new Date().getMonth()) continue;
      const amt = Number(line.spentAmount) || 0;
      if (month !== undefined) approved += Math.round(amt / 12);
      else approved += amt;
    }
    for (const doc of input.maintDocs ?? []) {
      if (normalizeMaintCategoryKey(doc.category || "general") !== key) continue;
      if (!inPeriod(doc.documentDate)) continue;
      const status = doc.approvalStatus ?? "approved";
      if (input.propertyName) {
        const prop = (doc.property || "").toLowerCase();
        const want = input.propertyName.toLowerCase();
        if (prop && want && !prop.includes(want) && !want.includes(prop)) {
          continue;
        }
      }
      const amt = Number(String(doc.amount).replace(/[^0-9.-]/g, "")) || 0;
      if (status === "approved") approved += amt;
      else if (status === "pending") pending += amt;
    }
    for (const e of input.deptExpenses) {
      if (e.department !== "maintenance") continue;
      if (!inPeriod(e.submittedAt)) continue;
      const desc = (e.description || "").toLowerCase();
      const codeL = e.code.toLowerCase();
      const keyWords = key.replace(/_/g, " ");
      const matches =
        desc.includes(keyWords) ||
        codeL.includes(key) ||
        (key === "general" &&
          !MGMT_BUDGET_CATEGORIES.maintenance.some(
            (c) =>
              c.key !== "general" &&
              (desc.includes(c.key.replace(/_/g, " ")) ||
                codeL.includes(c.key))
          ));
      if (!matches) continue;
      if (e.status === "approved") approved += e.amount;
      else if (e.status === "pending") pending += e.amount;
    }
    return { approved, pending };
  }

  if (input.department !== "executive") {
    return { approved: 0, pending: 0 };
  }

  for (const e of input.deptExpenses) {
    if (!inPeriod(e.submittedAt)) continue;
    const blob = `${e.code} ${e.description || ""} ${e.department}`.toLowerCase();
    const isExec =
      e.department === "operations" ||
      e.department === "other" ||
      e.department === "human_resources" ||
      blob.includes("exec") ||
      blob.includes("travel") ||
      blob.includes("professional");
    if (!isExec) continue;
    const matchesKey =
      key === "other" ||
      blob.includes(key.replace(/_/g, " ")) ||
      (key === "general" &&
        !blob.includes("travel") &&
        !blob.includes("professional")) ||
      (key === "travel" && blob.includes("travel")) ||
      (key === "professional_services" && blob.includes("professional"));
    if (!matchesKey) continue;
    if (e.status === "approved") approved += e.amount;
    else if (e.status === "pending") pending += e.amount;
  }
  return { approved, pending };
}


/** Build category lines for a property + year + department (merge existing). */
export function normalizeDepartmentBudgetLines(
  department: string,
  categories: BudgetCategoryDef[],
  existing: DepartmentBudget[],
  ctx: { propertyId: string; propertyName: string; fiscalYear: number }
): DepartmentBudget[] {
  const now = new Date().toISOString();
  const scoped = existing.filter(
    (r) =>
      r.department === department &&
      r.propertyId === ctx.propertyId &&
      r.fiscalYear === ctx.fiscalYear
  );
  const byKey = new Map(scoped.map((r) => [r.categoryKey, r]));

  return categories.map((cat) => {
    const prior = byKey.get(cat.key);
    if (prior) {
      return {
        ...prior,
        label: cat.label,
        propertyName: ctx.propertyName,
        months: ensureMonths(prior),
      };
    }
    return {
      id: budgetLineId(
        ctx.propertyId,
        ctx.fiscalYear,
        department,
        cat.key
      ),
      propertyId: ctx.propertyId,
      propertyName: ctx.propertyName,
      fiscalYear: ctx.fiscalYear,
      department,
      categoryKey: cat.key,
      label: cat.label,
      months: monthsFromAnnual(cat.defaultBudgeted),
      notes: "",
      updatedAt: now,
    };
  });
}

/** Create category lines for enabled departments on a pack. */
export function createPropertyYearBudgetLines(input: {
  propertyId: string;
  propertyName: string;
  fiscalYear: number;
  pack: PropertyBudgetPack;
  /** Optional prior-year lines to copy monthly shape from. */
  copyFrom?: DepartmentBudget[];
}): DepartmentBudget[] {
  const now = new Date().toISOString();
  const rows: DepartmentBudget[] = [];
  const depts = activeDepartmentsFromPack(input.pack);
  for (const dept of depts) {
    for (const cat of dept.categories) {
      const prior = input.copyFrom?.find(
        (r) =>
          r.department === dept.id &&
          r.categoryKey === cat.key &&
          r.propertyId === input.propertyId
      );
      rows.push({
        id: budgetLineId(
          input.propertyId,
          input.fiscalYear,
          dept.id,
          cat.key
        ),
        propertyId: input.propertyId,
        propertyName: input.propertyName,
        fiscalYear: input.fiscalYear,
        department: dept.id,
        categoryKey: cat.key,
        label: cat.label,
        months: prior
          ? ensureMonths(prior)
          : monthsFromAnnual(cat.defaultBudgeted),
        notes: prior?.notes ?? "",
        updatedAt: now,
      });
    }
  }
  return rows;
}

export function seedApPayables(): ApPayable[] {
  return [];
}

export function seedOwnerContracts(): OwnerContract[] {
  return [];
}

export function seedCapitalExpenditures(): CapitalExpenditure[] {
  return [
    {
      id: "capex-1",
      title: "Replace main chiller plant",
      propertyName: "Pierpoint Tower",
      ownerEmail: "bobowner@building.com",
      ownerName: "Bob Owner",
      category: "major_repair",
      estimatedCost: 185000,
      description:
        "End-of-life centrifugal chiller requires replacement before summer cooling season.",
      justification:
        "Maintenance flagged repeated failures and rising repair cost; CapEx is more economical than another rebuild.",
      source: "maintenance",
      relatedWorkOrderId: "wo-1",
      status: "pending_mgmt_edit",
      createdAt: new Date().toISOString(),
    },
  ];
}

export function seedDepartmentExpenses(): DepartmentExpense[] {
  return [
    {
      id: "dept-exp-1",
      department: "maintenance",
      code: "MNT-014",
      vendor: "Delta HVAC Co.",
      amount: 1840,
      description: "Rooftop unit repair — Pierpoint",
      fileName: "delta-invoice-4412.pdf",
      status: "pending",
      submittedAt: new Date().toISOString(),
    },
    {
      id: "dept-exp-2",
      department: "human_resources",
      code: "HR-003",
      vendor: "Northshore Recruiting",
      amount: 2500,
      description: "Leasing coordinator search fee",
      fileName: "recruiting-invoice.pdf",
      status: "pending",
      submittedAt: new Date().toISOString(),
    },
    {
      id: "dept-exp-3",
      department: "accounts_payable",
      code: "AP-220",
      vendor: "City of Harbor Utilities",
      amount: 960,
      description: "Common area water — March",
      fileName: "utility-mar.pdf",
      status: "pending",
      submittedAt: new Date().toISOString(),
    },
  ];
}

export function seedMissedPayments(): MissedPayment[] {
  return [
    {
      id: "miss-1",
      tenantName: "Cedar Dental Group",
      property: "Harborline Commons",
      unit: "Suite 210",
      amountDue: 4850,
      daysPastDue: 42,
      lateCount12mo: 3,
      risk: "elevated",
      lastPaymentAt: "2026-01-12",
      notes: "Partial payments twice; CAM dispute ongoing.",
      foreclosureChecklist: [
        "Send formal demand letter (certified mail)",
        "Confirm cure period under lease",
        "Notify Owner and legal counsel",
        "Document all outreach attempts",
        "If uncured: prepare notice of default / possession filing",
        "Coordinate with local counsel / law enforcement for lockout only after judgment",
      ],
    },
    {
      id: "miss-2",
      tenantName: "Lumen Creative Co.",
      property: "Harborline Commons",
      unit: "Suite 305",
      amountDue: 7320,
      daysPastDue: 67,
      lateCount12mo: 5,
      risk: "foreclosure_risk",
      lastPaymentAt: "2025-11-02",
      notes: "Repeated NSF; personal guarantee on file.",
      foreclosureChecklist: [
        "Escalate to counsel immediately",
        "Pull personal guarantee / security deposit ledger",
        "Issue notice of default and opportunity to cure",
        "Prepare unlawful detainer / eviction packet",
        "Owner approval required before filing",
        "After judgment: coordinate sheriff / constable lockout",
        "Inventory premises and mitigate reletting costs",
      ],
    },
    {
      id: "miss-3",
      tenantName: "Oak & Iron Fitness",
      property: "Riverside Pavilion",
      unit: "Gym Wing",
      amountDue: 950,
      daysPastDue: 12,
      lateCount12mo: 1,
      risk: "watch",
      lastPaymentAt: "2026-03-01",
      notes: "Usually pays within grace; first late this year.",
      foreclosureChecklist: [
        "Courtesy call / text reminder",
        "Apply late fee per lease",
        "Watch for second late occurrence",
      ],
    },
  ];
}

export const SILLY_OWNER_APP_ID = "demo-silly-owner-app";

export function sillyOwnerApplication(): OwnerApplication {
  return {
    id: SILLY_OWNER_APP_ID,
    fullName: "Baron Von Squarefootage",
    email: "baron@lofty-castles.biz",
    phone: "(662) 555-0199",
    companyName: "Lofty Castles Holdings",
    properties: [
      {
        category: "mixed-use",
        location: "88 Quayside Blvd, Harbor City",
        squareFeet: "48,000",
      },
    ],
    message:
      "My building has a turret and I refuse to manage the parking myself. Please take it.",
    status: "pending",
    createdAt: new Date().toISOString(),
    mgmtStatus: "new",
  };
}

/** Formal management agreement draft from full application diligence. */
export function draftManagementAgreement(app: OwnerApplication): string {
  const fee = app.proposedFeePercent?.trim() || "4.0";
  const term = app.proposedTermYears?.trim() || "3";
  const exclusive = app.exclusiveManagement !== false;
  const props = app.properties
    .map(
      (p, i) =>
        `   ${i + 1}. ${p.location}${p.squareFeet ? ` (${p.squareFeet} SF)` : ""}${p.category ? ` — ${p.category}` : ""}`
    )
    .join("\n");
  const effective = new Date().toLocaleDateString();

  return `EXCLUSIVE PROPERTY MANAGEMENT AGREEMENT

Effective Date: ${effective}

This Property Management Agreement (the "Agreement") is entered into as of the Effective Date by and between:

OWNER: ${app.fullName}${app.companyName ? `, on behalf of ${app.companyName}` : ""} ("Owner")
Address for notices: ${app.email}${app.phone ? ` | ${app.phone}` : ""}

and

MANAGER: Harborline Property Management ("Manager")

RECITALS

A. Owner owns or controls the real property assets described in Schedule A (the "Premises").
B. Owner desires to engage Manager to manage, lease, and operate the Premises.
C. Manager is willing to provide such services on the terms set forth herein.
D. The parties have conducted diligence, including ${app.inspected ? `an inspection${app.inspectionDate ? ` on ${app.inspectionDate}` : ""}` : "preliminary review"}, ${app.meetingsCount ?? 0} owner meeting(s), and market analysis.

NOW, THEREFORE, in consideration of the mutual covenants herein, the parties agree as follows:

ARTICLE 1 — PREMISES
1.1 The Premises subject to this Agreement are:
${props || "   [To be attached as Schedule A]"}

1.2 Additional asset information:
${app.assetDetails?.trim() || app.inspectionNotes?.trim() || "[See diligence file]"}

ARTICLE 2 — APPOINTMENT
2.1 Owner hereby appoints Manager as its ${exclusive ? "exclusive" : "non-exclusive"} agent to manage the Premises.
2.2 Manager accepts the appointment and shall perform services in a professional manner consistent with industry standards for commercial property management.

ARTICLE 3 — TERM
3.1 The initial term shall be ${term} year(s) commencing on the Effective Date.
3.2 Thereafter the Agreement renews for successive one-year periods unless either party provides written notice of non-renewal at least ninety (90) days before the then-current term ends.

ARTICLE 4 — MANAGEMENT FEE & PAYMENT TERMS
4.1 Manager's fee shall equal ${fee} percent (${fee}%) of Gross Collections (rents and recoverable charges actually received).
4.2 Payment terms: ${app.paymentTerms?.trim() || "Fees payable monthly in arrears within fifteen (15) days after month-end, deducted from operating accounts or invoiced to Owner."}
4.3 Negotiated commercial terms incorporated herein:
${app.negotiationTerms?.trim() || "None beyond standard form."}
4.4 Owner-stated preferences from meetings:
${app.ownerDesiredTerms?.trim() || "None recorded."}

ARTICLE 5 — AUTHORITY OF MANAGER
5.1 Manager may market vacancies, negotiate leases within Owner guidelines, collect rents, pay ordinary operating expenses, and engage vendors within approved budgets.
5.2 Capital expenditures and extraordinary repairs require Owner approval except for emergency expenditures necessary to protect life or property, which Manager shall report promptly.

ARTICLE 6 — OWNER OBLIGATIONS
6.1 Owner shall maintain property insurance naming Manager as additional insured as reasonably required, fund approved reserves, and timely respond to approval requests.
6.2 Owner represents it has authority to enter this Agreement.

ARTICLE 7 — DILIGENCE RECORD
7.1 Inspection completed: ${app.inspected ? "Yes" : "No"}${app.inspectionDate ? ` (${app.inspectionDate})` : ""}.
7.2 Inspection documents on file: ${(app.inspectionDocuments ?? []).join(", ") || "None uploaded"}.
7.3 Market research summary:
${app.marketResearch?.trim() || "[Attached or to follow]"}
7.4 Meeting minutes on file: ${(app.meetingMinutesFiles ?? []).join(", ") || "None uploaded"}.
7.5 Meeting notes:
${app.meetingMinutesNotes?.trim() || "[None]"}

ARTICLE 8 — ACCOUNTING & REPORTING
8.1 Manager shall deliver monthly operating statements, rent roll, and material variance commentary within fifteen (15) business days after each month-end.

ARTICLE 9 — TERMINATION
9.1 Either party may terminate for material breach not cured within thirty (30) days after written notice.
9.2 Upon termination, Manager shall return keys, books, and Owner funds within thirty (30) days, less amounts properly owed to Manager.

ARTICLE 10 — MISCELLANEOUS
10.1 Governing Law. This Agreement shall be governed by the laws of the State of Mississippi, without regard to conflicts principles.
10.2 Entire Agreement. This Agreement, including Schedules, constitutes the entire agreement and supersedes prior negotiations.
10.3 Amendments. Amendments must be in a writing signed by both parties.
10.4 Counterparts. Electronic signatures are valid.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.

OWNER:                                     MANAGER:
_______________________________            _______________________________
${app.fullName}                            Harborline Property Management
Date: _____________                        Date: _____________

SCHEDULE A — PREMISES
${props || "[Attach legal descriptions / addresses]"}

— End of Agreement —`;
}

export function meetingRequestMessage(app: OwnerApplication) {
  return `Hi ${app.fullName},

Thank you for applying to have Harborline manage your property. We'd like to schedule a meeting (and, if helpful, an on-site inspection) to walk the asset, review goals, and discuss fee structure and term.

Please reply with a few times that work over the next two weeks, or confirm a call.

— Harborline Management`;
}

export type UnifiedExpense = {
  id: string;
  source: "department" | "sales_marketing" | "maintenance";
  departmentLabel: string;
  code: string;
  vendor: string;
  amount: number;
  description: string;
  fileName: string;
  status: "pending" | "approved" | "declined";
  submittedAt: string;
  raw: DepartmentExpense | SmReceipt | MaintenanceDocument;
};

export function maintenanceDocToUnified(doc: MaintenanceDocument): UnifiedExpense {
  const n = normalizeMaintenanceDocument(doc);
  const approval = normalizeDocumentApproval(n);
  const status =
    approval.approvalStatus === "approved"
      ? "approved"
      : approval.approvalStatus === "rejected"
        ? "declined"
        : "pending";
  const description = [
    n.notes,
    n.workOrderId ? `Work order: ${n.workOrderId}` : "",
    n.property ? `Property: ${n.property}` : "",
    n.kind === "invoice" ? "Invoice" : "Receipt",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: `maint:${n.id}`,
    source: "maintenance",
    departmentLabel: "Maintenance",
    code: n.invoiceNumber.trim() || n.id,
    vendor: n.vendorName,
    amount: typeof n.amount === "number" ? n.amount : Number(n.amount) || 0,
    description,
    fileName: n.fileName,
    status,
    submittedAt:
      approval.submittedForApprovalAt || n.submittedAt || new Date().toISOString(),
    raw: n,
  };
}

export function smReceiptToUnified(r: SmReceipt): UnifiedExpense {
  return {
    id: `sm:${r.id}`,
    source: "sales_marketing",
    departmentLabel: "Sales & Marketing",
    code: r.code,
    vendor: r.vendor,
    amount: r.amount,
    description: r.description,
    fileName: r.fileName,
    status: r.status,
    submittedAt: r.submittedAt,
    raw: r,
  };
}

export function deptExpenseToUnified(e: DepartmentExpense): UnifiedExpense {
  return {
    id: `dept:${e.id}`,
    source: "department",
    departmentLabel: departmentLabel(e.department),
    code: e.code,
    vendor: e.vendor,
    amount: e.amount,
    description: e.description,
    fileName: e.fileName,
    status: e.status,
    submittedAt: e.submittedAt,
    raw: e,
  };
}

export function unifiedExpenseToApPayable(row: UnifiedExpense): ApPayable {
  const now = new Date().toISOString();
  const department: ApPayable["department"] =
    row.source === "sales_marketing"
      ? "sales_marketing"
      : row.source === "maintenance"
        ? "maintenance"
        : (row.raw as DepartmentExpense).department;

  return {
    id: crypto.randomUUID(),
    sourceExpenseId: row.id,
    source: row.source,
    department,
    departmentLabel: row.departmentLabel,
    code: row.code,
    vendor: row.vendor,
    amount: row.amount,
    description: row.description,
    fileName: row.fileName,
    status: "queued",
    receivedAt: now,
    approvedByManagementAt: now,
    notes: "",
  };
}
