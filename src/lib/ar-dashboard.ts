import {
  balanceOf,
  daysLate,
  round2,
  statusOf,
  todayIso,
  type Receivable,
} from "@/lib/accounts-receivable";
import {
  currentMonthKey,
  monthKeyOf,
  monthLabelOf,
  recentMonthKeys,
  shortMonthLabelOf,
} from "@/lib/monthly-margin";

export type AgingBucketId = "current" | "days_31_60" | "days_61_90" | "days_90_plus";

export type AgingBucket = {
  id: AgingBucketId;
  label: string;
  amount: number;
  percent: number;
};

export type MonthlyBilledCollected = {
  monthKey: string;
  monthLabel: string;
  shortLabel: string;
  billed: number;
  collected: number;
};

export type DelinquentTenantRow = {
  key: string;
  customerName: string;
  property: string;
  unit: string;
  balance: number;
  daysDelinquent: number;
  invoiceCount: number;
};

export type PropertyCollectionRow = {
  property: string;
  billed: number;
  collected: number;
  collectionRate: number;
  outstanding: number;
};

export type DisputedChargeRow = {
  id: string;
  receivableId: string;
  customerName: string;
  property: string;
  unit: string;
  amount: number;
  balance: number;
  kind: string;
  dueDate: string;
};

export type ArDashboardMetrics = {
  periodKey: string;
  periodLabel: string;
  rentBilledThisMonth: number;
  rentCollectedThisMonth: number;
  collectionRate: number;
  outstandingAr: number;
  delinquentAr30: number;
  averageDaysDelinquent: number;
  aging: AgingBucket[];
  billedVsCollected: MonthlyBilledCollected[];
  topDelinquent: DelinquentTenantRow[];
  lowCollectionProperties: PropertyCollectionRow[];
  disputedCharges: DisputedChargeRow[];
};

function agingBucketId(days: number): AgingBucketId {
  if (days <= 30) return "current";
  if (days <= 60) return "days_31_60";
  if (days <= 90) return "days_61_90";
  return "days_90_plus";
}

const AGING_LABELS: Record<AgingBucketId, string> = {
  current: "Current (0–30 days)",
  days_31_60: "31–60 days",
  days_61_90: "61–90 days",
  days_90_plus: "90+ days",
};

const AGING_ORDER: AgingBucketId[] = [
  "current",
  "days_31_60",
  "days_61_90",
  "days_90_plus",
];

/** Combine rental + misc ledgers for portfolio A/R views. */
export function buildArDashboardMetrics(
  receivables: Receivable[],
  options?: { today?: string; monthCount?: number; topN?: number }
): ArDashboardMetrics {
  const today = options?.today ?? todayIso();
  const monthCount = options?.monthCount ?? 6;
  const topN = options?.topN ?? 5;
  const periodKey = currentMonthKey(new Date(`${today}T12:00:00`));
  const periodLabel = monthLabelOf(periodKey);
  const monthKeys = recentMonthKeys(periodKey, monthCount);

  let rentBilledThisMonth = 0;
  let rentCollectedThisMonth = 0;
  let outstandingAr = 0;
  let delinquentAr30 = 0;
  let weightedDays = 0;
  let weightedBalance = 0;

  const agingTotals: Record<AgingBucketId, number> = {
    current: 0,
    days_31_60: 0,
    days_61_90: 0,
    days_90_plus: 0,
  };

  const monthly = new Map<string, { billed: number; collected: number }>();
  for (const key of monthKeys) {
    monthly.set(key, { billed: 0, collected: 0 });
  }

  const delinquentMap = new Map<string, DelinquentTenantRow>();
  const propertyMonth = new Map<
    string,
    { billed: number; collected: number; outstanding: number }
  >();
  const disputedCharges: DisputedChargeRow[] = [];

  for (const row of receivables) {
    const invoiceMonth = monthKeyOf(row.invoiceDate);
    const bal = balanceOf(row);
    const late = daysLate(row, today);
    const received = round2(Math.max(0, row.amountReceived || 0));
    const billed = round2(Math.max(0, row.amount || 0));

    if (invoiceMonth === periodKey) {
      rentBilledThisMonth = round2(rentBilledThisMonth + billed);
      rentCollectedThisMonth = round2(rentCollectedThisMonth + received);
    }

    if (invoiceMonth && monthly.has(invoiceMonth)) {
      const m = monthly.get(invoiceMonth)!;
      m.billed = round2(m.billed + billed);
      m.collected = round2(m.collected + received);
    }

    const propKey = (row.property || "Unassigned").trim() || "Unassigned";
    const propStats = propertyMonth.get(propKey) ?? {
      billed: 0,
      collected: 0,
      outstanding: 0,
    };
    if (invoiceMonth === periodKey) {
      propStats.billed = round2(propStats.billed + billed);
      propStats.collected = round2(propStats.collected + received);
    }
    if (bal > 0) {
      propStats.outstanding = round2(propStats.outstanding + bal);
    }
    propertyMonth.set(propKey, propStats);

    if (bal > 0) {
      outstandingAr = round2(outstandingAr + bal);
      const bucketDays = Math.max(0, late);
      agingTotals[agingBucketId(bucketDays)] = round2(
        agingTotals[agingBucketId(bucketDays)] + bal
      );

      if (late >= 30) {
        delinquentAr30 = round2(delinquentAr30 + bal);
      }

      if (late > 0) {
        weightedDays += late * bal;
        weightedBalance += bal;

        const tenantKey = [
          row.customerId || row.customerName,
          row.property,
          row.unit,
        ]
          .join("|")
          .toLowerCase();
        const existing = delinquentMap.get(tenantKey);
        if (existing) {
          existing.balance = round2(existing.balance + bal);
          existing.daysDelinquent = Math.max(existing.daysDelinquent, late);
          existing.invoiceCount += 1;
        } else {
          delinquentMap.set(tenantKey, {
            key: tenantKey,
            customerName: row.customerName || "Unknown tenant",
            property: row.property || "—",
            unit: row.unit || "—",
            balance: bal,
            daysDelinquent: late,
            invoiceCount: 1,
          });
        }
      }
    }

    if (row.disputed || statusOf(row) === "disputed") {
      if (bal > 0 || row.disputed) {
        disputedCharges.push({
          id: row.id,
          receivableId: row.receivableId || row.id,
          customerName: row.customerName || "Unknown",
          property: row.property || "—",
          unit: row.unit || "—",
          amount: billed,
          balance: bal,
          kind: row.kind,
          dueDate: row.dueDate || "—",
        });
      }
    }
  }

  const collectionRate =
    rentBilledThisMonth > 0
      ? round2((rentCollectedThisMonth / rentBilledThisMonth) * 100)
      : 0;

  const averageDaysDelinquent =
    weightedBalance > 0 ? Math.round(weightedDays / weightedBalance) : 0;

  const aging: AgingBucket[] = AGING_ORDER.map((id) => {
    const amount = agingTotals[id];
    return {
      id,
      label: AGING_LABELS[id],
      amount,
      percent:
        outstandingAr > 0 ? round2((amount / outstandingAr) * 100) : 0,
    };
  });

  const billedVsCollected: MonthlyBilledCollected[] = monthKeys.map((key) => {
    const m = monthly.get(key) ?? { billed: 0, collected: 0 };
    return {
      monthKey: key,
      monthLabel: monthLabelOf(key),
      shortLabel: shortMonthLabelOf(key),
      billed: m.billed,
      collected: m.collected,
    };
  });

  const topDelinquent = [...delinquentMap.values()]
    .sort((a, b) => b.balance - a.balance || b.daysDelinquent - a.daysDelinquent)
    .slice(0, topN);

  const lowCollectionProperties = [...propertyMonth.entries()]
    .map(([property, stats]) => ({
      property,
      billed: stats.billed,
      collected: stats.collected,
      collectionRate:
        stats.billed > 0
          ? round2((stats.collected / stats.billed) * 100)
          : stats.outstanding > 0
            ? 0
            : 100,
      outstanding: stats.outstanding,
    }))
    .filter((p) => p.billed > 0 && p.collectionRate < 85)
    .sort((a, b) => a.collectionRate - b.collectionRate)
    .slice(0, topN);

  disputedCharges.sort((a, b) => b.balance - a.balance);

  return {
    periodKey,
    periodLabel,
    rentBilledThisMonth,
    rentCollectedThisMonth,
    collectionRate,
    outstandingAr,
    delinquentAr30,
    averageDaysDelinquent,
    aging,
    billedVsCollected,
    topDelinquent,
    lowCollectionProperties,
    disputedCharges: disputedCharges.slice(0, topN),
  };
}
