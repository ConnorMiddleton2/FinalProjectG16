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
    moduleAccess: Array.isArray(raw.moduleAccess) ? raw.moduleAccess : [],
    passwordHash: typeof raw.passwordHash === "string" ? raw.passwordHash : "",
    temporaryPassword:
      typeof raw.temporaryPassword === "string" ? raw.temporaryPassword : "",
    mustResetPassword: Boolean(raw.mustResetPassword),
    createdAt: raw.createdAt ?? base.hiredAt,
    updatedAt: raw.updatedAt ?? base.hiredAt,
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
  return {
    id: CADE_EMPLOYEE_ID,
    employeeId: "HL-0001",
    firstName: "Cade",
    lastName: "Coburn",
    email: CADE_DEMO.email,
    phone: "",
    department: "management",
    jobTitle: "Team member",
    status: "active",
    moduleAccess: [...ALL_HR_OPS_MODULES],
    passwordHash: CADE_PASSWORD_HASH,
    temporaryPassword: CADE_DEMO.password,
    mustResetPassword: false,
    payType: "salary",
    payRate: "",
    payFrequency: "biweekly",
    payEffectiveDate: today,
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
  return [
    makeCadeEmployee(now),
    {
      id: "hr-emp-1",
      employeeId: "HL-0042",
      firstName: "Maya",
      lastName: "Chen",
      email: "maya.chen@harborline.demo",
      phone: "(555) 201-4402",
      department: "maintenance",
      jobTitle: "Maintenance director",
      status: "active",
      moduleAccess: ["maintenance", "properties", "ap"],
      passwordHash: "",
      temporaryPassword: "temp-maya-42",
      mustResetPassword: true,
      payType: "salary",
      payRate: "72000",
      payFrequency: "biweekly",
      payEffectiveDate: "2024-01-01",
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
      department: "maintenance",
      jobTitle: "Maintenance technician",
      status: "active",
      moduleAccess: ["maintenance"],
      passwordHash: "",
      temporaryPassword: "temp-jordan-58",
      mustResetPassword: true,
      payType: "hourly",
      payRate: "28.50",
      payFrequency: "weekly",
      payEffectiveDate: "2025-03-15",
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
      department: "leasing",
      jobTitle: "Leasing specialist",
      status: "active",
      moduleAccess: ["tenant", "sales-marketing", "properties"],
      passwordHash: "",
      temporaryPassword: "temp-priya-31",
      mustResetPassword: false,
      payType: "salary",
      payRate: "54000",
      payFrequency: "semimonthly",
      payEffectiveDate: "2023-06-01",
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
      department: "management",
      jobTitle: "Operations manager",
      status: "active",
      moduleAccess: [...ALL_HR_OPS_MODULES],
      passwordHash: "",
      temporaryPassword: "temp-sam-12",
      mustResetPassword: false,
      payType: "salary",
      payRate: "95000",
      payFrequency: "biweekly",
      payEffectiveDate: "2022-09-01",
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
      department: "accounting",
      jobTitle: "AP clerk",
      status: "on_leave",
      moduleAccess: ["ap", "ar"],
      passwordHash: "",
      temporaryPassword: "",
      mustResetPassword: false,
      payType: "hourly",
      payRate: "24.00",
      payFrequency: "biweekly",
      payEffectiveDate: "2024-08-01",
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
