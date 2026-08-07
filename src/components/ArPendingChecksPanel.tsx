"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Banknote, CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import {
  approvePendingCheckPaymentAction,
  declinePendingCheckPaymentAction,
} from "@/app/ops/ar/actions";
import { useSharedCollection } from "@/hooks/useSharedCollection";
import { COLLECTIONS } from "@/lib/shared-store";
import type { PendingCheckPayment } from "@/lib/pending-check-payments";

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function ArPendingChecksPanel() {
  const { items, loading, refresh } = useSharedCollection<PendingCheckPayment>(
    COLLECTIONS.pendingCheckPayments
  );
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const awaiting = items
    .filter((p) => p.status === "pending_ar")
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  const recent = items
    .filter((p) => p.status !== "pending_ar")
    .sort((a, b) => (b.reviewedAt || "").localeCompare(a.reviewedAt || ""))
    .slice(0, 8);

  const run = useCallback(
    (fn: () => Promise<void>) => {
      setMessage(null);
      setError(null);
      startTransition(() => {
        void fn();
      });
    },
    []
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section
      className="rounded-2xl border border-[var(--harbor-deep)]/15 bg-white/90 p-5 shadow-sm"
      aria-labelledby="ar-pending-checks-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="ar-pending-checks-heading"
            className="text-lg font-semibold text-[var(--harbor-ink)]"
          >
            Pending tenant checks
          </h2>
          <p className="mt-1 text-sm text-[var(--harbor-muted)]">
            Tenants confirmed they mailed or handed a check. Approve to deposit
            funds to the property bank and clear rent AR — or decline to notify
            the tenant.
          </p>
        </div>
        <span className="badge badge-lg">
          {awaiting.length} awaiting approval
        </span>
      </div>

      {message ? (
        <p
          className="mt-4 rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-sm text-[var(--harbor-ink)]"
          role="status"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-[var(--harbor-muted)]">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          Loading…
        </p>
      ) : awaiting.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-[var(--harbor-deep)]/20 bg-[var(--harbor-sand)]/40 px-4 py-6 text-sm text-[var(--harbor-muted)]">
          No check payments waiting for A/R review.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {awaiting.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-amber-300/50 bg-amber-50/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-semibold text-[var(--harbor-ink)]">
                    <Banknote className="h-4 w-4" aria-hidden />
                    {p.tenantName} · {money(p.amount)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--harbor-ink)]/70">
                    {p.propertyName}
                    {p.unit ? ` · ${p.unit}` : ""} · Check{" "}
                    {p.delivery === "mailed" ? "mailed" : "handed to management"}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--harbor-muted)]">
                    Submitted {new Date(p.submittedAt).toLocaleString()} ·{" "}
                    {p.tenantEmail}
                  </p>
                </div>
                <span className="badge badge-warning">Pending A/R</span>
              </div>
              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-xs font-medium text-[var(--harbor-muted)]">
                  Review notes (optional)
                </span>
                <input
                  className="input input-bordered input-sm w-full bg-white"
                  value={notes[p.id] || ""}
                  onChange={(e) =>
                    setNotes((prev) => ({ ...prev, [p.id]: e.target.value }))
                  }
                  placeholder="Visible to the tenant if declined"
                />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-neutral btn-sm gap-1"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      const result = await approvePendingCheckPaymentAction({
                        pendingId: p.id,
                        notes: notes[p.id],
                      });
                      if (result && "error" in result && result.error) {
                        setError(result.error);
                        return;
                      }
                      setMessage(
                        `Approved ${money(p.amount)} for ${p.tenantName}. Bank deposited${
                          result && "confirmationNumber" in result
                            ? ` · ${result.confirmationNumber}`
                            : ""
                        }.`
                      );
                      await refresh();
                    })
                  }
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Approve &amp; deposit
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm gap-1 border-rose-300 text-rose-800"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      const result = await declinePendingCheckPaymentAction({
                        pendingId: p.id,
                        notes: notes[p.id],
                      });
                      if (result && "error" in result && result.error) {
                        setError(result.error);
                        return;
                      }
                      setMessage(`Declined check from ${p.tenantName}. Tenant notified.`);
                      await refresh();
                    })
                  }
                >
                  <XCircle className="h-4 w-4" aria-hidden />
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {recent.length > 0 ? (
        <div className="mt-6 border-t border-[var(--harbor-deep)]/10 pt-4">
          <h3 className="text-sm font-semibold text-[var(--harbor-ink)]">
            Recently reviewed
          </h3>
          <ul className="mt-2 divide-y divide-[var(--harbor-deep)]/10">
            {recent.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span>
                  {p.tenantName} · {money(p.amount)} · {p.propertyName}
                </span>
                <span
                  className={`badge badge-sm ${
                    p.status === "approved" ? "badge-success" : "badge-error"
                  }`}
                >
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
