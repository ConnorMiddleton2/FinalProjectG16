/**
 * Seeds corporate + per-property HR employees / pay stubs, and rebuilds
 * per-unit tenant contracts + invoices from property_tenants (unit rents).
 *
 * Usage:
 *   node scripts/seed-hr-and-tenant-billing.mjs <SUPABASE_URL> <ANON_KEY>
 * Or with .env.local already loaded via:
 *   node --env-file=.env.local scripts/seed-hr-and-tenant-billing.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnvLocal();

const url =
  process.argv[2] || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key =
  process.argv[3] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
if (!url || !key) {
  console.error(
    "Usage: node scripts/seed-hr-and-tenant-billing.mjs <URL> <ANON_KEY>"
  );
  process.exit(1);
}

const sb = createClient(url, key);
const now = new Date().toISOString();
const today = now.slice(0, 10);
const year = new Date().getFullYear();
const month = String(new Date().getMonth() + 1).padStart(2, "0");
const period = `${year}-${month}`;

const CADE_PASSWORD_HASH =
  "05632acb8cbd15978116f4ceec5c1c0f:874dc8efba3cdd90df052129ea47d7de588c357921a6fb4c03e1b66b2b3c728407a2d9f116364221813293afcc053ebf4e8949a94bfc859254455a636b84a314";

const FIRST = [
  "Ava", "Noah", "Mia", "Liam", "Emma", "Oliver", "Sophia", "Elijah",
  "Isabella", "James", "Charlotte", "Benjamin", "Amelia", "Lucas", "Harper",
  "Henry", "Evelyn", "Alexander", "Abigail", "Michael", "Emily", "Daniel",
  "Elizabeth", "Mateo", "Sofia", "Sebastian", "Avery", "Jack", "Ella", "Owen",
];
const LAST = [
  "Nguyen", "Patel", "Garcia", "Kim", "Johnson", "Williams", "Brown", "Jones",
  "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee",
];

const PROPERTIES = [
  { id: "prop-grandview", name: "Grandview Apartments", type: "multifamily", units: 300 },
  { id: "prop-oakridge", name: "Oakridge Flats", type: "multifamily", units: 80 },
  { id: "prop-meridian-tower", name: "Meridian Tower", type: "office", units: 12 },
  { id: "prop-riverside-office", name: "Riverside Office Park", type: "office", units: 80 },
  { id: "prop-willow-creek", name: "Willow Creek Senior Residences", type: "multifamily", units: 100 },
  { id: "prop-lakeside", name: "Lakeside Senior Community", type: "multifamily", units: 200 },
];

function round2(n) {
  return Math.round(n * 100) / 100;
}

function nameAt(i) {
  return `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`;
}

function emailSlug(first, last, n) {
  return `${first}.${last}.${n}@harborline.demo`.toLowerCase().replace(/\s+/g, "");
}

function moduleAccess(department, category) {
  const map = {
    maintenance: ["maintenance", "properties"],
    leasing: ["tenant", "sales-marketing", "properties"],
    accounting: ["ap", "ar"],
    hr: ["hr"],
    management: [
      "properties",
      "maintenance",
      "tenant",
      "ap",
      "ar",
      "hr",
      "sales-marketing",
      "management",
    ],
    other: [],
  };
  const mods = [...(map[department] || [])];
  if (category === "property") {
    return mods.filter((m) => m !== "management" && m !== "hr");
  }
  return mods;
}

function corporateRoles() {
  return [
    ["VP of Property Management", "management", "salary", 115000, "biweekly"],
    ["Regional Property Director", "management", "salary", 98000, "biweekly"],
    ["Controller", "accounting", "salary", 105000, "biweekly"],
    ["Accounts Receivable Specialist", "accounting", "salary", 58000, "biweekly"],
    ["Accounts Payable Specialist", "accounting", "salary", 56000, "biweekly"],
    ["HR Generalist", "hr", "salary", 72000, "biweekly"],
    ["Payroll Coordinator", "hr", "salary", 62000, "biweekly"],
    ["Sales & Marketing Manager", "leasing", "salary", 78000, "biweekly"],
    ["Leasing Marketing Coordinator", "leasing", "salary", 52000, "biweekly"],
  ];
}

function propertyRoles(p) {
  const units = p.units;
  const isOffice = p.type === "office";
  const roles = [];
  roles.push([
    isOffice ? "Commercial Property Manager" : "Community Manager",
    "management",
    "salary",
    isOffice ? 82000 : units >= 200 ? 75000 : units >= 80 ? 68000 : 62000,
    "biweekly",
  ]);
  if (units >= 200 && !isOffice) {
    roles.push(["Assistant Community Manager", "management", "salary", 52000, "biweekly"]);
  }
  const leasingCount = Math.max(1, isOffice ? 1 : Math.ceil(units / 120));
  for (let i = 0; i < leasingCount; i++) {
    roles.push([
      isOffice ? "Office Leasing Associate" : "Leasing Consultant",
      "leasing",
      "salary",
      isOffice ? 55000 : 48000,
      "biweekly",
    ]);
  }
  if (!isOffice) {
    if (units >= 150) {
      roles.push(["Maintenance Supervisor", "maintenance", "salary", 62000, "biweekly"]);
    }
    const techCount = Math.max(1, Math.ceil(units / 100));
    for (let i = 0; i < techCount; i++) {
      roles.push([
        "Maintenance Technician",
        "maintenance",
        "hourly",
        units >= 200 ? 32 : 28,
        "weekly",
      ]);
    }
  } else {
    roles.push([
      units >= 40 ? "Chief Engineer" : "Building Engineer",
      "maintenance",
      "salary",
      units >= 40 ? 72000 : 64000,
      "biweekly",
    ]);
    if (units >= 60) {
      roles.push(["Assistant Engineer", "maintenance", "hourly", 30, "weekly"]);
    }
  }
  return roles;
}

function periodGross(payType, payRate, payFrequency) {
  const rate = Number(payRate) || 0;
  if (!rate) return 0;
  if (payType === "hourly") {
    return round2(rate * 40);
  }
  if (payFrequency === "weekly") return round2(rate / 52);
  if (payFrequency === "semimonthly") return round2(rate / 24);
  if (payFrequency === "monthly") return round2(rate / 12);
  return round2(rate / 26);
}

function defaultHours(freq) {
  if (freq === "weekly") return 40;
  if (freq === "semimonthly") return 86.67;
  if (freq === "monthly") return 173.33;
  return 80;
}

async function deleteCollection(collection) {
  const { error } = await sb
    .from("shared_records")
    .delete()
    .eq("collection", collection);
  if (error) throw new Error(`delete ${collection}: ${error.message}`);
}

async function upsertMany(collection, rows) {
  const batch = 80;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch).map((r) => ({
      collection,
      id: r.id,
      payload: { ...r, id: r.id },
      updated_at: now,
    }));
    const { error } = await sb.from("shared_records").upsert(chunk, {
      onConflict: "collection,id",
    });
    if (error) throw new Error(`${collection} batch ${i}: ${error.message}`);
  }
}

async function listCollection(collection) {
  const { data, error } = await sb
    .from("shared_records")
    .select("id, payload")
    .eq("collection", collection);
  if (error) throw new Error(`list ${collection}: ${error.message}`);
  return (data || []).map((r) => ({ id: r.id, ...(r.payload || {}) }));
}

function buildEmployees() {
  const employees = [];
  let seq = 2;
  let nameIdx = 0;

  employees.push({
    id: "hr-emp-cade",
    employeeId: "HL-0001",
    firstName: "Cade",
    lastName: "Coburn",
    email: "cade.coburn@icloud.com",
    phone: "",
    department: "management",
    category: "corporate",
    jobTitle: "Team member",
    status: "active",
    propertyId: "",
    propertyName: "Harborline Corporate",
    moduleAccess: moduleAccess("management", "corporate"),
    passwordHash: CADE_PASSWORD_HASH,
    temporaryPassword: "Baxter10!",
    mustResetPassword: false,
    payType: "salary",
    payRate: "95000",
    payFrequency: "biweekly",
    payEffectiveDate: "2024-01-01",
    federalWithholding: "Married filing jointly — W-4 on file",
    stateWithholding: "CA — standard",
    deductionsNotes: "Health insurance, 401(k) 4%",
    directDepositBank: "Harborline Credit Union",
    directDepositAccountLast4: "4821",
    directDepositRoutingLast4: "1220",
    payrollNotes: "Corporate ops login.",
    contractTitle: "Employment agreement",
    contractStart: "2024-01-01",
    contractEnd: "",
    contractFileName: "",
    contractNotes: "",
    hiredAt: "2024-01-01",
    terminatedAt: "",
    notes: "Seeded team login account.",
    createdAt: now,
    updatedAt: now,
  });

  for (const [title, dept, payType, payRate, freq] of corporateRoles()) {
    const nm = nameAt(nameIdx++);
    const [first, last] = nm.split(" ");
    const idNum = String(seq).padStart(4, "0");
    const id = `hr-emp-${seq}`;
    employees.push({
      id,
      employeeId: `HL-${idNum}`,
      firstName: first,
      lastName: last,
      email: emailSlug(first, last, seq),
      phone: `(615) 555-${String(2000 + seq).padStart(4, "0")}`,
      department: dept,
      category: "corporate",
      jobTitle: title,
      status: "active",
      propertyId: "",
      propertyName: "Harborline Corporate",
      moduleAccess: moduleAccess(dept, "corporate"),
      passwordHash: "",
      temporaryPassword: "",
      mustResetPassword: true,
      payType,
      payRate: String(payRate),
      payFrequency: freq,
      payEffectiveDate: "2025-01-01",
      federalWithholding: "W-4 on file",
      stateWithholding: "State standard",
      deductionsNotes: "Medical, dental, 401(k)",
      directDepositBank: "Harborline Credit Union",
      directDepositAccountLast4: String(1000 + (seq % 9000)).slice(-4),
      directDepositRoutingLast4: "1220",
      payrollNotes: `Corporate ${title}`,
      contractTitle: `Employment agreement — ${title}`,
      contractStart: "2025-01-01",
      contractEnd: "",
      contractFileName: "",
      contractNotes: "",
      hiredAt: "2025-01-01",
      terminatedAt: "",
      notes: "",
      createdAt: now,
      updatedAt: now,
    });
    seq++;
  }

  for (const p of PROPERTIES) {
    for (const [title, dept, payType, payRate, freq] of propertyRoles(p)) {
      const nm = nameAt(nameIdx++);
      const [first, last] = nm.split(" ");
      const idNum = String(seq).padStart(4, "0");
      const id = `hr-emp-${seq}`;
      employees.push({
        id,
        employeeId: `HL-${idNum}`,
        firstName: first,
        lastName: last,
        email: emailSlug(first, last, seq),
        phone: `(615) 555-${String(3000 + seq).padStart(4, "0")}`,
        department: dept,
        category: "property",
        jobTitle: title,
        status: "active",
        propertyId: p.id,
        propertyName: p.name,
        moduleAccess: moduleAccess(dept, "property"),
        passwordHash: "",
        temporaryPassword: "",
        mustResetPassword: true,
        payType,
        payRate: String(payRate),
        payFrequency: freq,
        payEffectiveDate: "2025-03-01",
        federalWithholding: "W-4 on file",
        stateWithholding: "State standard",
        deductionsNotes: payType === "hourly" ? "Timesheet required" : "Medical, 401(k)",
        directDepositBank: "Community Bank",
        directDepositAccountLast4: String(2000 + (seq % 8000)).slice(-4),
        directDepositRoutingLast4: "1221",
        payrollNotes: `${p.name} — ${title}`,
        contractTitle: `Employment agreement — ${title}`,
        contractStart: "2025-03-01",
        contractEnd: "",
        contractFileName: "",
        contractNotes: "",
        hiredAt: "2025-03-01",
        terminatedAt: "",
        notes: `Assigned to ${p.name}`,
        createdAt: now,
        updatedAt: now,
      });
      seq++;
    }
  }

  return employees;
}

function buildStubs(employees) {
  const stubs = [];
  let stubN = 1;
  // Two recent periods ending around "today"
  const periods = [
    { start: "2026-07-13", end: "2026-07-26", payDate: "2026-07-31", weeklyStart: "2026-07-20", weeklyEnd: "2026-07-26", weeklyPay: "2026-07-28" },
    { start: "2026-07-27", end: "2026-08-09", payDate: "2026-08-14", weeklyStart: "2026-07-27", weeklyEnd: "2026-08-02", weeklyPay: "2026-08-04" },
  ];
  for (const emp of employees) {
    if (emp.status !== "active" || !emp.payRate) continue;
    for (const p of periods) {
      const isWeekly = emp.payFrequency === "weekly";
      const start = isWeekly ? p.weeklyStart : p.start;
      const end = isWeekly ? p.weeklyEnd : p.end;
      const payDate = isWeekly ? p.weeklyPay : p.payDate;
      const hours = defaultHours(emp.payFrequency);
      const gross = periodGross(emp.payType, emp.payRate, emp.payFrequency);
      const deductions = round2(gross * 0.22);
      const net = round2(gross - deductions);
      stubs.push({
        id: `hr-stub-${stubN++}`,
        employeeId: emp.id,
        periodStart: start,
        periodEnd: end,
        payDate,
        grossPay: gross.toFixed(2),
        deductions: deductions.toFixed(2),
        netPay: net.toFixed(2),
        hoursWorked: String(hours),
        status: "paid",
        notes: `${emp.payType} ${emp.payFrequency} — seeded from pay profile`,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  return stubs;
}

function invoiceStatusFromTenant(row, pendingDue = 0) {
  const pending = Number(pendingDue) || 0;
  const status = String(row.status || "active");
  if (pending <= 0 && (status === "active" || !status)) return "Paid";
  if (status === "past_due" || pending > Number(row.monthlyRent || 0) * 1.1)
    return "Overdue";
  return "Due";
}

async function main() {
  console.log("Seeding HR staffing + per-unit tenant billing…");

  const employees = buildEmployees();
  const stubs = buildStubs(employees);

  await deleteCollection("hr_employees");
  await deleteCollection("hr_pay_stubs");
  await upsertMany("hr_employees", employees);
  await upsertMany("hr_pay_stubs", stubs);

  const propertyTenants = await listCollection("property_tenants");
  const tenantsRoster = await listCollection("tenants");
  const pendingByKey = new Map();
  for (const t of tenantsRoster) {
    const key = `${String(t.propertyLeased || "").toLowerCase()}|${String(t.unit || "").toLowerCase()}`;
    pendingByKey.set(key, Number(t.pendingDue) || 0);
  }

  const occupied = propertyTenants.filter(
    (t) => t.name && String(t.name).trim() && t.status !== "vacant"
  );

  const contracts = [];
  const invoices = [];
  for (const t of occupied) {
    const rent = round2(Number(t.monthlyRent) || 0);
    if (rent <= 0) continue;
    const email = String(t.email || "").trim().toLowerCase();
    const termMonths = 12;
    contracts.push({
      id: `tcon-${t.id}`,
      property: t.propertyName || "",
      term: `${termMonths} months`,
      rent: String(rent),
      status: "Active",
      propertyId: t.propertyId || "",
      unit: t.unit || "",
      tenantName: t.name,
      tenantEmail: email,
    });
    const pendingKey = `${String(t.propertyName || "").toLowerCase()}|${String(t.unit || "").toLowerCase()}`;
    const pendingDue = pendingByKey.get(pendingKey) ?? 0;
    const invStatus = invoiceStatusFromTenant(t, pendingDue);
    invoices.push({
      id: `inv-${t.id}-${period}`,
      label: `${t.propertyName} · ${t.unit} rent — ${period}`,
      amount: String(rent),
      due: `${period}-05`,
      status: invStatus,
      propertyId: t.propertyId || "",
      propertyName: t.propertyName || "",
      unit: t.unit || "",
      tenantName: t.name,
      tenantEmail: email,
      dueDate: `${period}-05`,
      paidAt: invStatus === "Paid" ? `${period}-03` : "",
    });
  }

  await deleteCollection("tenant_contracts");
  await deleteCollection("tenant_invoices");
  await upsertMany("tenant_contracts", contracts);
  await upsertMany("tenant_invoices", invoices);

  const byProp = {};
  for (const e of employees.filter((x) => x.category === "property")) {
    byProp[e.propertyName] = (byProp[e.propertyName] || 0) + 1;
  }

  console.log(
    JSON.stringify(
      {
        hrEmployees: employees.length,
        corporate: employees.filter((e) => e.category === "corporate").length,
        propertyStaff: employees.filter((e) => e.category === "property").length,
        staffByProperty: byProp,
        payStubs: stubs.length,
        tenantContracts: contracts.length,
        tenantInvoices: invoices.length,
        sampleInvoice: invoices[0] || null,
      },
      null,
      2
    )
  );
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
