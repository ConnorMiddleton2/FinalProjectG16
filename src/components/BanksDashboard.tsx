"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  CONSERVATIVE_MARGIN_RATE,
  seedBankAccounts,
  seedBankTransactions,
  seedOwnerCashCalls,
  type BankAccount,
  type BankTransaction,
  type OwnerCashCall,
} from "@/lib/bank-accounts-shared";
import { money } from "@/lib/money";
import {
  fundCashCallAction,
  provisionBankAccountsAction,
  queueResidualAction,
  remitOwnerAction,
  requestCashCallAction,
  runMonthlyFeeSweepAction,
} from "@/app/ops/banks/actions";

export function BanksDashboard() {
  const {
    items: accounts,
    loading,
    error,
    refresh,
  } = useSharedCollection<BankAccount>(
    COLLECTIONS.bankAccounts,
    seedBankAccounts
  );
  const { items: txns } = useSharedCollection<BankTransaction>(
    COLLECTIONS.bankTransactions,
    seedBankTransactions
  );
  const { items: cashCalls, refresh: refreshCalls } =
    useSharedCollection<OwnerCashCall>(
      COLLECTIONS.ownerCashCalls,
      seedOwnerCashCalls
    );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [cashReason, setCashReason] = useState("");

  useEffect(() => {
    void (async () => {
      await provisionBankAccountsAction();
      await refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(
    () =>
      [...accounts].sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "corporate" ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [accounts]
  );

  const selected =
    accounts.find((a) => a.id === selectedId) ?? sorted[0] ?? null;

  const selectedTxns = useMemo(
    () =>
      txns
        .filter((t) => t.accountId === selected?.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 40),
    [txns, selected?.id]
  );

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
      await refresh();
      await refreshCalls();
    } finally {
      setBusy(false);
    }
  }

  const totalCash = accounts.reduce((s, a) => s + (a.balance || 0), 0);

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
            Conservative margin held before owner remits:{" "}
            {(CONSERVATIVE_MARGIN_RATE * 100).toFixed(0)}% of rent roll + unpaid
            AP.
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            Portfolio cash {money(totalCash)}
          </p>
        </div>
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
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Kind</th>
                <th>Balance</th>
                <th>Reserved</th>
                <th>Pending owner</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="opacity-60">
                    Loading bank accounts…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="opacity-60">
                    No accounts yet — sync from properties.
                  </td>
                </tr>
              ) : (
                sorted.map((a) => (
                  <tr
                    key={a.id}
                    className={`cursor-pointer ${selected?.id === a.id ? "bg-[var(--harbor-deep)]/8" : ""}`}
                    onClick={() => setSelectedId(a.id)}
                  >
                    <td>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs opacity-55">
                        {a.ownerName || a.ownerEmail || "—"}
                      </p>
                    </td>
                    <td className="text-sm capitalize">{a.kind}</td>
                    <td className="tabular-nums">{money(a.balance)}</td>
                    <td className="tabular-nums">{money(a.reservedBalance)}</td>
                    <td className="tabular-nums">
                      {money(a.pendingOwnerRemit)}
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
                {selected.propertyName || "Corporate"} · Balance{" "}
                {money(selected.balance)}
              </p>
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
              <p className="mb-2 text-sm font-semibold">Recent ledger</p>
              {selectedTxns.length === 0 ? (
                <p className="text-sm opacity-60">No transactions yet.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-xl border border-base-300">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Kind</th>
                        <th>Memo</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTxns.map((t) => (
                        <tr key={t.id}>
                          <td className="whitespace-nowrap text-xs">
                            {t.createdAt.slice(0, 16).replace("T", " ")}
                          </td>
                          <td className="text-xs">{t.kind}</td>
                          <td className="text-xs">{t.memo}</td>
                          <td
                            className={`tabular-nums text-xs ${
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
                              void run("Cash call funded into property bank.", () =>
                                fundCashCallAction({ cashCallId: c.id })
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
