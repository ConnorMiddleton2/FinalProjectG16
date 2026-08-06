import { hashPassword } from "@/lib/owner-password";

export type HrDepartment =
  | "maintenance"
  | "leasing"
  | "accounting"
  | "hr"
  | "management"
  | "other";

export type HrEmployeeStatus = "active" | "on_leave" | "terminated";

export type HrPayType = "hourly" | "salary";

export type HrPayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

export type HrPayStubStatus = "draft" | "processed" | "paid";

export type HrPayStub = {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  grossPay: string;
  deductions: string;
  netPay: string;
  hoursWorked: string;
  status: HrPayStubStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

/** Corporate vs property classification; basis for future access and pay rules. */
export type HrEmployeeCategory = "corporate" | "property";

/** Ops modules an employee may be authorized to open. */
export type HrOpsModule =
  | "properties"
  | "maintenance"
  | "tenant"
  | "ap"
  | "ar"
  | "hr"
  | "sales-marketing"
  | "management";

export type HrEmployee = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: HrDepartment;
  category: HrEmployeeCategory;
  jobTitle: string;
  status: HrEmployeeStatus;
  moduleAccess: HrOpsModule[];
  /** scrypt hash (salt:hash); empty until a password is issued */
  passwordHash: string;
  temporaryPassword: string;
  mustResetPassword: boolean;
  payType: HrPayType;
  payRate: string;
  payFrequency: HrPayFrequency;
  payEffectiveDate: string;
  federalWithholding: string;
  stateWithholding: string;
  deductionsNotes: string;
  directDepositBank: string;
  directDepositAccountLast4: string;
  directDepositRoutingLast4: string;
  payrollNotes: string;
  contractTitle: string;
  contractStart: string;
  contractEnd: string;
  contractFileName: string;
  contractNotes: string;
  hiredAt: string;
  terminatedAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export const HR_DEPARTMENTS: { value: HrDepartment; label: string }[] = [
  { value: "maintenance", label: "Maintenance" },
  { value: "leasing", label: "Leasing" },
  { value: "accounting", label: "Accounting" },
  { value: "hr", label: "Human resources" },
  { value: "management", label: "Management" },
  { value: "other", label: "Other" },
];

export const HR_STATUSES: { value: HrEmployeeStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On leave" },
  { value: "terminated", label: "Terminated" },
];

export const HR_PAY_TYPES: { value: HrPayType; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "salary", label: "Salary" },
];

export const HR_PAY_FREQUENCIES: { value: HrPayFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "semimonthly", label: "Semi-monthly" },
  { value: "monthly", label: "Monthly" },
];

export const HR_PAY_STUB_STATUSES: { value: HrPayStubStatus; label: string }[] =
  [
    { value: "draft", label: "Draft" },
    { value: "processed", label: "Processed" },
    { value: "paid", label: "Paid" },
  ];

export const HR_EMPLOYEE_CATEGORIES: {
  value: HrEmployeeCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "corporate",
    label: "Corporate",
    description:
      "Central office staff; future rules may grant broader ops and payroll treatment.",
  },
  {
    value: "property",
    label: "Property",
    description:
      "On-site property staff; future rules may scope access and pay by property.",
  },
];

export const HR_OPS_MODULES: { value: HrOpsModule; label: string }[] = [
  { value: "properties", label: "Properties" },
  { value: "maintenance", label: "Maintenance" },
  { value: "tenant", label: "Tenant" },
  { value: "ap", label: "Accounts payable" },
  { value: "ar", label: "Accounts receivable" },
  { value: "hr", label: "Human resources" },
  { value: "sales-marketing", label: "Sales & marketing" },
  { value: "management", label: "Management" },
];

export const ALL_HR_OPS_MODULES: HrOpsModule[] = HR_OPS_MODULES.map(
  (m) => m.value
);

export const DEPARTMENT_DEFAULT_MODULE_ACCESS: Record<
  HrDepartment,
  readonly HrOpsModule[]
> = {
  maintenance: ["maintenance", "properties"],
  leasing: ["tenant", "sales-marketing", "properties"],
  accounting: ["ap", "ar"],
  hr: ["hr"],
  management: [...ALL_HR_OPS_MODULES],
  other: [],
};

export const CATEGORY_MODULE_ADDITIONS: Record<
  HrEmployeeCategory,
  readonly HrOpsModule[]
> = {
  corporate: [],
  property: [],
};

export const CATEGORY_MODULE_RESTRICTIONS: Record<
  HrEmployeeCategory,
  readonly HrOpsModule[]
> = {
  corporate: [],
  property: ["management", "hr"],
};

export function resolveEmployeeModuleAccess(
  department: HrDepartment,
  category: HrEmployeeCategory
): HrOpsModule[] {
  const modules = new Set(DEPARTMENT_DEFAULT_MODULE_ACCESS[department]);
  for (const mod of CATEGORY_MODULE_ADDITIONS[category]) modules.add(mod);
  for (const mod of CATEGORY_MODULE_RESTRICTIONS[category]) modules.delete(mod);
  return [...modules];
}

export function isTypeDefaultModule(
  department: HrDepartment,
  category: HrEmployeeCategory,
  module: HrOpsModule
): boolean {
  return resolveEmployeeModuleAccess(department, category).includes(module);
}

function moduleAccessEqual(a: HrOpsModule[], b: HrOpsModule[]) {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((m) => setB.has(m));
}

export function syncEmployeeModuleAccess(
  employee: Pick<HrEmployee, "department" | "category" | "moduleAccess">
): HrOpsModule[] {
  return resolveEmployeeModuleAccess(employee.department, employee.category);
}

export function employeeNeedsModuleAccessSync(
  employee: Pick<HrEmployee, "department" | "category" | "moduleAccess">
): boolean {
  return !moduleAccessEqual(
    employee.moduleAccess,
    resolveEmployeeModuleAccess(employee.department, employee.category)
  );
}

export function getEmployeeLoginModules(
  employee: Pick<HrEmployee, "department" | "category" | "moduleAccess">
): HrOpsModule[] {
  const restricted = CATEGORY_MODULE_RESTRICTIONS[employee.category];
  const source =
    employee.moduleAccess.length > 0
      ? employee.moduleAccess
      : resolveEmployeeModuleAccess(employee.department, employee.category);
  return source.filter((mod) => !restricted.includes(mod));
}

/** Stable seed id for Cade Coburn (always upserted if missing). */
export const CADE_EMPLOYEE_ID = "hr-emp-cade";

export const CADE_DEMO = {
  email: "cade.coburn@icloud.com",
  password: "Baxter10!",
  name: "Cade Coburn",
} as const;

/** Precomputed scrypt hash for Baxter10! (salt:hash). */
const CADE_PASSWORD_HASH =
  "05632acb8cbd15978116f4ceec5c1c0f:874dc8efba3cdd90df052129ea47d7de588c357921a6fb4c03e1b66b2b3c728407a2d9f116364221813293afcc053ebf4e8949a94bfc859254455a636b84a314";

export function departmentLabel(value: HrDepartment) {
  return HR_DEPARTMENTS.find((d) => d.value === value)?.label ?? value;
}

export function statusLabel(value: HrEmployeeStatus) {
  return HR_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function payStubStatusLabel(value: HrPayStubStatus) {
  return HR_PAY_STUB_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function categoryLabel(value: HrEmployeeCategory) {
  return HR_EMPLOYEE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

const HR_EMPLOYEE_CATEGORY_VALUES = new Set<HrEmployeeCategory>(
  HR_EMPLOYEE_CATEGORIES.map((c) => c.value)
);

export function normalizeEmployeeCategory(
  value: unknown
): HrEmployeeCategory {
  if (
    typeof value === "string" &&
    HR_EMPLOYEE_CATEGORY_VALUES.has(value as HrEmployeeCategory)
  ) {
    return value as HrEmployeeCategory;
  }
  return "property";
}

/** Seed category by stable employee record id (for one-time backfill). */
export const SEED_EMPLOYEE_CATEGORIES: Record<string, HrEmployeeCategory> = {
  [CADE_EMPLOYEE_ID]: "corporate",
  "hr-emp-1": "property",
  "hr-emp-2": "property",
  "hr-emp-3": "property",
  "hr-emp-4": "corporate",
  "hr-emp-5": "corporate",
};

export function employeeDisplayName(e: Pick<HrEmployee, "firstName" | "lastName" | "employeeId">) {
  return `${e.firstName} ${e.lastName}`.trim() || e.employeeId || "Unnamed";
}

export function normalizeHrEmployee(
  raw: Partial<HrEmployee> & { id: string }
): HrEmployee {
  const base = emptyEmployee();
  return {
    ...base,
    ...raw,
    id: raw.id,
    category: normalizeEmployeeCategory(raw.category),
    moduleAccess: Array.isArray(raw.moduleAccess) ? raw.moduleAccess : [],
    passwordHash: typeof raw.passwordHash === "string" ? raw.passwordHash : "",
    temporaryPassword:
      typeof raw.temporaryPassword === "string" ? raw.temporaryPassword : "",
    mustResetPassword: Boolean(raw.mustResetPassword),
    createdAt: raw.createdAt ?? base.hiredAt,
    updatedAt: raw.updatedAt ?? base.hiredAt,
  };
}

export function emptyPayrollProfile() {
  return {
    federalWithholding: "",
    stateWithholding: "",
    deductionsNotes: "",
    directDepositBank: "",
    directDepositAccountLast4: "",
    directDepositRoutingLast4: "",
    payrollNotes: "",
  };
}

export function emptyEmployee(): Omit<HrEmployee, "id" | "createdAt" | "updatedAt"> {
  const today = new Date().toISOString().slice(0, 10);
  return {
    employeeId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "other",
    category: "property",
    jobTitle: "",
    status: "active",
    moduleAccess: [],
    passwordHash: "",
    temporaryPassword: "",
    mustResetPassword: true,
    payType: "hourly",
    payRate: "",
    payFrequency: "biweekly",
    payEffectiveDate: today,
    ...emptyPayrollProfile(),
    contractTitle: "",
    contractStart: today,
    contractEnd: "",
    contractFileName: "",
    contractNotes: "",
    hiredAt: today,
    terminatedAt: "",
    notes: "",
  };
}

export function makeCadeEmployee(now = new Date().toISOString()): HrEmployee {
  const today = now.slice(0, 10);
  const department: HrDepartment = "management";
  const category: HrEmployeeCategory = "corporate";
  return {
    id: CADE_EMPLOYEE_ID,
    employeeId: "HL-0001",
    firstName: "Cade",
    lastName: "Coburn",
    email: CADE_DEMO.email,
    phone: "",
    department,
    category,
    jobTitle: "Team member",
    status: "active",
    moduleAccess: resolveEmployeeModuleAccess(department, category),
    passwordHash: CADE_PASSWORD_HASH,
    temporaryPassword: CADE_DEMO.password,
    mustResetPassword: false,
    payType: "salary",
    payRate: "",
    payFrequency: "biweekly",
    payEffectiveDate: today,
    federalWithholding: "Married filing jointly — W-4 on file",
    stateWithholding: "CA — standard",
    deductionsNotes: "Health insurance, 401(k) 4%",
    directDepositBank: "Harborline Credit Union",
    directDepositAccountLast4: "4821",
    directDepositRoutingLast4: "1220",
    payrollNotes: "",
    contractTitle: "",
    contractStart: today,
    contractEnd: "",
    contractFileName: "",
    contractNotes: "",
    hiredAt: today,
    terminatedAt: "",
    notes: "Seeded team login account.",
    createdAt: now,
    updatedAt: now,
  };
}

export function seedEmployees(): HrEmployee[] {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  const mayaDept: HrDepartment = "maintenance";
  const mayaCat: HrEmployeeCategory = "property";
  const jordanDept: HrDepartment = "maintenance";
  const jordanCat: HrEmployeeCategory = "property";
  const priyaDept: HrDepartment = "leasing";
  const priyaCat: HrEmployeeCategory = "property";
  const samDept: HrDepartment = "management";
  const samCat: HrEmployeeCategory = "corporate";
  const alexDept: HrDepartment = "accounting";
  const alexCat: HrEmployeeCategory = "corporate";

  return [
    makeCadeEmployee(now),
    {
      id: "hr-emp-1",
      employeeId: "HL-0042",
      firstName: "Maya",
      lastName: "Chen",
      email: "maya.chen@harborline.demo",
      phone: "(555) 201-4402",
      department: mayaDept,
      category: mayaCat,
      jobTitle: "Maintenance director",
      status: "active",
      moduleAccess: resolveEmployeeModuleAccess(mayaDept, mayaCat),
      passwordHash: "",
      temporaryPassword: "temp-maya-42",
      mustResetPassword: true,
      payType: "salary",
      payRate: "72000",
      payFrequency: "biweekly",
      payEffectiveDate: "2024-01-01",
      federalWithholding: "Single — W-4 2024",
      stateWithholding: "CA — additional 2%",
      deductionsNotes: "Health, dental, parking",
      directDepositBank: "First National",
      directDepositAccountLast4: "9012",
      directDepositRoutingLast4: "1210",
      payrollNotes: "Property maintenance director — salaried exempt.",
      contractTitle: "Employment agreement — Maintenance director",
      contractStart: "2024-01-01",
      contractEnd: "",
      contractFileName: "maya-chen-contract.pdf",
      contractNotes: "Full-time; overtime exempt.",
      hiredAt: "2024-01-01",
      terminatedAt: "",
      notes: "Approves work-order closeouts.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "hr-emp-2",
      employeeId: "HL-0058",
      firstName: "Jordan",
      lastName: "Blake",
      email: "jordan.blake@harborline.demo",
      phone: "(555) 201-4418",
      department: jordanDept,
      category: jordanCat,
      jobTitle: "Maintenance technician",
      status: "active",
      moduleAccess: resolveEmployeeModuleAccess(jordanDept, jordanCat),
      passwordHash: "",
      temporaryPassword: "temp-jordan-58",
      mustResetPassword: true,
      payType: "hourly",
      payRate: "28.50",
      payFrequency: "weekly",
      payEffectiveDate: "2025-03-15",
      federalWithholding: "Single — standard",
      stateWithholding: "CA — standard",
      deductionsNotes: "",
      directDepositBank: "Community Bank",
      directDepositAccountLast4: "3344",
      directDepositRoutingLast4: "1221",
      payrollNotes: "Weekly hourly — timesheet required.",
      contractTitle: "Hourly employment agreement — Technician",
      contractStart: "2025-03-15",
      contractEnd: "",
      contractFileName: "",
      contractNotes: "",
      hiredAt: "2025-03-15",
      terminatedAt: "",
      notes: "In-house labor on work orders.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "hr-emp-3",
      employeeId: "HL-0031",
      firstName: "Priya",
      lastName: "Nair",
      email: "priya.nair@harborline.demo",
      phone: "(555) 201-4431",
      department: priyaDept,
      category: priyaCat,
      jobTitle: "Leasing specialist",
      status: "active",
      moduleAccess: resolveEmployeeModuleAccess(priyaDept, priyaCat),
      passwordHash: "",
      temporaryPassword: "temp-priya-31",
      mustResetPassword: false,
      payType: "salary",
      payRate: "54000",
      payFrequency: "semimonthly",
      payEffectiveDate: "2023-06-01",
      ...emptyPayrollProfile(),
      contractTitle: "Employment agreement — Leasing",
      contractStart: "2023-06-01",
      contractEnd: "",
      contractFileName: "priya-nair-contract.pdf",
      contractNotes: "",
      hiredAt: "2023-06-01",
      terminatedAt: "",
      notes: "",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "hr-emp-4",
      employeeId: "HL-0012",
      firstName: "Sam",
      lastName: "Ortiz",
      email: "sam.ortiz@harborline.demo",
      phone: "(555) 201-4400",
      department: samDept,
      category: samCat,
      jobTitle: "Operations manager",
      status: "active",
      moduleAccess: resolveEmployeeModuleAccess(samDept, samCat),
      passwordHash: "",
      temporaryPassword: "temp-sam-12",
      mustResetPassword: false,
      payType: "salary",
      payRate: "95000",
      payFrequency: "biweekly",
      payEffectiveDate: "2022-09-01",
      federalWithholding: "Married filing jointly",
      stateWithholding: "CA — standard",
      deductionsNotes: "Executive benefits package",
      directDepositBank: "Harborline Credit Union",
      directDepositAccountLast4: "1100",
      directDepositRoutingLast4: "1220",
      payrollNotes: "",
      contractTitle: "Employment agreement — Operations manager",
      contractStart: "2022-09-01",
      contractEnd: "",
      contractFileName: "sam-ortiz-contract.pdf",
      contractNotes: "Executive access to all ops windows.",
      hiredAt: "2022-09-01",
      terminatedAt: "",
      notes: "",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "hr-emp-5",
      employeeId: "HL-0027",
      firstName: "Alex",
      lastName: "Nguyen",
      email: "alex.nguyen@harborline.demo",
      phone: "(555) 201-4427",
      department: alexDept,
      category: alexCat,
      jobTitle: "AP clerk",
      status: "on_leave",
      moduleAccess: resolveEmployeeModuleAccess(alexDept, alexCat),
      passwordHash: "",
      temporaryPassword: "",
      mustResetPassword: false,
      payType: "hourly",
      payRate: "24.00",
      payFrequency: "biweekly",
      payEffectiveDate: "2024-08-01",
      federalWithholding: "Single — W-4 on file",
      stateWithholding: "CA — standard",
      deductionsNotes: "On parental leave — partial pay",
      directDepositBank: "First National",
      directDepositAccountLast4: "5567",
      directDepositRoutingLast4: "1210",
      payrollNotes: "Leave through end of month.",
      contractTitle: "Hourly employment agreement — AP clerk",
      contractStart: "2024-08-01",
      contractEnd: "",
      contractFileName: "",
      contractNotes: "Parental leave through end of month.",
      hiredAt: "2024-08-01",
      terminatedAt: "",
      notes: `Leave started ${today}.`,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function nextEmployeeId(existing: HrEmployee[]) {
  const nums = existing
    .map((e) => {
      const m = /^HL-(\d+)$/i.exec(e.employeeId.trim());
      return m ? Number(m[1]) : 0;
    })
    .filter((n) => n > 0);
  const max = nums.length ? Math.max(...nums) : 100;
  return `HL-${String(max + 1).padStart(4, "0")}`;
}

/** Hash a plaintext password for storage on an employee record. */
export function hashEmployeePassword(password: string) {
  return hashPassword(password);
}

export function seedPayStubs(): HrPayStub[] {
  const now = new Date().toISOString();
  return [
    {
      id: "hr-stub-1",
      employeeId: "hr-emp-1",
      periodStart: "2025-07-01",
      periodEnd: "2025-07-15",
      payDate: "2025-07-18",
      grossPay: "2769.23",
      deductions: "692.31",
      netPay: "2076.92",
      hoursWorked: "",
      status: "paid",
      notes: "Biweekly salary — maintenance director",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "hr-stub-2",
      employeeId: "hr-emp-2",
      periodStart: "2025-07-07",
      periodEnd: "2025-07-13",
      payDate: "2025-07-14",
      grossPay: "1140.00",
      deductions: "228.00",
      netPay: "912.00",
      hoursWorked: "40",
      status: "paid",
      notes: "Weekly hourly — 40 hours",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "hr-stub-3",
      employeeId: "hr-emp-2",
      periodStart: "2025-07-14",
      periodEnd: "2025-07-20",
      payDate: "2025-07-21",
      grossPay: "1197.00",
      deductions: "239.40",
      netPay: "957.60",
      hoursWorked: "42",
      status: "processed",
      notes: "Includes 2 hours OT",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "hr-stub-4",
      employeeId: "hr-emp-5",
      periodStart: "2025-06-16",
      periodEnd: "2025-06-30",
      payDate: "2025-07-03",
      grossPay: "1920.00",
      deductions: "384.00",
      netPay: "1536.00",
      hoursWorked: "80",
      status: "paid",
      notes: "Pre-leave biweekly period",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "hr-stub-5",
      employeeId: "hr-emp-5",
      periodStart: "2025-07-01",
      periodEnd: "2025-07-15",
      payDate: "2025-07-18",
      grossPay: "960.00",
      deductions: "192.00",
      netPay: "768.00",
      hoursWorked: "40",
      status: "draft",
      notes: "Partial leave period",
      createdAt: now,
      updatedAt: now,
    },
  ];
}
