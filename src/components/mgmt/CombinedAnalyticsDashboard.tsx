"use client";

import { AnalyticsDashboard } from "@/components/mgmt/AnalyticsDashboard";
import { PropertyAnalyticsDashboard } from "@/components/mgmt/PropertyAnalyticsDashboard";
import { FinancialStatementsPanel } from "@/components/mgmt/FinancialStatementsPanel";

/** Combined business + property analytics for Management. */
export function CombinedAnalyticsDashboard() {
  return (
    <div className="space-y-10">
      <FinancialStatementsPanel />

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            Business overview
          </h2>
          <p className="text-sm opacity-65">
            Company-wide KPIs across portfolio, operations, and spend.
          </p>
        </div>
        <AnalyticsDashboard />
      </section>

      <section className="space-y-3 border-t border-[var(--harbor-deep)]/10 pt-8">
        <div>
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            Property performance
          </h2>
          <p className="text-sm opacity-65">
            Occupancy, revenue, and NOI by property, city, or asset type.
          </p>
        </div>
        <PropertyAnalyticsDashboard />
      </section>
    </div>
  );
}
