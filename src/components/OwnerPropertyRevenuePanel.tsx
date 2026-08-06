import Link from "next/link";
import { TrendingUp } from "lucide-react";
import {
  formatOwnerMoney,
  type OwnerPortfolioFinancials,
} from "@/lib/owner-property-financials";

type Props = {
  financials: OwnerPortfolioFinancials;
};

export function OwnerPropertyRevenuePanel({ financials }: Props) {
  const maxTrend = Math.max(
    1,
    ...financials.trend.flatMap((t) => [
      t.rentCollected,
      t.managementFeeExpense,
    ])
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2 text-[var(--harbor-mid)]">
          <TrendingUp className="h-5 w-5" />
          <h2 className="owner-section-title">Property income this period</h2>
        </div>
        <p className="owner-muted text-xs">{financials.periodLabel}</p>
      </div>

      <p className="owner-muted max-w-3xl text-sm leading-relaxed">
        These figures are <span className="font-medium text-[var(--harbor-ink)]">your properties&apos; rent collected</span>
        — not Harborline&apos;s fee income. The management fee is shown separately
        as an expense so you can see what the assets generated and what it cost
        to have Harborline manage them.
      </p>

      <div className="owner-stagger grid gap-3 sm:grid-cols-3">
        <div className="owner-card p-5">
          <p className="text-xs uppercase tracking-wide opacity-55">
            Property rent collected
          </p>
          <p className="mt-2 font-display text-3xl tracking-tight text-[var(--harbor-ink)]">
            {formatOwnerMoney(financials.totalRentCollected)}
          </p>
          <p className="owner-muted mt-1 text-xs">
            Gross property income (current month)
          </p>
        </div>
        <div className="owner-card p-5">
          <p className="text-xs uppercase tracking-wide opacity-55">
            Harborline management fee (expense)
          </p>
          <p className="mt-2 font-display text-3xl tracking-tight text-[var(--harbor-ink)]">
            {formatOwnerMoney(financials.totalManagementFeeExpense)}
          </p>
          <p className="owner-muted mt-1 text-xs">
            From your management contract terms
          </p>
        </div>
        <div className="owner-card border-[color-mix(in_srgb,var(--harbor-mid)_35%,transparent)] bg-[color-mix(in_srgb,var(--harbor-mist)_55%,white)] p-5">
          <p className="text-xs uppercase tracking-wide opacity-55">
            Net after management fee
          </p>
          <p className="mt-2 font-display text-3xl tracking-tight text-[var(--harbor-ink)]">
            {formatOwnerMoney(financials.totalNetAfterManagementFee)}
          </p>
          <p className="owner-muted mt-1 text-xs">
            Rent collected minus fee only (not full remittance / NOI)
          </p>
        </div>
      </div>

      {financials.properties.length > 0 ? (
        <div className="owner-card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Property</th>
                <th className="text-right">Rent collected</th>
                <th className="text-right">Mgmt fee (expense)</th>
                <th className="text-right">Net after fee</th>
              </tr>
            </thead>
            <tbody>
              {financials.properties.map((row) => (
                <tr key={row.propertyId}>
                  <td>
                    <Link
                      href={`/owners/dashboard/properties/${row.propertyId}`}
                      className="font-medium text-[var(--harbor-ink)] underline-offset-2 hover:underline"
                    >
                      {row.propertyName}
                    </Link>
                    {row.feeSource === "rent_roll_estimate" ? (
                      <p className="text-xs opacity-50">
                        Estimate from rent roll (no AR match this month)
                      </p>
                    ) : row.managementFeePercent > 0 ? (
                      <p className="text-xs opacity-50">
                        Fee {row.managementFeePercent}%
                        {row.feeStructure
                          ? ` · ${row.feeStructure.replaceAll("_", " ")}`
                          : ""}
                      </p>
                    ) : null}
                  </td>
                  <td className="text-right font-medium">
                    {formatOwnerMoney(row.rentCollected)}
                  </td>
                  <td className="text-right font-medium">
                    {formatOwnerMoney(row.managementFeeExpense)}
                  </td>
                  <td className="text-right font-semibold">
                    {formatOwnerMoney(row.netAfterManagementFee)}
                  </td>
                </tr>
              ))}
              <tr className="bg-[var(--harbor-sand)]/40 font-semibold">
                <td>Portfolio total</td>
                <td className="text-right">
                  {formatOwnerMoney(financials.totalRentCollected)}
                </td>
                <td className="text-right">
                  {formatOwnerMoney(financials.totalManagementFeeExpense)}
                </td>
                <td className="text-right">
                  {formatOwnerMoney(financials.totalNetAfterManagementFee)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="owner-card p-5">
        <p className="mb-3 text-sm font-medium text-[var(--harbor-ink)]">
          Recent months — rent collected vs management fee
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-700" />
            Property rent collected
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--harbor-mid)]" />
            Management fee (expense)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {financials.trend.map((t) => {
            const rentH = Math.max(
              t.rentCollected > 0 ? 6 : 0,
              (t.rentCollected / maxTrend) * 96
            );
            const feeH = Math.max(
              t.managementFeeExpense > 0 ? 6 : 0,
              (t.managementFeeExpense / maxTrend) * 96
            );
            return (
              <div key={t.periodLabel} className="min-w-0">
                <div className="flex h-28 items-end justify-center gap-1.5 rounded-xl bg-[var(--harbor-deep)]/[0.04] px-1.5 pb-2 pt-2">
                  <div
                    className="w-3.5 rounded-t-md bg-emerald-700 sm:w-4"
                    style={{ height: `${rentH}px` }}
                    title={`Rent ${formatOwnerMoney(t.rentCollected)}`}
                  />
                  <div
                    className="w-3.5 rounded-t-md bg-[var(--harbor-mid)] sm:w-4"
                    style={{ height: `${feeH}px` }}
                    title={`Fee ${formatOwnerMoney(t.managementFeeExpense)}`}
                  />
                </div>
                <p className="mt-1.5 text-center text-[10px] leading-tight opacity-65">
                  {t.periodLabel}
                </p>
                <p className="text-center text-[10px] font-medium text-[var(--harbor-ink)]">
                  Net {formatOwnerMoney(t.netAfterManagementFee)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
