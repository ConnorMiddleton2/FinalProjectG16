"use client";

import { useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { ManagementContractDraft } from "@/lib/management-contract";
import type { PayableInvoice } from "@/lib/accounts-payable";
import type { Receivable } from "@/lib/accounts-receivable";
import type { BankAccount } from "@/lib/bank-accounts-shared";
import {
  accumulatedDepreciation,
  annualDepreciationForYear,
  assetCategoryLabel,
  depreciationMethodLabel,
  netBookValue,
  seedPropertyAssets,
  type PropertyAsset,
} from "@/lib/property-assets";
import { money } from "@/lib/money";
import { ensurePropertyAssetsAction } from "@/app/ops/assets/actions";

type PeriodMode = "full_year" | "ytd" | "month";
type StatementKind = "income" | "balance" | "depreciation" | "package";

function monthsLabel(m: number) {
  return [
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
  ][m - 1];
}

function periodFraction(mode: PeriodMode, month: number) {
  if (mode === "full_year") return 1;
  if (mode === "ytd") {
    const now = new Date();
    return Math.min(12, Math.max(1, now.getMonth() + 1)) / 12;
  }
  return 1 / 12;
}

function asOfMonth(mode: PeriodMode, month: number) {
  if (mode === "full_year") return 12;
  if (mode === "month") return month;
  return Math.min(12, new Date().getMonth() + 1);
}

export function FinancialStatementsPanel() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("full_year");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [propertyId, setPropertyId] = useState("all");
  const [kind, setKind] = useState<StatementKind>("package");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { items: properties } = useSharedCollection<ManagementContractDraft>(
    COLLECTIONS.managedProperties
  );
  const { items: assets, refresh: refreshAssets } =
    useSharedCollection<PropertyAsset>(
      COLLECTIONS.propertyAssets,
      seedPropertyAssets
    );
  const { items: rentalAr } = useSharedCollection<Receivable>(
    COLLECTIONS.rentalReceivables
  );
  const { items: miscAr } = useSharedCollection<Receivable>(
    COLLECTIONS.miscellaneousReceivables
  );
  const { items: payables } = useSharedCollection<PayableInvoice>(
    COLLECTIONS.payableInvoices
  );
  const { items: banks } = useSharedCollection<BankAccount>(
    COLLECTIONS.bankAccounts
  );

  const years = useMemo(() => {
    const ys = new Set<number>([currentYear, currentYear - 1, currentYear - 2]);
    for (const p of properties) {
      const yb = Number(p.yearBuilt);
      if (yb) ys.add(yb);
    }
    return [...ys].sort((a, b) => b - a);
  }, [properties, currentYear]);

  const periodTitle = useMemo(() => {
    if (periodMode === "full_year") return `Year ended December 31, ${year}`;
    if (periodMode === "ytd") return `Year-to-date through ${monthsLabel(asOfMonth("ytd", month))} ${year}`;
    return `Month ended ${monthsLabel(month)} ${year}`;
  }, [periodMode, year, month]);

  function matchesProperty(name: string, id: string) {
    if (propertyId === "all") return true;
    if (id && id === propertyId) return true;
    const prop = properties.find((p) => p.id === propertyId);
    if (!prop) return false;
    return name.toLowerCase().includes(prop.propertyName.toLowerCase());
  }

  async function generate() {
    setBusy(true);
    try {
      await ensurePropertyAssetsAction();
      await refreshAssets();

      const frac = periodFraction(periodMode, month);
      const monthEnd = asOfMonth(periodMode, month);
      const scopedProps =
        propertyId === "all"
          ? properties
          : properties.filter((p) => p.id === propertyId);
      const scopedAssets = assets.filter(
        (a) => propertyId === "all" || a.propertyId === propertyId
      );

      const rentAnnual = scopedProps.reduce(
        (s, p) => s + (Number(p.monthlyRentRoll) || 0) * 12,
        0
      );
      const opexAnnual = scopedProps.reduce(
        (s, p) => s + (Number(p.annualOperatingExpenses) || 0),
        0
      );
      const feePctAvg =
        scopedProps.length === 0
          ? 0
          : scopedProps.reduce((s, p) => s + (Number(p.feePercent) || 0), 0) /
            scopedProps.length;

      const rentalIncome = rentAnnual * frac;
      const operatingExpenses = opexAnnual * frac;
      const mgmtFee = rentalIncome * (feePctAvg / 100);

      let depreciation = 0;
      for (const a of scopedAssets) {
        const annual = annualDepreciationForYear(a, year);
        if (periodMode === "month") depreciation += annual / 12;
        else if (periodMode === "ytd")
          depreciation += (annual * monthEnd) / 12;
        else depreciation += annual;
      }
      depreciation = Math.round(depreciation * 100) / 100;

      const noi =
        Math.round((rentalIncome - operatingExpenses - mgmtFee) * 100) / 100;
      const netIncome =
        Math.round((noi - depreciation) * 100) / 100;

      const arOpen = [...rentalAr, ...miscAr]
        .filter((r) => matchesProperty(r.property, ""))
        .reduce(
          (s, r) => s + Math.max(0, r.amount - r.amountReceived),
          0
        );
      const apOpen = payables
        .filter((p) => matchesProperty(p.property, ""))
        .reduce((s, p) => s + Math.max(0, p.amount - p.amountPaid), 0);

      const cash = banks
        .filter(
          (b) =>
            propertyId === "all" ||
            b.propertyId === propertyId ||
            (b.kind === "corporate" && propertyId === "all")
        )
        .reduce((s, b) => s + (b.balance || 0), 0);

      let ppeGross = 0;
      let ppeAccum = 0;
      for (const a of scopedAssets) {
        ppeGross += a.costBasis;
        ppeAccum += accumulatedDepreciation(a, year, monthEnd);
      }
      ppeGross = Math.round(ppeGross * 100) / 100;
      ppeAccum = Math.round(ppeAccum * 100) / 100;
      const ppeNet = Math.round((ppeGross - ppeAccum) * 100) / 100;

      const totalAssets = Math.round((cash + arOpen + ppeNet) * 100) / 100;
      const equity = Math.round((totalAssets - apOpen) * 100) / 100;

      const scopeLabel =
        propertyId === "all"
          ? "Harborline Managed Portfolio (consolidated)"
          : scopedProps[0]?.propertyName || "Selected property";

      const lines: string[] = [];
      lines.push("HARBORLINE PROPERTY MANAGEMENT");
      lines.push("Accountant package — management financial statements");
      lines.push("=".repeat(64));
      lines.push(`Entity / scope: ${scopeLabel}`);
      lines.push(`Reporting period: ${periodTitle}`);
      lines.push(`Generated: ${new Date().toLocaleString()}`);
      lines.push("");
      lines.push(
        "Prepared for external accountant review. Figures combine managed-property"
      );
      lines.push(
        "operating metrics, AR/AP ledgers, bank cash, and fixed-asset depreciation."
      );
      lines.push("");

      if (kind === "income" || kind === "package") {
        lines.push("INCOME STATEMENT");
        lines.push("-".repeat(64));
        lines.push(pad("Rental income", money(rentalIncome)));
        lines.push(pad("Operating expenses", `(${money(operatingExpenses)})`));
        lines.push(pad("Management fees", `(${money(mgmtFee)})`));
        lines.push(pad("Net operating income (NOI)", money(noi)));
        lines.push(pad("Depreciation expense", `(${money(depreciation)})`));
        lines.push(pad("Net income (after depreciation)", money(netIncome)));
        lines.push("");
      }

      if (kind === "balance" || kind === "package") {
        lines.push("BALANCE SHEET (management view)");
        lines.push("-".repeat(64));
        lines.push("Assets");
        lines.push(pad("  Cash (operating banks)", money(cash)));
        lines.push(pad("  Accounts receivable (open)", money(arOpen)));
        lines.push(pad("  PP&E — cost", money(ppeGross)));
        lines.push(pad("  Less: accumulated depreciation", `(${money(ppeAccum)})`));
        lines.push(pad("  PP&E — net", money(ppeNet)));
        lines.push(pad("Total assets", money(totalAssets)));
        lines.push("");
        lines.push("Liabilities & equity");
        lines.push(pad("  Accounts payable (open)", money(apOpen)));
        lines.push(pad("  Owner / residual equity (plug)", money(equity)));
        lines.push(pad("Total liabilities & equity", money(totalAssets)));
        lines.push("");
      }

      if (kind === "depreciation" || kind === "package") {
        lines.push("DEPRECIATION SCHEDULE");
        lines.push("-".repeat(64));
        lines.push(
          [
            "Property".padEnd(22),
            "Asset".padEnd(28),
            "Method".padEnd(18),
            "In service".padEnd(12),
            "Cost".padStart(12),
            `${year} Dep`.padStart(12),
            "NBV".padStart(12),
          ].join(" ")
        );
        for (const a of [...scopedAssets].sort((x, y) =>
          x.propertyName.localeCompare(y.propertyName)
        )) {
          const dep =
            periodMode === "month"
              ? annualDepreciationForYear(a, year) / 12
              : periodMode === "ytd"
                ? (annualDepreciationForYear(a, year) * monthEnd) / 12
                : annualDepreciationForYear(a, year);
          lines.push(
            [
              a.propertyName.slice(0, 22).padEnd(22),
              a.name.slice(0, 28).padEnd(28),
              depreciationMethodLabel(a.depreciationMethod)
                .slice(0, 18)
                .padEnd(18),
              a.placedInServiceDate.padEnd(12),
              money(a.costBasis).padStart(12),
              money(Math.round(dep * 100) / 100).padStart(12),
              money(netBookValue(a, year, monthEnd)).padStart(12),
            ].join(" ")
          );
          lines.push(
            `  ${assetCategoryLabel(a.category)} · life ${a.usefulLifeYears || "n/a"} yr · salvage ${money(a.salvageValue)}`
          );
        }
        lines.push("");
        lines.push(pad("Total depreciation (period)", money(depreciation)));
        lines.push("");
      }

      lines.push("Notes");
      lines.push("-".repeat(64));
      lines.push(
        "1. Land is non-depreciable. Building uses straight-line (39-year commercial)."
      );
      lines.push(
        "2. Period amounts for rent/OpEx are prorated from annual property metrics when monthly ledgers are sparse."
      );
      lines.push(
        "3. Cash and AR/AP reflect current shared ledgers as of generation time."
      );
      lines.push("4. Equity is a residual plug for management presentation.");

      setPreview(lines.join("\n"));
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!preview) return;
    const blob = new Blob([preview], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Harborline-financials-${year}-${periodMode}-${propertyId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPreview() {
    if (!preview) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<pre style="font:12px/1.45 ui-monospace,Menlo,Consolas,monospace;padding:24px;white-space:pre-wrap">${preview
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")}</pre>`
    );
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
          Generate financial statements
        </h2>
        <p className="mt-1 text-sm opacity-65">
          Build an accountant package from portfolio metrics, AR/AP, bank cash,
          and Assets depreciation. Choose year, period, property, and statement
          type.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="form-control">
          <span className="mb-1 text-sm opacity-70">Fiscal year</span>
          <select
            className="select select-bordered bg-white"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control">
          <span className="mb-1 text-sm opacity-70">Period</span>
          <select
            className="select select-bordered bg-white"
            value={periodMode}
            onChange={(e) => setPeriodMode(e.target.value as PeriodMode)}
          >
            <option value="full_year">Whole year</option>
            <option value="ytd">Year to date</option>
            <option value="month">Single month</option>
          </select>
        </label>

        {periodMode === "month" ? (
          <label className="form-control">
            <span className="mb-1 text-sm opacity-70">Month</span>
            <select
              className="select select-bordered bg-white"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {monthsLabel(m)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="form-control">
          <span className="mb-1 text-sm opacity-70">Property</span>
          <select
            className="select select-bordered bg-white"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            <option value="all">All properties (consolidated)</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.propertyName}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control sm:col-span-2 lg:col-span-1">
          <span className="mb-1 text-sm opacity-70">Statement</span>
          <select
            className="select select-bordered bg-white"
            value={kind}
            onChange={(e) => setKind(e.target.value as StatementKind)}
          >
            <option value="package">Full package (all)</option>
            <option value="income">Income statement</option>
            <option value="balance">Balance sheet</option>
            <option value="depreciation">Depreciation schedule</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn border-0 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
          disabled={busy}
          onClick={() => void generate()}
        >
          {busy ? "Generating…" : "Generate statements"}
        </button>
        {preview ? (
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={download}
            >
              Download .txt
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={printPreview}
            >
              Print
            </button>
          </>
        ) : null}
      </div>

      {preview ? (
        <pre className="max-h-[32rem] overflow-auto rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/30 p-4 text-[11px] leading-relaxed text-[var(--harbor-ink)]">
          {preview}
        </pre>
      ) : null}
    </section>
  );
}

function pad(label: string, value: string) {
  const width = 48;
  const left = label.slice(0, width);
  return `${left}${" ".repeat(Math.max(1, width - left.length))}${value}`;
}
