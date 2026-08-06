"use client";

import { useEffect, useMemo, useState } from "react";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import type {
  AdditionalCharge,
  AdditionalChargeKind,
} from "@/lib/portal/charges-types";
import {
  listAdditionalCharges,
  payAdditionalCharge,
} from "@/lib/portal/services/chargesService";

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function kindLabel(kind: AdditionalChargeKind) {
  if (kind === "cam") return "Common area maintenance";
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export function AdditionalChargesPage() {
  const [charges, setCharges] = useState<AdditionalCharge[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "paid">("all");

  async function reload() {
    setStatus("loading");
    const result = await listAdditionalCharges();
    if (!result.ok) {
      setError(result.error.message);
      setStatus("error");
      return;
    }
    setCharges(result.data);
    setStatus("ready");
  }

  useEffect(() => {
    void reload();
  }, []);

  const visible = useMemo(() => {
    if (filter === "all") return charges;
    if (filter === "open")
      return charges.filter((c) => c.status === "open" || c.status === "partial");
    return charges.filter((c) => c.status === "paid");
  }, [charges, filter]);

  const openTotal = useMemo(
    () =>
      charges
        .filter((c) => c.status !== "paid")
        .reduce((sum, c) => sum + c.amount, 0),
    [charges]
  );

  async function onPay(chargeId: string) {
    setPayingId(chargeId);
    setMessage(null);
    setError(null);
    const result = await payAdditionalCharge(chargeId);
    setPayingId(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMessage(`Paid ${result.data.label} (${money(result.data.amount)}).`);
    await reload();
  }

  return (
    <div className="space-y-6">
      <PortalCard className="space-y-3">
        <h2 className="portal-section-title">
          Utilities, common area maintenance &amp; fees
        </h2>
        <p className="text-sm text-[var(--harbor-muted)]">
          Charges beyond base rent — utilities, common area maintenance,
          parking, and amenity fees for personal and commercial leases.
        </p>
        <p className="text-lg font-semibold text-[var(--harbor-ink)]">
          Open balance: {money(openTotal)}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter charges">
          {(
            [
              { id: "all", label: "All" },
              { id: "open", label: "Open" },
              { id: "paid", label: "Paid" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              className={`min-h-11 rounded-xl border px-3 text-sm font-medium portal-focus ${
                filter === option.id
                  ? "border-[var(--harbor-ink)] bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                  : "border-[var(--harbor-deep)]/15 bg-white"
              }`}
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </PortalCard>

      {status === "loading" ? (
        <p className="text-sm text-[var(--harbor-muted)]" role="status">
          Loading charges...
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-[var(--harbor-ink)]" role="status">
          {message}
        </p>
      ) : null}

      {status === "ready" ? (
        <ul className="space-y-3">
          {visible.length === 0 ? (
            <li className="portal-empty">No charges in this filter.</li>
          ) : null}
          {visible.map((charge) => (
            <li key={charge.id}>
              <PortalCard className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--harbor-ink)]">
                      {charge.label}
                    </p>
                    <p className="mt-1 text-sm text-[var(--harbor-muted)]">
                      {kindLabel(charge.kind)} · {charge.periodLabel} ·{" "}
                      {charge.occupancyClass}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl text-[var(--harbor-ink)]">
                      {money(charge.amount)}
                    </p>
                    <PortalStatusBadge
                      tone={charge.status === "paid" ? "success" : "warning"}
                    >
                      {charge.status}
                    </PortalStatusBadge>
                  </div>
                </div>
                <p className="text-sm text-[var(--harbor-ink)]">
                  {charge.description}
                </p>
                <p className="text-xs text-[var(--harbor-muted)]">
                  Due {charge.dueDate}
                </p>
                {charge.status !== "paid" ? (
                  <button
                    type="button"
                    className="portal-btn portal-btn-primary portal-focus"
                    disabled={payingId === charge.id}
                    onClick={() => void onPay(charge.id)}
                  >
                    {payingId === charge.id
                      ? "Processing..."
                      : `Pay ${money(charge.amount)}`}
                  </button>
                ) : null}
              </PortalCard>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
