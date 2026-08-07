"use client";

import { useCallback, useEffect, useState } from "react";
import { CONSERVATIVE_MARGIN_RATE } from "@/lib/bank-accounts-shared";
import { money } from "@/lib/money";
import {
  fundCashCallAction,
  loadAccountLedgerAction,
  loadBanksCashOverviewAction,
  provisionBankAccountsAction,
  queueResidualAction,
  remitOwnerAction,
  requestCashCallAction,
  runMonthlyFeeSweepAction,
  syncBanksFromLedgersAction,
  type BankCashOverviewRow,
} from "@/app/ops/banks/actions";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  seedOwnerCashCalls,
  type OwnerCashCall,
} from "@/lib/bank-accounts-shared";

type LedgerRow = {
  id: string;
  kind: string;
  direction: "credit" | "debit";
  amount: number;
  memo: string;
  counterparty: string;
  createdAt: string;
};

export function BanksDashboard() {
  const { items: cashCalls, refresh: refreshCalls } =
    useSharedCollection<OwnerCashCall>(
      COLLECTIONS.ownerCashCalls,
      seedOwnerCashCalls
    );

  const [rows, setRows] = useState<BankCashOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [cashReason, setCashReason] = useState("");

  const loadOverview = useCallback(async () => {
    setError(null);
    try {
      const result = await loadBanksCashOverviewAction();
      setRows(result.rows);
      setSelectedId((prev) => {
        if (prev && result.rows.some((r) => r.id === prev)) return prev;
        return result.rows[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load banks.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLedger = useCallback(async (accountId: string) => {
    setLedgerLoading(true);
    try {
      const result = await loadAccountLedgerAction(accountId);
      setLedger(result.txns);
    } catch {
      setLedger([]);
    } finally {
      setLedgerLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await provisionBankAccountsAction();
      await loadOverview();
    })();
  }, [loadOverview]);

  useEffect(() => {
    if (!selectedId) {
      setLedger([]);
      return;
    }
    void loadLedger(selectedId);
  }, [selectedId, loadLedger]);

  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 4500);
  }

  async function run(
    label: string,
    fn: () => Promise<{ error?: string; ok?: boolean; count?: number }>
  ) {
    setBusy(true);
    try {
      const result = await fn();
      if (result.error) {
        flash(result.error);
        return;
      }
      flash(label);
      await loadOverview();
      await refreshCalls();
      if (selectedId) await loadLedger(selectedId);
    } finally {
      setBusy(false);
    }
  }

  const totalCash = rows.reduce((s, a) => s + (a.balance || 0), 0);
  const totalRent = rows.reduce((s, a) => s + (a.rentIn || 0), 0);
  const totalExpenses = rows.reduce((s, a) => s + (a.expensesOut || 0), 0);

  return (
    <div className="space-y-4">
      {msg ? (
        <div className="rounded-xl border border-[var(--harbor-mid)]/30 bg-white/90 px-4 py-3 text-sm">
          {msg}
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm opacity-65">
            Each property bank shows rent cash in, paid expenses out, and the
            resulting cash balance. Management fees sweep property → CPMC
            Corporate. Owner remittances leave the property account. Margin held
            before owner remits: {(CONSERVATIVE_MARGIN_RATE * 100).toFixed(0)}%
            of rent roll + unpaid AP.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <p>
              <span className="opacity-60">Rent in </span>
              <span className="font-semibold tabular-nums text-emerald-800">
                {money(totalRent)}
              </span>
            </p>
            <p>
              <span className="opacity-60">Expenses out </span>
              <span className="font-semibold tabular-nums text-red-800">
                {money(totalExpenses)}
              </span>
            </p>
            <p>
              <span className="opacity-60">Portfolio cash </span>
              <span className="text-xl font-semibold tabular-nums">
                {money(totalCash)}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={busy}
            onClick={() =>
              void run("Accounts provisioned.", () =>
                provisionBankAccountsAction()
              )
            }
          >
            Sync accounts from properties
          </button>
          <button
            type="button"
            className="btn btn-neutral btn-sm"
            disabled={busy || loading}
            onClick={() =>
              void run(
                "Cash rebuilt from rents and paid expenses.",
                async () => {
                  const result = await syncBanksFromLedgersAction();
                  if (result && "error" in result && result.error) {
                    return { error: String(result.error) };
                  }
                  return { ok: true };
                }
              )
            }
          >
            Rebuild rent &amp; expense cash
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>Account</th>
                <th className="text-right">Rent in</th>
                <th className="text-right">Expenses &amp; payroll</th>
                <th className="text-right">Cash balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="opacity-60">
                    Loading bank cash…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="opacity-60">
                    No accounts yet — sync from properties, then rebuild cash.
                  </td>
                </tr>
              ) : (
                rows.map((a) => (
                  <tr
                    key={a.id}
                    className={`cursor-pointer ${
                      selected?.id === a.id ? "bg-[var(--harbor-deep)]/8" : ""
                    }`}
                    onClick={() => setSelectedId(a.id)}
                  >
                    <td>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs opacity-55">
                        {a.kind === "corporate"
                          ? "CPMC"
                          : a.ownerName || a.ownerEmail || "—"}
                      </p>
                    </td>
                    <td className="text-right tabular-nums text-emerald-800">
                      {a.kind === "property" ? money(a.rentIn) : "—"}
                    </td>
                    <td className="text-right tabular-nums text-red-800">
                      {a.kind === "property" ? money(a.expensesOut) : "—"}
                    </td>
                    <td className="text-right font-medium tabular-nums">
                      {money(a.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {selected ? (
          <div className="space-y-4 rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 p-5 shadow-sm">
            <div>
              <p className="text-lg font-semibold">{selected.name}</p>
              <p className="text-sm opacity-65">
                {selected.propertyName || "Corporate"}
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-xl border border-emerald-700/15 bg-emerald-50/60 px-2 py-3">
                  <dt className="text-xs opacity-60">Rent in</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-emerald-800">
                    {money(selected.rentIn)}
                  </dd>
                </div>
                <div className="rounded-xl border border-red-700/15 bg-red-50/60 px-2 py-3">
                  <dt className="text-xs opacity-60">Expenses out</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-red-800">
                    {money(selected.expensesOut)}
                  </dd>
                </div>
                <div className="rounded-xl border border-[var(--harbor-deep)]/15 bg-white px-2 py-3">
                  <dt className="text-xs opacity-60">Cash</dt>
                  <dd className="mt-1 font-semibold tabular-nums">
                    {money(selected.balance)}
                  </dd>
                </div>
              </dl>
            </div>

            {selected.kind === "property" ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-neutral btn-sm"
                  disabled={busy}
                  onClick={() =>
                    void run("Management fee swept to corporate.", () =>
                      runMonthlyFeeSweepAction({
                        propertyId: selected.propertyId,
                      })
                    )
                  }
                >
                  Sweep monthly fee
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={busy}
                  onClick={() =>
                    void run("Owner residual queued for next month.", () =>
                      queueResidualAction({ propertyId: selected.propertyId })
                    )
                  }
                >
                  Queue residual
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={busy || selected.pendingOwnerRemit <= 0}
                  onClick={() =>
                    void run("Prior residual remitted to owner.", () =>
                      remitOwnerAction({ propertyId: selected.propertyId })
                    )
                  }
                >
                  Remit pending to owner
                </button>
              </div>
            ) : null}

            {selected.kind === "property" ? (
              <form
                className="grid gap-2 rounded-xl border border-base-300 p-3 sm:grid-cols-[1fr_1fr_auto]"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run("Cash call sent to owner.", async () => {
                    const result = await requestCashCallAction({
                      propertyId: selected.propertyId,
                      amount: Number(cashAmount),
                      reason: cashReason,
                    });
                    if (!("error" in result)) {
                      setCashAmount("");
                      setCashReason("");
                    }
                    return result;
                  });
                }}
              >
                <input
                  className="input input-bordered input-sm"
                  placeholder="Cash call $"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  required
                />
                <input
                  className="input input-bordered input-sm"
                  placeholder="Reason (cover OpEx shortfall)"
                  value={cashReason}
                  onChange={(e) => setCashReason(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-warning btn-sm"
                  disabled={busy}
                >
                  Request owner cash
                </button>
              </form>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-semibold">Cash activity</p>
              {ledgerLoading ? (
                <p className="text-sm opacity-60">Loading activity…</p>
              ) : ledger.length === 0 ? (
                <p className="text-sm opacity-60">
                  No rent or expense activity yet. Click{" "}
                  <span className="font-medium">Rebuild rent &amp; expense cash</span>
                  .
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto rounded-xl border border-base-300">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Type</th>
                        <th>Memo</th>
                        <th className="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((t) => (
                        <tr key={t.id}>
                          <td className="whitespace-nowrap text-xs">
                            {(t.createdAt || "").slice(0, 16).replace("T", " ")}
                          </td>
                          <td className="text-xs capitalize">
                            {t.kind === "tenant_rent"
                              ? "Rent in"
                              : t.kind === "property_expense"
                                ? "Expense"
                                : t.kind === "payroll"
                                  ? "Payroll"
                                  : t.kind.replaceAll("_", " ")}
                          </td>
                          <td className="text-xs">{t.memo}</td>
                          <td
                            className={`text-right tabular-nums text-xs ${
                              t.direction === "credit"
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            {t.direction === "credit" ? "+" : "−"}
                            {money(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {cashCalls.filter((c) => c.propertyId === selected.propertyId)
              .length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-semibold">Cash calls</p>
                <ul className="space-y-2 text-sm">
                  {cashCalls
                    .filter((c) => c.propertyId === selected.propertyId)
                    .map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-base-300 px-3 py-2"
                      >
                        <span>
                          {money(c.amount)} · {c.status} · {c.reason}
                        </span>
                        {c.status === "requested" ? (
                          <button
                            type="button"
                            className="btn btn-xs btn-neutral"
                            disabled={busy}
                            onClick={() =>
                              void run(
                                "Cash call funded into property bank.",
                                () => fundCashCallAction({ cashCallId: c.id })
                              )
                            }
                          >
                            Fund (demo)
                          </button>
                        ) : null}
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
