/**
 * CPMC payroll runs: calculate liabilities (not per-employee AP),
 * then settle by withdrawing cash from the appropriate bank accounts.
 *
 * Buckets:
 *  - net_pay → employee direct deposits
 *  - federal_income_tax / state_income_tax / fica_withheld → tax agencies
 *  - employer_fica / employer_futa → employer tax remittance
 *  - benefits → benefits carriers
 */

import type { HrEmployee, HrPayStub } from "@/lib/hr";
import {
  defaultHoursForFrequency,
  periodGrossPay,
} from "@/lib/hr-payroll";

export type PayrollLiabilityBucket =
  | "net_pay"
  | "federal_income_tax"
  | "state_income_tax"
  | "fica_withheld"
  | "employer_fica"
  | "employer_futa"
  | "benefits";

export type PayrollRunStatus = "accrued" | "paid";

export type PayrollLiability = {
  id: string;
  runId: string;
  bucket: PayrollLiabilityBucket;
  /** corporate | property bank cost center */
  costCenter: "corporate" | "property";
  propertyId: string;
  propertyName: string;
  payee: string;
  amount: number;
  amountPaid: number;
  period: string;
  createdAt: string;
  updatedAt: string;
};

export type PayrollRunAccountDebit = {
  costCenter: "corporate" | "property";
  propertyId: string;
  propertyName: string;
  bankAccountHint: string;
  netPay: number;
  taxRemittance: number;
  benefits: number;
  employerTaxes: number;
  /** Total cash leaving this bank on payday */
  totalDebit: number;
};

export type PayrollRun = {
  id: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  period: string;
  status: PayrollRunStatus;
  employeeCount: number;
  grossPay: number;
  employeeDeductions: number;
  employerTaxes: number;
  netPay: number;
  benefits: number;
  totalCashOut: number;
  accountDebits: PayrollRunAccountDebit[];
  notes: string;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PayrollEmployeeLine = {
  employeeId: string;
  employeeName: string;
  costCenter: "corporate" | "property";
  propertyId: string;
  propertyName: string;
  gross: number;
  federalIncomeTax: number;
  stateIncomeTax: number;
  ficaEmployee: number;
  benefitsEmployee: number;
  netPay: number;
  employerFica: number;
  employerFuta: number;
  benefitsEmployer: number;
  hoursWorked: number;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Demo tax / burden rates (approximate US mid-market). */
export const PAYROLL_RATES = {
  federalIncomeTax: 0.12,
  stateIncomeTax: 0.04,
  ficaEmployee: 0.0765,
  ficaEmployer: 0.0765,
  futaEmployer: 0.006,
  benefitsEmployee: 0.03,
  benefitsEmployer: 0.05,
} as const;

export function payrollLiabilityLabel(bucket: PayrollLiabilityBucket) {
  switch (bucket) {
    case "net_pay":
      return "Net pay (direct deposits)";
    case "federal_income_tax":
      return "Federal income tax withheld";
    case "state_income_tax":
      return "State income tax withheld";
    case "fica_withheld":
      return "Employee FICA withheld";
    case "employer_fica":
      return "Employer FICA payable";
    case "employer_futa":
      return "Employer FUTA payable";
    case "benefits":
      return "Benefits payable";
    default:
      return bucket;
  }
}

export function biweeklyPeriodAround(today = new Date()) {
  const end = new Date(today);
  // Align to a Saturday end-of-period for demo readability
  const day = end.getDay();
  const toSat = (6 - day + 7) % 7;
  end.setDate(end.getDate() + toSat);
  const start = new Date(end);
  start.setDate(start.getDate() - 13);
  const pay = new Date(end);
  pay.setDate(pay.getDate() + 5); // following Friday
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    start: iso(start),
    end: iso(end),
    payDate: iso(pay),
    period: iso(end).slice(0, 7),
  };
}

export function calculateEmployeePayrollLine(
  emp: HrEmployee
): PayrollEmployeeLine | null {
  if (emp.status !== "active") return null;
  const hours = defaultHoursForFrequency(emp.payFrequency || "biweekly");
  const gross = periodGrossPay({
    payType: emp.payType || "salary",
    payRate: emp.payRate || "0",
    payFrequency: emp.payFrequency || "biweekly",
    hoursWorked: emp.payType === "hourly" ? hours : undefined,
  });
  if (gross <= 0) return null;

  const federalIncomeTax = round2(gross * PAYROLL_RATES.federalIncomeTax);
  const stateIncomeTax = round2(gross * PAYROLL_RATES.stateIncomeTax);
  const ficaEmployee = round2(gross * PAYROLL_RATES.ficaEmployee);
  const benefitsEmployee = round2(gross * PAYROLL_RATES.benefitsEmployee);
  const employeeDeductions = round2(
    federalIncomeTax + stateIncomeTax + ficaEmployee + benefitsEmployee
  );
  const netPay = round2(Math.max(0, gross - employeeDeductions));
  const employerFica = round2(gross * PAYROLL_RATES.ficaEmployer);
  const employerFuta = round2(gross * PAYROLL_RATES.futaEmployer);
  const benefitsEmployer = round2(gross * PAYROLL_RATES.benefitsEmployer);

  const isCorporate = emp.category === "corporate" || !emp.propertyId;
  return {
    employeeId: emp.id,
    employeeName: `${emp.firstName} ${emp.lastName}`.trim() || emp.employeeId,
    costCenter: isCorporate ? "corporate" : "property",
    propertyId: isCorporate ? "" : emp.propertyId || "",
    propertyName: isCorporate
      ? "CPMC Corporate"
      : emp.propertyName || "Property",
    gross,
    federalIncomeTax,
    stateIncomeTax,
    ficaEmployee,
    benefitsEmployee,
    netPay,
    employerFica,
    employerFuta,
    benefitsEmployer,
    hoursWorked: hours,
  };
}

function costCenterKey(line: PayrollEmployeeLine) {
  return line.costCenter === "corporate"
    ? "corporate"
    : `property:${line.propertyId || line.propertyName}`;
}

export function buildPayrollRun(input: {
  employees: HrEmployee[];
  periodStart: string;
  periodEnd: string;
  payDate: string;
  notes?: string;
}): {
  run: PayrollRun;
  liabilities: PayrollLiability[];
  stubs: Array<Omit<HrPayStub, "createdAt" | "updatedAt"> & { id: string }>;
  lines: PayrollEmployeeLine[];
} {
  const now = new Date().toISOString();
  const period = input.periodEnd.slice(0, 7) || input.payDate.slice(0, 7);
  const runId = `payroll-run:${input.payDate}`;
  const lines = input.employees
    .map(calculateEmployeePayrollLine)
    .filter((l): l is PayrollEmployeeLine => Boolean(l));

  const byCenter = new Map<
    string,
    {
      costCenter: "corporate" | "property";
      propertyId: string;
      propertyName: string;
      netPay: number;
      federalIncomeTax: number;
      stateIncomeTax: number;
      ficaWithheld: number;
      employerFica: number;
      employerFuta: number;
      benefits: number;
    }
  >();

  for (const line of lines) {
    const key = costCenterKey(line);
    const cur = byCenter.get(key) ?? {
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

  const liabilities: PayrollLiability[] = [];
  const accountDebits: PayrollRunAccountDebit[] = [];

  for (const center of byCenter.values()) {
    const buckets: Array<{
      bucket: PayrollLiabilityBucket;
      amount: number;
      payee: string;
    }> = [
      {
        bucket: "net_pay",
        amount: center.netPay,
        payee: "Employee direct deposits",
      },
      {
        bucket: "federal_income_tax",
        amount: center.federalIncomeTax,
        payee: "US Treasury",
      },
      {
        bucket: "state_income_tax",
        amount: center.stateIncomeTax,
        payee: "State revenue dept",
      },
      {
        bucket: "fica_withheld",
        amount: center.ficaWithheld,
        payee: "US Treasury (FICA EE)",
      },
      {
        bucket: "employer_fica",
        amount: center.employerFica,
        payee: "US Treasury (FICA ER)",
      },
      {
        bucket: "employer_futa",
        amount: center.employerFuta,
        payee: "US Treasury (FUTA)",
      },
      {
        bucket: "benefits",
        amount: center.benefits,
        payee: "Benefits carriers",
      },
    ];

    for (const b of buckets) {
      if (b.amount <= 0) continue;
      const id = `${runId}:${center.costCenter}:${center.propertyId || "corp"}:${b.bucket}`;
      liabilities.push({
        id,
        runId,
        bucket: b.bucket,
        costCenter: center.costCenter,
        propertyId: center.propertyId,
        propertyName: center.propertyName,
        payee: b.payee,
        amount: b.amount,
        amountPaid: 0,
        period,
        createdAt: now,
        updatedAt: now,
      });
    }

    const taxRemittance = round2(
      center.federalIncomeTax +
        center.stateIncomeTax +
        center.ficaWithheld +
        center.employerFica +
        center.employerFuta
    );
    const totalDebit = round2(
      center.netPay + taxRemittance + center.benefits
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
      totalDebit,
    });
  }

  const grossPay = round2(lines.reduce((s, l) => s + l.gross, 0));
  const netPay = round2(lines.reduce((s, l) => s + l.netPay, 0));
  const employeeDeductions = round2(grossPay - netPay);
  const employerTaxes = round2(
    lines.reduce((s, l) => s + l.employerFica + l.employerFuta, 0)
  );
  const benefits = round2(
    lines.reduce((s, l) => s + l.benefitsEmployee + l.benefitsEmployer, 0)
  );
  const totalCashOut = round2(
    accountDebits.reduce((s, a) => s + a.totalDebit, 0)
  );

  const stubs = lines.map((line) => {
    const empDeductions = round2(
      line.federalIncomeTax +
        line.stateIncomeTax +
        line.ficaEmployee +
        line.benefitsEmployee
    );
    return {
      id: `stub:${runId}:${line.employeeId}`,
      employeeId: line.employeeId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      payDate: input.payDate,
      grossPay: line.gross.toFixed(2),
      deductions: empDeductions.toFixed(2),
      netPay: line.netPay.toFixed(2),
      hoursWorked: String(line.hoursWorked),
      status: "processed" as const,
      notes: `Payroll run ${input.payDate} · FIT/SIT/FICA/benefits accrued`,
    };
  });

  const run: PayrollRun = {
    id: runId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    payDate: input.payDate,
    period,
    status: "accrued",
    employeeCount: lines.length,
    grossPay,
    employeeDeductions,
    employerTaxes,
    netPay,
    benefits,
    totalCashOut,
    accountDebits,
    notes:
      input.notes ||
      "Liabilities accrued — pay from property/corporate banks on payday.",
    paidAt: "",
    createdAt: now,
    updatedAt: now,
  };

  return { run, liabilities, stubs, lines };
}
