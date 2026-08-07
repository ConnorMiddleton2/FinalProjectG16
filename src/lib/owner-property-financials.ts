import {
  isUnitLevelRentReceivable,
  operationalRentCollected,
  round2,
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
} from "@/lib/shared-store";
import { monthPeriodLabel } from "@/lib/seed-dates";
import { propertyRevenueFromAr } from "@/lib/ar-revenue";
import type { TenantInvoice } from "@/lib/portal-records";

export type OwnerPropertyPeriodFinancials = {
  propertyId: string;
  propertyName: string;
  periodLabel: string;
  /** Property rent collected (owner-side income — not CPMC fee income). */
  rentCollected: number;
  /** CPMC management fee as an expense to the owner. */
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

function collectedForPropertyPeriod(
  receivables: Receivable[],
  propertyName: string,
  periodLabel: string
): number {
  // Prefer exact period + property match used by remittances.
  const exact = operationalRentCollected(
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
        if (!isUnitLevelRentReceivable(row)) return false;
        if (row.category !== "base_rent") return false;
        if (row.period !== periodLabel) return false;
        if ((row.amountReceived || 0) <= 0) return false;
        const hay = (row.property || "").trim().toLowerCase();
        return hay.includes(want) || want.includes(hay);
      })
      .reduce((sum, row) => sum + (row.amountReceived || 0), 0)
  );
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
    if (monthsAgo === 0 && yearCollected > 0) {
      // Prefer not to invent monthly from annual; leave 0 if period empty.
      rentCollected = 0;
    }
    // Do not fall back to rent-roll estimates — only AR from onboarded /
    // managed tenants should drive owner revenue.
  }

  const fee = computeOwnerManagementFee(property, rentCollected);
  feeSource = fee.source;

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
 * Revenue comes only from AR tied to this owner's managed properties — not from
 * unrelated seed receivables or rent-roll estimates for unmanaged assets.
 */
export async function buildOwnerPortfolioFinancials(
  owner: OwnerAccount,
  opts?: { trendMonths?: number }
): Promise<OwnerPortfolioFinancials> {
  const trendMonths = opts?.trendMonths ?? 6;
  const properties = await getPropertiesForOwner(owner);
  const ownerPropertyNames = new Set(
    properties
      .map((p) => (p.propertyName || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const client = await createClient();
  const allReceivables = await listSharedRecords<Receivable>(
    client,
    COLLECTIONS.rentalReceivables
  );
  // Only AR for properties this owner actually has under management
  const receivables = allReceivables.filter((row) => {
    const hay = (row.property || "").trim().toLowerCase();
    if (!hay) return false;
    for (const name of ownerPropertyNames) {
      if (hay === name || hay.includes(name) || name.includes(hay)) return true;
    }
    return false;
  });

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
