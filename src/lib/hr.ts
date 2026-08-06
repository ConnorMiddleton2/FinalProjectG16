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
  /** Managed property assignment for on-site / property-category staff. */
  propertyId: string;
  propertyName: string;
  moduleAccess: HrOpsModule[];
  /** scrypt hash (salt:hash); empty until a password is issued */
  passwordHash: string;
  temporaryPassword: string;
  mustResetPassword: boolean;
  payType: HrPayType;
  /** Annual salary (salary) or hourly rate (hourly), as a numeric string. */
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

/** Next Harborline employee code (HL-####) from existing roster. */
export function nextEmployeeId(employees: Pick<HrEmployee, "employeeId">[]): string {
  let max = 0;
  for (const e of employees) {
    const m = String(e.employeeId || "").match(/HL-(\d+)/i);
    if (m) max = Math.max(max, Number(m[1]) || 0);
  }
  return `HL-${String(max + 1).padStart(4, "0")}`;
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
    propertyId: typeof raw.propertyId === "string" ? raw.propertyId : "",
    propertyName: typeof raw.propertyName === "string" ? raw.propertyName : "",
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
    propertyId: "",
    propertyName: "",
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
    propertyId: "",
    propertyName: "Harborline Corporate",
    moduleAccess: resolveEmployeeModuleAccess(department, category),
    passwordHash: CADE_PASSWORD_HASH,
    temporaryPassword: CADE_DEMO.password,
    mustResetPassword: false,
    payType: "salary",
    payRate: "95000",
    payFrequency: "biweekly",
    payEffectiveDate: today,
    federalWithholding: "Married filing jointly â€” W-4 on file",
    stateWithholding: "CA â€” standard",
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

/** Full roster is seeded by scripts/seed-portfolio.mjs (corporate + per-property). */
export function seedEmployees(): HrEmployee[] {
  return [makeCadeEmployee()];
}

/** Pay stubs are written by the portfolio seed from each employee pay profile. */
export function seedPayStubs(): HrPayStub[] {
  return [];
}

/** Hash a plaintext password for storage on an employee record. */
export function hashEmployeePassword(password: string) {
  return hashPassword(password);
}
