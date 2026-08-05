import type { OwnerApplication } from "@/lib/owner-auth";
import type { SmReceipt } from "@/lib/sales-marketing";

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

export type CapitalExpenditure = {
  id: string;
  title: string;
  propertyName: string;
  ownerEmail: string;
  ownerName: string;
  category: "renovation" | "addition" | "major_repair" | "equipment" | "other";
  estimatedCost: number;
  description: string;
  justification: string;
  source: "maintenance" | "management";
  relatedWorkOrderId?: string;
  status:
    | "draft"
    | "pending_mgmt_edit"
    | "pending_owner_approval"
    | "approved_by_owner"
    | "declined_by_owner"
    | "complete";
  createdAt: string;
  ownerRequestMessage?: string;
  ownerRespondedAt?: string;
  ownerResponseNotes?: string;
};

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

export type DepartmentBudget = {
  id: string;
  department: MgmtBudgetDepartment;
  categoryKey: string;
  label: string;
  budgeted: number;
  notes: string;
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
  source: "department" | "sales_marketing";
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

export function seedDepartmentBudgets(): DepartmentBudget[] {
  const now = new Date().toISOString();
  const rows: DepartmentBudget[] = [];
  for (const dept of Object.keys(MGMT_BUDGET_CATEGORIES) as MgmtBudgetDepartment[]) {
    for (const cat of MGMT_BUDGET_CATEGORIES[dept]) {
      rows.push({
        id: `mgmt-budget-${dept}-${cat.key}`,
        department: dept,
        categoryKey: cat.key,
        label: cat.label,
        budgeted: cat.defaultBudgeted,
        notes: "",
        updatedAt: now,
      });
    }
  }
  return rows;
}

/** Merge saved rows with the canonical category list for a department. */
export function normalizeDepartmentBudgetLines(
  department: MgmtBudgetDepartment,
  existing: DepartmentBudget[]
): DepartmentBudget[] {
  const now = new Date().toISOString();
  const byKey = new Map(
    existing
      .filter((r) => r.department === department)
      .map((r) => [r.categoryKey, r])
  );
  return MGMT_BUDGET_CATEGORIES[department].map((cat) => {
    const prior = byKey.get(cat.key);
    if (prior) {
      return { ...prior, label: cat.label };
    }
    return {
      id: `mgmt-budget-${department}-${cat.key}`,
      department,
      categoryKey: cat.key,
      label: cat.label,
      budgeted: cat.defaultBudgeted,
      notes: "",
      updatedAt: now,
    };
  });
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
  source: "department" | "sales_marketing";
  departmentLabel: string;
  code: string;
  vendor: string;
  amount: number;
  description: string;
  fileName: string;
  status: "pending" | "approved" | "declined";
  submittedAt: string;
  raw: DepartmentExpense | SmReceipt;
};

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
