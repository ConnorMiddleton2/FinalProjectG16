const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_MONTH_LABELS = [
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
];

/** Any AP or AR record that carries a dated amount. */
export type DatedAmount = {
  invoiceDate: string;
  amount: number;
};

export type MonthlyMarginRow = {
  /** Sortable key, e.g. "2026-08". */
  monthKey: string;
  /** Full label, e.g. "August 2026". */
  monthLabel: string;
  /** Compact label, e.g. "Aug 2026". */
  shortLabel: string;
  rentalBilled: number;
  miscBilled: number;
  operatingExpensesOwed: number;
  ownerPaymentsOwed: number;
  totalReceivableBilled: number;
  totalPayableOwed: number;
  netMargin: number;
};

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function monthlyMarginMoney(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "2026-08-05" -> "2026-08"; returns null when the date is missing or malformed. */
export function monthKeyOf(isoDate: string): string | null {
  if (!isoDate || isoDate.length < 7) return null;
  const key = isoDate.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(key) ? key : null;
}

export function monthLabelOf(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const index = Number(month) - 1;
  return `${MONTH_LABELS[index] ?? month} ${year}`;
}

export function shortMonthLabelOf(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const index = Number(month) - 1;
  return `${SHORT_MONTH_LABELS[index] ?? month} ${year}`;
}

/** Month keys ending with the given month, oldest first. */
export function recentMonthKeys(endMonthKey: string, count: number): string[] {
  const [yearText, monthText] = endMonthKey.split("-");
  let year = Number(yearText);
  let month = Number(monthText);
  const keys: string[] = [];

  for (let i = 0; i < count; i += 1) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }

  return keys.reverse();
}

export function currentMonthKey(today = new Date()) {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function sumForMonth(rows: DatedAmount[], monthKey: string) {
  let total = 0;
  for (const row of rows) {
    if (monthKeyOf(row.invoiceDate) === monthKey) {
      total += row.amount;
    }
  }
  return round2(total);
}

/**
 * Builds monthly A/R minus A/P margins. Every record is assigned to the month
 * of its invoice or owner-statement date, and amounts are the totals billed or
 * owed in that month regardless of what has been collected or paid.
 */
export function buildMonthlyMargins(input: {
  rentalReceivables: DatedAmount[];
  miscellaneousReceivables: DatedAmount[];
  operatingExpenses: DatedAmount[];
  ownerPayables: DatedAmount[];
  monthKeys: string[];
}): MonthlyMarginRow[] {
  return input.monthKeys.map((monthKey) => {
    const rentalBilled = sumForMonth(input.rentalReceivables, monthKey);
    const miscBilled = sumForMonth(input.miscellaneousReceivables, monthKey);
    const operatingExpensesOwed = sumForMonth(input.operatingExpenses, monthKey);
    const ownerPaymentsOwed = sumForMonth(input.ownerPayables, monthKey);
    const totalReceivableBilled = round2(rentalBilled + miscBilled);
    const totalPayableOwed = round2(operatingExpensesOwed + ownerPaymentsOwed);

    return {
      monthKey,
      monthLabel: monthLabelOf(monthKey),
      shortLabel: shortMonthLabelOf(monthKey),
      rentalBilled,
      miscBilled,
      operatingExpensesOwed,
      ownerPaymentsOwed,
      totalReceivableBilled,
      totalPayableOwed,
      netMargin: round2(totalReceivableBilled - totalPayableOwed),
    };
  });
}
