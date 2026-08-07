"use client";

import { useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { ManagementContractDraft } from "@/lib/management-contract";
import { AnalyticsDashboard } from "@/components/mgmt/AnalyticsDashboard";
import { PropertyAnalyticsDashboard } from "@/components/mgmt/PropertyAnalyticsDashboard";
import { FinancialStatementsPanel } from "@/components/mgmt/FinancialStatementsPanel";

/** Combined business + property analytics for Management. */
export function CombinedAnalyticsDashboard() {
  const { items: properties } = useSharedCollection<ManagementContractDraft>(
    COLLECTIONS.managedProperties
  );
  const [propertyId, setPropertyId] = useState("all");

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === propertyId) ?? null,
    [properties, propertyId]
  );

  const scopeLabel =
    propertyId === "all"
      ? "All properties (portfolio)"
      : selectedProperty?.propertyName || "Selected property";

  function scrollToFinancials() {
    document
      .getElementById("generate-financials")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 px-4 py-3 shadow-sm">
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
          <div className="flex min-w-[14rem] max-w-md flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-[var(--harbor-ink)]/65">
              View analytics for
            </span>
            <select
              className="select select-bordered w-full bg-white"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              <option value="all">All properties (portfolio)</option>
              {[...properties]
                .sort((a, b) =>
                  (a.propertyName || "").localeCompare(b.propertyName || "")
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.propertyName || "Untitled property"}
                  </option>
                ))}
            </select>
          </div>
          <p className="pb-2 text-sm text-[var(--harbor-ink)]/55">
            Showing: <strong className="text-[var(--harbor-ink)]">{scopeLabel}</strong>
            {propertyId === "all"
              ? " — totals across the whole portfolio"
              : " — numbers for this property only"}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-neutral btn-sm gap-1.5 shrink-0"
          onClick={scrollToFinancials}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Generate financials
        </button>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            How the business is doing
          </h2>
          <p className="text-sm opacity-65">
            Plain-language snapshot of rent, expenses, occupancy, and work —
            filtered by the property above.
          </p>
        </div>
        <AnalyticsDashboard propertyId={propertyId} />
      </section>

      <section className="space-y-3 border-t border-[var(--harbor-deep)]/10 pt-8">
        <div>
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            Property detail charts
          </h2>
          <p className="text-sm opacity-65">
            {propertyId === "all"
              ? "Compare properties side by side, or pick one property above to zoom in."
              : `Focus view for ${scopeLabel}.`}
          </p>
        </div>
        <PropertyAnalyticsDashboard propertyId={propertyId} />
      </section>

      <section
        id="generate-financials"
        className="scroll-mt-6 border-t border-[var(--harbor-deep)]/10 pt-8"
      >
        <FinancialStatementsPanel preferredPropertyId={propertyId} />
      </section>
    </div>
  );
}
