import type { HrEmployee, HrPayFrequency, HrPayStub, HrPayType } from "@/lib/hr";

/** Approximate annual compensation (salary as-is; hourly × 2,080). */
export function annualCompensation(emp: Pick<HrEmployee, "payType" | "payRate">): number {
  const rate = Number(emp.payRate) || 0;
  if (!rate) return 0;
  if (emp.payType === "salary") return Math.round(rate);
  return Math.round(rate * 2080);
}

/** Gross pay for one payroll period from the employee pay profile. */
export function periodGrossPay(input: {
  payType: HrPayType;
  payRate: string;
  payFrequency: HrPayFrequency;
  hoursWorked?: number;
}): number {
  const rate = Number(input.payRate) || 0;
  if (!rate) return 0;
  if (input.payType === "hourly") {
    const hours = input.hoursWorked ?? 40;
    return Math.round(rate * hours * 100) / 100;
  }
  switch (input.payFrequency) {
    case "weekly":
      return Math.round((rate / 52) * 100) / 100;
    case "semimonthly":
      return Math.round((rate / 24) * 100) / 100;
    case "monthly":
      return Math.round((rate / 12) * 100) / 100;
    case "biweekly":
    default:
      return Math.round((rate / 26) * 100) / 100;
  }
}

/** Default hours for a stub given pay frequency (salary staff still get hours for timesheets). */
export function defaultHoursForFrequency(freq: HrPayFrequency): number {
  switch (freq) {
    case "weekly":
      return 40;
    case "semimonthly":
      return 86.67;
    case "monthly":
      return 173.33;
    case "biweekly":
    default:
      return 80;
  }
}

/**
 * Build a pay stub draft from the employee profile for a given period.
 * Deduction estimate ~22% (fed/state/benefits) for demo payroll.
 */
export function stubFromEmployeePayProfile(
  emp: HrEmployee,
  period: { start: string; end: string; payDate: string },
  opts?: { status?: HrPayStub["status"]; notes?: string; deductionRate?: number }
): Omit<HrPayStub, "id" | "createdAt" | "updatedAt"> {
  const hours = defaultHoursForFrequency(emp.payFrequency);
  const gross = periodGrossPay({
    payType: emp.payType,
    payRate: emp.payRate,
    payFrequency: emp.payFrequency,
    hoursWorked: emp.payType === "hourly" ? hours : undefined,
  });
  const dedRate = opts?.deductionRate ?? 0.22;
  const deductions = Math.round(gross * dedRate * 100) / 100;
  const net = Math.round((gross - deductions) * 100) / 100;
  return {
    employeeId: emp.id,
    periodStart: period.start,
    periodEnd: period.end,
    payDate: period.payDate,
    grossPay: gross.toFixed(2),
    deductions: deductions.toFixed(2),
    netPay: net.toFixed(2),
    hoursWorked: String(Math.round(hours * 100) / 100),
    status: opts?.status ?? "draft",
    notes:
      opts?.notes ??
      `${emp.payType === "salary" ? "Salary" : "Hourly"} ${emp.payFrequency} — auto from pay profile`,
  };
}
