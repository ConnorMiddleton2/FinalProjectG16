import {
  rentCollectedFromReceivables,
  round2,
  seedRentalReceivables,
  type Receivable,
} from "@/lib/accounts-receivable";
import type { ManagementContractDraft } from "@/lib/management-contract";
import type { OwnerAccount } from "@/lib/owner-auth";
import {
  resolveManagementFee,
  type ManagedFeeFields,
} from "@/lib/owner-payables";
import { getPropertiesForOwner } from "@/lib/owner-properties";
import { createClient } from "@/lib/supabase/server";
import {
  COLLECTIONS,
  listSharedRecords,
  upsertSharedRecord,
} from "@/lib/shared-store";
import { monthPeriodLabel } from "@/lib/seed-dates";
import { propertyRevenueFromAr } from "@/lib/ar-revenue";
import type { TenantInvoice } from "@/lib/portal-records";

export type OwnerPropertyPeriodFinancials = {
  propertyId: string;
  propertyName: string;
  periodLabel: string;
  /** Property rent collected (owner-side income — not Harborline fee income). */
  rentCollected: number;
  /** Harborline management fee as an expense to the owner. */
  managementFeeExpense: number;
  managementFeePercent: number;
  feeStructure?: ManagementContractDraft["feeStructure"];
  feeSource: "contract" | "default" | "rent_roll_estimate";
  /** rentCollected − managementFeeExpense */
  netAfterManagementFee: number;
};

export type OwnerPortfolioFinancials = {
  periodLabel: string;
  properties: OwnerPropertyPeriodFinancials[];
  totalRentCollected: number;
  totalManagementFeeExpense: number;
  totalNetAfterManagementFee: number;
  trend: {
    periodLabel: string;
    rentCollected: number;
    managementFeeExpense: number;
    netAfterManagementFee: number;
  }[];
};

function moneyParse(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Ensure rental AR seed rows exist in shared store (same pattern as ops AR panels). */
export async function ensureRentalReceivablesSeeded(): Promise<Receivable[]> {
  const client = await createClient();
  const existing = await listSharedRecords<Receivable>(
    client,
    COLLECTIONS.rentalReceivables
  );
  if (existing.length > 0) return existing;

  const seeded = seedRentalReceivables();
  for (const row of seeded) {
    await upsertSharedRecord(
      client,
      COLLECTIONS.rentalReceivables,
      row.id,
      row as unknown as Record<string, unknown>
    );
  }
  return seeded;
}

function collectedForPropertyPeriod(
  receivables: Receivable[],
  propertyName: string,
  periodLabel: string
): number {
  // Prefer exact period + property match used by remittances.
  const exact = rentCollectedFromReceivables(
    receivables,
    propertyName,
    periodLabel
  );
  if (exact > 0) return exact;

  // Fuzzy name match for the same period label (handles slight naming drift).
  const want = propertyName.trim().toLowerCase();
  return round2(
    receivables
      .filter((row) => {
        if (row.category !== "base_rent") return false;
        if (row.period !== periodLabel) return false;
        if ((row.amountReceived || 0) <= 0) return false;
        const hay = (row.property || "").trim().toLowerCase();
        return hay.includes(want) || want.includes(hay);
      })
      .reduce((sum, row) => sum + (row.amountReceived || 0), 0)
  );
}

/**
 * Fallback when no AR collections match: use contractual monthly rent roll
 * as an estimate for the current month only (clearly flagged in feeSource).
 */
function rentRollEstimate(property: ManagementContractDraft): number {
  return round2(moneyParse(property.monthlyRentRoll));
}

export function computeOwnerManagementFee(
  property: ManagedFeeFields,
  rentCollected: number
) {
  return resolveManagementFee(property.propertyName, rentCollected, [property]);
}

function financialsForPropertyPeriod(
  property: ManagementContractDraft,
  receivables: Receivable[],
  invoices: TenantInvoice[],
  periodLabel: string,
  monthsAgo: number
): OwnerPropertyPeriodFinancials {
  let rentCollected = collectedForPropertyPeriod(
    receivables,
    property.propertyName || "",
    periodLabel
  );
  let feeSource: OwnerPropertyPeriodFinancials["feeSource"] = "contract";

  if (rentCollected <= 0) {
    // Year-scoped AR helper as secondary (covers rows without period labels).
    const fiscalYear = new Date().getFullYear();
    const yearCollected = propertyRevenueFromAr({
      receivables,
      invoices,
      propertyId: property.id,
      propertyName: property.propertyName || "",
      fiscalYear,
    });
    // Approximate this month as 1/12 of year only when looking at current month
    // and we have no period-tagged rows — prefer rent roll for current month.
    if (monthsAgo === 0 && yearCollected <= 0) {
      rentCollected = rentRollEstimate(property);
      feeSource = "rent_roll_estimate";
    } else if (monthsAgo === 0 && yearCollected > 0) {
      // Prefer not to invent monthly from annual; leave 0 if period empty.
      rentCollected = 0;
    }
  }

  const fee = computeOwnerManagementFee(property, rentCollected);
  if (feeSource !== "rent_roll_estimate") {
    feeSource = fee.source;
  }

  const managementFeeExpense = fee.amount;
  return {
    propertyId: property.id,
    propertyName: property.propertyName || "Untitled property",
    periodLabel,
    rentCollected,
    managementFeeExpense,
    managementFeePercent: fee.percent,
    feeStructure: fee.feeStructure,
    feeSource,
    netAfterManagementFee: round2(rentCollected - managementFeeExpense),
  };
}

/**
 * Portfolio property-rent collected + contract management fee expense for the
 * current calendar month, plus a monthly trend (default 6 months incl. current).
 */
export async function buildOwnerPortfolioFinancials(
  owner: OwnerAccount,
  opts?: { trendMonths?: number }
): Promise<OwnerPortfolioFinancials> {
  const trendMonths = opts?.trendMonths ?? 6;
  const properties = await getPropertiesForOwner(owner);
  const receivables = await ensureRentalReceivablesSeeded();

  const client = await createClient();
  const invoices = await listSharedRecords<TenantInvoice>(
    client,
    COLLECTIONS.tenantInvoices
  );

  const currentPeriod = monthPeriodLabel(0);
  const propertiesCurrent = properties.map((p) =>
    financialsForPropertyPeriod(p, receivables, invoices, currentPeriod, 0)
  );

  const totalRentCollected = round2(
    propertiesCurrent.reduce((s, p) => s + p.rentCollected, 0)
  );
  const totalManagementFeeExpense = round2(
    propertiesCurrent.reduce((s, p) => s + p.managementFeeExpense, 0)
  );

  const trend: OwnerPortfolioFinancials["trend"] = [];
  for (let monthsAgo = trendMonths - 1; monthsAgo >= 0; monthsAgo -= 1) {
    const label = monthPeriodLabel(monthsAgo);
    const rows = properties.map((p) =>
      financialsForPropertyPeriod(p, receivables, invoices, label, monthsAgo)
    );
    const rentCollected = round2(
      rows.reduce((s, r) => s + r.rentCollected, 0)
    );
    const managementFeeExpense = round2(
      rows.reduce((s, r) => s + r.managementFeeExpense, 0)
    );
    trend.push({
      periodLabel: label,
      rentCollected,
      managementFeeExpense,
      netAfterManagementFee: round2(rentCollected - managementFeeExpense),
    });
  }

  return {
    periodLabel: currentPeriod,
    properties: propertiesCurrent,
    totalRentCollected,
    totalManagementFeeExpense,
    totalNetAfterManagementFee: round2(
      totalRentCollected - totalManagementFeeExpense
    ),
    trend,
  };
}

export function formatOwnerMoney(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
