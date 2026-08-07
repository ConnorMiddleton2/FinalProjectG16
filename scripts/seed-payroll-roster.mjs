/**
 * Scrub HR (keep Cade), seed CPMC corporate + property staff,
 * accrue + pay one biweekly payroll into bank accounts.
 *
 * Usage: node --env-file=.env.local scripts/seed-payroll-roster.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY");
  process.exit(1);
}

const sb = createClient(url, key);
const CADE = "hr-emp-cade";
const now = new Date().toISOString();
const today = now.slice(0, 10);

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function list(collection) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await sb
      .from("shared_records")
      .select("id, payload")
      .eq("collection", collection)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

async function upsert(collection, id, payload) {
  const { error } = await sb.from("shared_records").upsert(
    {
      collection,
      id,
      payload: { ...payload, id },
      updated_at: now,
    },
    { onConflict: "collection,id" }
  );
  if (error) throw new Error(`${collection}/${id}: ${error.message}`);
}

async function del(collection, id) {
  const { error } = await sb
    .from("shared_records")
    .delete()
    .eq("collection", collection)
    .eq("id", id);
  if (error) throw new Error(`delete ${collection}/${id}: ${error.message}`);
}

const MODULES = {
  maintenance: ["maintenance", "properties"],
  leasing: ["tenant", "sales-marketing", "properties"],
  accounting: ["ap", "ar", "banks", "assets"],
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
    "banks",
    "assets",
  ],
  other: [],
};

function resolveAccess(dept, category) {
  const mods = new Set(MODULES[dept] || []);
  if (category === "property") {
    mods.delete("management");
    mods.delete("hr");
  }
  return [...mods];
}

const CADE_HASH =
  "05632acb8cbd15978116f4ceec5c1c0f:874dc8efba3cdd90df052129ea47d7de588c357921a6fb4c03e1b66b2b3c728407a2d9f116364221813293afcc053ebf4e8949a94bfc859254455a636b84a314";

const ROSTER = [
  ["hr-emp-cade", "HL-0001", "Cade", "Coburn", "cade.coburn@icloud.com", "(662) 555-0101", "management", "corporate", "Director of Operations", "", "CPMC Corporate", "salary", 95000],
  ["hr-emp-corp-controller", "HL-0002", "Nora", "Ellison", "nora.ellison@cpmc.demo", "(312) 555-0202", "accounting", "corporate", "Controller", "", "CPMC Corporate", "salary", 108000],
  ["hr-emp-corp-ap", "HL-0003", "Marcus", "Chen", "marcus.chen@cpmc.demo", "(312) 555-0203", "accounting", "corporate", "Accounts Payable Lead", "", "CPMC Corporate", "salary", 62000],
  ["hr-emp-corp-ar", "HL-0004", "Priya", "Shah", "priya.shah@cpmc.demo", "(312) 555-0204", "accounting", "corporate", "AR & Collections Lead", "", "CPMC Corporate", "salary", 58000],
  ["hr-emp-corp-hr", "HL-0005", "Jordan", "Blake", "jordan.blake@cpmc.demo", "(312) 555-0205", "hr", "corporate", "HR Generalist", "", "CPMC Corporate", "salary", 68000],
  ["hr-emp-corp-marketing", "HL-0006", "Avery", "Cole", "avery.cole@cpmc.demo", "(312) 555-0206", "leasing", "corporate", "Marketing Coordinator", "", "CPMC Corporate", "salary", 55000],
  ["hr-emp-corp-ea", "HL-0007", "Sam", "Rivera", "sam.rivera@cpmc.demo", "(312) 555-0207", "management", "corporate", "Executive Assistant", "", "CPMC Corporate", "salary", 52000],
  ["hr-emp-gv-pm", "HL-0101", "Dana", "Whitfield", "dana.whitfield@cpmc.demo", "(615) 555-1101", "management", "property", "Community Manager", "prop-grandview", "Grandview Apartments", "salary", 72000],
  ["hr-emp-gv-apm", "HL-0102", "Chris", "Alvarez", "chris.alvarez@cpmc.demo", "(615) 555-1102", "management", "property", "Assistant Community Manager", "prop-grandview", "Grandview Apartments", "salary", 48000],
  ["hr-emp-gv-lease-1", "HL-0103", "Mia", "Brooks", "mia.brooks@cpmc.demo", "(615) 555-1103", "leasing", "property", "Leasing Consultant", "prop-grandview", "Grandview Apartments", "salary", 42000],
  ["hr-emp-gv-lease-2", "HL-0104", "Owen", "Park", "owen.park@cpmc.demo", "(615) 555-1104", "leasing", "property", "Leasing Consultant", "prop-grandview", "Grandview Apartments", "salary", 40000],
  ["hr-emp-gv-maint-sup", "HL-0105", "Ty", "Nguyen", "ty.nguyen@cpmc.demo", "(615) 555-1105", "maintenance", "property", "Maintenance Supervisor", "prop-grandview", "Grandview Apartments", "salary", 58000],
  ["hr-emp-gv-tech-1", "HL-0106", "Luis", "Ortega", "luis.ortega@cpmc.demo", "(615) 555-1106", "maintenance", "property", "Maintenance Technician", "prop-grandview", "Grandview Apartments", "hourly", 22],
  ["hr-emp-gv-tech-2", "HL-0107", "Keisha", "Ward", "keisha.ward@cpmc.demo", "(615) 555-1107", "maintenance", "property", "Maintenance Technician", "prop-grandview", "Grandview Apartments", "hourly", 20],
  ["hr-emp-gv-tech-3", "HL-0108", "Ben", "Holt", "ben.holt@cpmc.demo", "(615) 555-1108", "maintenance", "property", "Maintenance Technician", "prop-grandview", "Grandview Apartments", "hourly", 19],
  ["hr-emp-gv-porter", "HL-0109", "Amy", "Cruz", "amy.cruz@cpmc.demo", "(615) 555-1109", "maintenance", "property", "Porter / Grounds", "prop-grandview", "Grandview Apartments", "hourly", 17],
  ["hr-emp-mt-pm", "HL-0201", "Helen", "Cho", "helen.cho@cpmc.demo", "(312) 555-2101", "management", "property", "Property Manager", "prop-meridian-tower", "Meridian Tower", "salary", 78000],
  ["hr-emp-mt-chief", "HL-0202", "Greg", "Malone", "greg.malone@cpmc.demo", "(312) 555-2102", "maintenance", "property", "Chief Engineer", "prop-meridian-tower", "Meridian Tower", "salary", 82000],
  ["hr-emp-mt-eng", "HL-0203", "Nate", "Kim", "nate.kim@cpmc.demo", "(312) 555-2103", "maintenance", "property", "Building Engineer", "prop-meridian-tower", "Meridian Tower", "salary", 58000],
  ["hr-emp-mt-admin", "HL-0204", "Rita", "Gomez", "rita.gomez@cpmc.demo", "(312) 555-2104", "leasing", "property", "Office Administrator", "prop-meridian-tower", "Meridian Tower", "salary", 46000],
  ["hr-emp-mt-porter", "HL-0205", "Paul", "Diaz", "paul.diaz@cpmc.demo", "(312) 555-2105", "maintenance", "property", "Day Porter", "prop-meridian-tower", "Meridian Tower", "hourly", 18.5],
  ["hr-emp-rb-pm", "HL-0301", "Eli", "Foster", "eli.foster@cpmc.demo", "(662) 555-3101", "management", "property", "Property Manager", "00000000-0000-4000-8000-0000000000b1", "Riverbend Commerce Center", "salary", 62000],
  ["hr-emp-rb-maint", "HL-0302", "Hank", "Miller", "hank.miller@cpmc.demo", "(662) 555-3102", "maintenance", "property", "Maintenance Technician", "00000000-0000-4000-8000-0000000000b1", "Riverbend Commerce Center", "hourly", 23],
  ["hr-emp-rb-admin", "HL-0303", "Jade", "Simmons", "jade.simmons@cpmc.demo", "(662) 555-3103", "leasing", "property", "Leasing & Admin Coordinator", "00000000-0000-4000-8000-0000000000b1", "Riverbend Commerce Center", "salary", 42000],
];

const RATES = {
  federalIncomeTax: 0.12,
  stateIncomeTax: 0.04,
  ficaEmployee: 0.0765,
  ficaEmployer: 0.0765,
  futaEmployer: 0.006,
  benefitsEmployee: 0.03,
  benefitsEmployer: 0.05,
};

function periodGross(payType, payRate) {
  if (payType === "hourly") return round2(payRate * 80);
  return round2(payRate / 26);
}

function biweekly() {
  const end = new Date();
  const toSat = (6 - end.getDay() + 7) % 7;
  end.setDate(end.getDate() + toSat);
  const start = new Date(end);
  start.setDate(start.getDate() - 13);
  const pay = new Date(end);
  pay.setDate(pay.getDate() + 5);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end), payDate: iso(pay), period: iso(end).slice(0, 7) };
}

async function main() {
  console.log("Scrubbing employees (keep Cade)…");
  const employees = await list("hr_employees");
  for (const row of employees) {
    if (row.id === CADE) continue;
    await del("hr_employees", row.id);
  }
  for (const row of await list("hr_pay_stubs")) {
    if (row.payload?.employeeId === CADE) continue;
    await del("hr_pay_stubs", row.id);
  }
  for (const row of await list("payroll_runs")) await del("payroll_runs", row.id);
  for (const row of await list("payroll_liabilities"))
    await del("payroll_liabilities", row.id);
  // Clear prior payroll bank txns so we can re-post cleanly
  for (const row of await list("bank_transactions")) {
    if (row.payload?.kind === "payroll") await del("bank_transactions", row.id);
  }

  console.log("Seeding roster…");
  const empPayloads = [];
  for (const [i, r] of ROSTER.entries()) {
    const [
      id,
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      department,
      category,
      jobTitle,
      propertyId,
      propertyName,
      payType,
      payRate,
    ] = r;
    const payload = {
      id,
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      department,
      category,
      jobTitle,
      status: "active",
      propertyId,
      propertyName,
      moduleAccess: resolveAccess(department, category),
      passwordHash: id === CADE ? CADE_HASH : "",
      temporaryPassword: id === CADE ? "Baxter10!" : "",
      mustResetPassword: id !== CADE,
      payType,
      payRate: String(payRate),
      payFrequency: "biweekly",
      payEffectiveDate: today,
      federalWithholding: "12% FIT (demo)",
      stateWithholding: "4% SIT (demo)",
      deductionsNotes: "FICA 7.65% EE + 3% benefits EE",
      directDepositBank: "CPMC Payroll ACH",
      directDepositAccountLast4: String(1000 + (i % 9000)).slice(-4),
      directDepositRoutingLast4: "0210",
      payrollNotes: `${category} · ${jobTitle}`,
      contractTitle: `${jobTitle} agreement`,
      contractStart: today,
      contractEnd: "",
      contractFileName: "",
      contractNotes: "",
      hiredAt: today,
      terminatedAt: "",
      notes: "",
      createdAt: now,
      updatedAt: now,
    };
    await upsert("hr_employees", id, payload);
    empPayloads.push(payload);
  }

  const period = biweekly();
  const runId = `payroll-run:${period.payDate}`;
  console.log(`Accruing payroll ${period.start} → ${period.end}, pay ${period.payDate}…`);

  const lines = empPayloads.map((emp) => {
    const gross = periodGross(emp.payType, Number(emp.payRate));
    const federalIncomeTax = round2(gross * RATES.federalIncomeTax);
    const stateIncomeTax = round2(gross * RATES.stateIncomeTax);
    const ficaEmployee = round2(gross * RATES.ficaEmployee);
    const benefitsEmployee = round2(gross * RATES.benefitsEmployee);
    const netPay = round2(
      gross - federalIncomeTax - stateIncomeTax - ficaEmployee - benefitsEmployee
    );
    const employerFica = round2(gross * RATES.ficaEmployer);
    const employerFuta = round2(gross * RATES.futaEmployer);
    const benefitsEmployer = round2(gross * RATES.benefitsEmployer);
    const isCorp = emp.category === "corporate";
    return {
      emp,
      gross,
      federalIncomeTax,
      stateIncomeTax,
      ficaEmployee,
      benefitsEmployee,
      netPay,
      employerFica,
      employerFuta,
      benefitsEmployer,
      costCenter: isCorp ? "corporate" : "property",
      propertyId: isCorp ? "" : emp.propertyId,
      propertyName: isCorp ? "CPMC Corporate" : emp.propertyName,
    };
  });

  const byCenter = new Map();
  for (const line of lines) {
    const key =
      line.costCenter === "corporate"
        ? "corporate"
        : `property:${line.propertyId}`;
    const cur = byCenter.get(key) || {
      costCenter: line.costCenter,
      propertyId: line.propertyId,
      propertyName: line.propertyName,
      netPay: 0,
      federalIncomeTax: 0,
      stateIncomeTax: 0,
      ficaWithheld: 0,
      employerFica: 0,
      employerFuta: 0,
      benefits: 0,
    };
    cur.netPay = round2(cur.netPay + line.netPay);
    cur.federalIncomeTax = round2(cur.federalIncomeTax + line.federalIncomeTax);
    cur.stateIncomeTax = round2(cur.stateIncomeTax + line.stateIncomeTax);
    cur.ficaWithheld = round2(cur.ficaWithheld + line.ficaEmployee);
    cur.employerFica = round2(cur.employerFica + line.employerFica);
    cur.employerFuta = round2(cur.employerFuta + line.employerFuta);
    cur.benefits = round2(
      cur.benefits + line.benefitsEmployee + line.benefitsEmployer
    );
    byCenter.set(key, cur);
  }

  const accountDebits = [];
  for (const center of byCenter.values()) {
    const taxRemittance = round2(
      center.federalIncomeTax +
        center.stateIncomeTax +
        center.ficaWithheld +
        center.employerFica +
        center.employerFuta
    );
    accountDebits.push({
      costCenter: center.costCenter,
      propertyId: center.propertyId,
      propertyName: center.propertyName,
      bankAccountHint:
        center.costCenter === "corporate"
          ? "CPMC Corporate"
          : `${center.propertyName} Operating`,
      netPay: center.netPay,
      taxRemittance,
      benefits: center.benefits,
      employerTaxes: round2(center.employerFica + center.employerFuta),
      totalDebit: round2(center.netPay + taxRemittance + center.benefits),
    });

    const buckets = [
      ["net_pay", center.netPay, "Employee direct deposits"],
      ["federal_income_tax", center.federalIncomeTax, "US Treasury"],
      ["state_income_tax", center.stateIncomeTax, "State revenue dept"],
      ["fica_withheld", center.ficaWithheld, "US Treasury (FICA EE)"],
      ["employer_fica", center.employerFica, "US Treasury (FICA ER)"],
      ["employer_futa", center.employerFuta, "US Treasury (FUTA)"],
      ["benefits", center.benefits, "Benefits carriers"],
    ];
    for (const [bucket, amount, payee] of buckets) {
      if (amount <= 0) continue;
      const id = `${runId}:${center.costCenter}:${center.propertyId || "corp"}:${bucket}`;
      await upsert("payroll_liabilities", id, {
        id,
        runId,
        bucket,
        costCenter: center.costCenter,
        propertyId: center.propertyId,
        propertyName: center.propertyName,
        payee,
        amount,
        amountPaid: amount,
        period: period.period,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  for (const line of lines) {
    const deductions = round2(
      line.federalIncomeTax +
        line.stateIncomeTax +
        line.ficaEmployee +
        line.benefitsEmployee
    );
    const stubId = `stub:${runId}:${line.emp.id}`;
    await upsert("hr_pay_stubs", stubId, {
      id: stubId,
      employeeId: line.emp.id,
      periodStart: period.start,
      periodEnd: period.end,
      payDate: period.payDate,
      grossPay: line.gross.toFixed(2),
      deductions: deductions.toFixed(2),
      netPay: line.netPay.toFixed(2),
      hoursWorked: line.emp.payType === "hourly" ? "80" : "80",
      status: "paid",
      notes: `Payroll run ${period.payDate} · paid from bank`,
      createdAt: now,
      updatedAt: now,
    });
  }

  const banks = await list("bank_accounts");
  const bankByProp = new Map();
  let corporate = null;
  for (const b of banks) {
    const p = b.payload || {};
    if (p.kind === "corporate" || b.id === "bank-corporate") corporate = { ...p, id: b.id };
    if (p.kind === "property") {
      bankByProp.set(p.propertyId, { ...p, id: b.id });
      bankByProp.set(String(p.propertyName || "").toLowerCase(), { ...p, id: b.id });
    }
  }

  async function debitBank(account, amount, memo, counterparty, relatedId) {
    const bal = round2(Number(account.balance) || 0);
    const nextBal = round2(bal - amount);
    const txnId = relatedId;
    await upsert("bank_transactions", txnId, {
      id: txnId,
      accountId: account.id,
      kind: "payroll",
      amount,
      direction: "debit",
      memo,
      counterparty,
      propertyId: account.propertyId || "",
      propertyName: account.propertyName || account.name || "",
      relatedId,
      period: period.period,
      createdAt: now,
    });
    await upsert("bank_accounts", account.id, {
      ...account,
      balance: nextBal,
      updatedAt: now,
    });
    account.balance = nextBal;
    console.log(`  −$${amount.toFixed(2)}  ${account.name || account.id}  ${memo}`);
  }

  console.log("Paying payroll from banks…");
  for (const debit of accountDebits) {
    let account =
      debit.costCenter === "corporate"
        ? corporate
        : bankByProp.get(debit.propertyId) ||
          bankByProp.get(debit.propertyName.toLowerCase());
    if (!account) {
      console.warn("Missing bank for", debit.propertyName);
      continue;
    }
    const slices = [
      [debit.netPay, `Payroll · Direct deposits · ${period.payDate}`, "Employee direct deposits", "net"],
      [debit.taxRemittance, `Payroll · Tax remittance · ${period.payDate}`, "Tax agencies", "tax"],
      [debit.benefits, `Payroll · Benefits · ${period.payDate}`, "Benefits carriers", "benefits"],
    ];
    for (const [amount, memo, counterparty, suffix] of slices) {
      if (amount <= 0) continue;
      const relatedId = `${runId}:${debit.costCenter}:${debit.propertyId || "corp"}:${suffix}`;
      await debitBank(account, amount, memo, counterparty, relatedId);
    }
  }

  // Recalc all balances from ledger
  const txns = await list("bank_transactions");
  for (const b of await list("bank_accounts")) {
    const signed = txns
      .filter((t) => t.payload?.accountId === b.id)
      .reduce((sum, t) => {
        const amt = Number(t.payload?.amount) || 0;
        return sum + (t.payload?.direction === "credit" ? amt : -amt);
      }, 0);
    await upsert("bank_accounts", b.id, {
      ...b.payload,
      id: b.id,
      balance: round2(signed),
      updatedAt: now,
    });
  }

  const grossPay = round2(lines.reduce((s, l) => s + l.gross, 0));
  const netPay = round2(lines.reduce((s, l) => s + l.netPay, 0));
  const totalCashOut = round2(accountDebits.reduce((s, a) => s + a.totalDebit, 0));
  await upsert("payroll_runs", runId, {
    id: runId,
    periodStart: period.start,
    periodEnd: period.end,
    payDate: period.payDate,
    period: period.period,
    status: "paid",
    employeeCount: lines.length,
    grossPay,
    employeeDeductions: round2(grossPay - netPay),
    employerTaxes: round2(
      lines.reduce((s, l) => s + l.employerFica + l.employerFuta, 0)
    ),
    netPay,
    benefits: round2(
      lines.reduce((s, l) => s + l.benefitsEmployee + l.benefitsEmployer, 0)
    ),
    totalCashOut,
    accountDebits,
    notes: "Paid — net deposits, tax remittance, benefits from appropriate banks.",
    paidAt: now,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`Done. ${empPayloads.length} employees. Gross $${grossPay} · Cash out $${totalCashOut}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
