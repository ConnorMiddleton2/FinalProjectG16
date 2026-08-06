"use client";

import { money, type YearCompareRow } from "@/lib/management";

type Props = {
  rows: YearCompareRow[];
  title?: string;
};

export function RevenueBudgetBars({ rows, title }: Props) {
  const max = Math.max(
    1,
    ...rows.flatMap((r) => [r.revenue, r.budget])
  );

  return (
    <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-4 shadow-sm">
      {title ? (
        <p className="mb-3 text-sm font-medium">{title}</p>
      ) : null}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
          Revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-600" />
          Budget (opex)
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {rows.map((row) => {
          const revH = Math.max(row.revenue > 0 ? 8 : 0, (row.revenue / max) * 112);
          const budH = Math.max(row.budget > 0 ? 8 : 0, (row.budget / max) * 112);
          return (
            <div key={row.year} className="min-w-0">
              <p className="mb-2 text-center text-xs font-medium opacity-70">
                {row.label}
              </p>
              <div className="flex h-36 items-end justify-center gap-3 rounded-xl bg-[var(--harbor-deep)]/[0.04] px-3 pb-2 pt-3">
                <div className="flex w-11 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] font-medium leading-tight text-emerald-800">
                    {row.revenue > 0 ? money(row.revenue) : "—"}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-emerald-600"
                    style={{ height: `${revH}px` }}
                    title={`Revenue ${money(row.revenue)}`}
                  />
                </div>
                <div className="flex w-11 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] font-medium leading-tight text-red-800">
                    {row.budget > 0 ? money(row.budget) : "—"}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-red-600"
                    style={{ height: `${budH}px` }}
                    title={`Budget ${money(row.budget)}`}
                  />
                </div>
              </div>
              <p className="mt-2 text-center text-xs opacity-65">
                Net{" "}
                <span
                  className={
                    row.net >= 0
                      ? "font-semibold text-emerald-800"
                      : "font-semibold text-red-800"
                  }
                >
                  {money(row.net)}
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
