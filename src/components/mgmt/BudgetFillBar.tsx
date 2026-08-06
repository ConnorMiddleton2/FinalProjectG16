"use client";

import { money } from "@/lib/management";

/** S&M-style fill bar with live spend + overage beyond budget. */
export function BudgetFillBar({
  budgeted,
  approved,
  pending = 0,
  compact,
}: {
  budgeted: number;
  approved: number;
  pending?: number;
  compact?: boolean;
}) {
  const budget = Math.max(0, budgeted);
  const spent = Math.max(0, approved);
  const pend = Math.max(0, pending);
  const over = Math.max(0, spent - budget);
  const withinBudget = Math.min(spent, budget);
  const scale = Math.max(budget, spent + pend, 1);

  const withinPct = (withinBudget / scale) * 100;
  const overPct = (over / scale) * 100;
  const pendingPct = Math.min(
    100 - withinPct - overPct,
    (pend / scale) * 100
  );
  const budgetMarkPct = budget > 0 ? (budget / scale) * 100 : 0;

  const left =
    pend > 0
      ? `${money(spent)} (+${money(pend)})`
      : over > 0
        ? `${money(spent)} · OVER`
        : money(spent);

  return (
    <div
      className={`relative overflow-hidden rounded-md bg-[#c5cdd4] shadow-inner ring-1 ring-[#9aa6b0]/55 ${
        compact ? "h-7" : "h-9"
      }`}
    >
      <div
        className="absolute inset-y-0 left-0 bg-[#6d8799]"
        style={{ width: `${withinPct}%` }}
      />
      {overPct > 0 ? (
        <div
          className="absolute inset-y-0 bg-[#b91c1c]"
          style={{ left: `${withinPct}%`, width: `${overPct}%` }}
        />
      ) : null}
      {pendingPct > 0 ? (
        <div
          className="absolute inset-y-0 bg-[#6d8799]/40"
          style={{
            left: `${withinPct + overPct}%`,
            width: `${pendingPct}%`,
          }}
        />
      ) : null}
      {budget > 0 && scale > budget ? (
        <div
          className="absolute inset-y-0 w-px bg-[#243542]/50"
          style={{ left: `${budgetMarkPct}%` }}
          title={`Budget ${money(budget)}`}
        />
      ) : null}
      <div
        className={`absolute inset-0 flex items-center justify-between gap-2 px-2 font-semibold text-[#243542] ${
          compact ? "text-[10px]" : "text-xs"
        }`}
      >
        <span className={over > 0 ? "text-[#7f1d1d]" : undefined}>{left}</span>
        <span className="opacity-75">{money(budget)}</span>
      </div>
    </div>
  );
}
