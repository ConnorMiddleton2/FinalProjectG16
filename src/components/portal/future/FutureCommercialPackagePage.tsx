"use client";

import { FormEvent, useEffect, useState } from "react";
import { RequireFutureApplicant } from "@/components/portal/future/RequireFutureApplicant";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalField } from "@/components/portal/PortalField";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import type { PortalTenantSession } from "@/lib/portal/auth";
import type {
  CommercialPackage,
  SalesReportingFrequency,
} from "@/lib/portal/future/commercial-package-types";
import {
  getCommercialPackage,
  recordSalesReport,
  saveCommercialPackage,
  submitCommercialPackage,
} from "@/lib/portal/future/services";

function toneForStatus(status: CommercialPackage["status"]) {
  if (status === "accepted") return "success" as const;
  if (status === "needs_revision") return "warning" as const;
  if (status === "under_review" || status === "submitted") return "info" as const;
  return "neutral" as const;
}

function CommercialInner({ session }: { session: PortalTenantSession }) {
  const [pkg, setPkg] = useState<CommercialPackage | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [salesPeriod, setSalesPeriod] = useState("");
  const [salesAmount, setSalesAmount] = useState("");

  async function reload() {
    setStatus("loading");
    const result = await getCommercialPackage(session.userId);
    if (!result.ok) {
      setError(result.error.message);
      setStatus("error");
      return;
    }
    setPkg(result.data);
    setStatus("ready");
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.userId]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!pkg) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await saveCommercialPackage(session.userId, {
      businessName: pkg.businessName,
      dbaName: pkg.dbaName,
      naicsCode: pkg.naicsCode,
      useClause: pkg.useClause,
      exclusiveUse: pkg.exclusiveUse,
      tiAllowanceLabel: pkg.tiAllowanceLabel,
      tiNotes: pkg.tiNotes,
      tiRequestedAmount: pkg.tiRequestedAmount,
      guarantorRequired: pkg.guarantorRequired,
      guarantor: pkg.guarantor,
      salesReportingRequired: pkg.salesReportingRequired,
      salesReportingFrequency: pkg.salesReportingFrequency,
      percentageRentRate: pkg.percentageRentRate,
      salesBreakpointLabel: pkg.salesBreakpointLabel,
      lastSalesReportPeriod: pkg.lastSalesReportPeriod,
      lastSalesReportAmount: pkg.lastSalesReportAmount,
      notes: pkg.notes,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPkg(result.data);
    setMessage("Commercial package saved.");
  }

  async function onSubmit() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await submitCommercialPackage(session.userId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPkg(result.data);
    setMessage("Commercial package submitted to Harborline leasing.");
  }

  async function onSalesReport(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await recordSalesReport(session.userId, {
      periodLabel: salesPeriod,
      amountLabel: salesAmount,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPkg(result.data);
    setSalesPeriod("");
    setSalesAmount("");
    setMessage(
      `Sales report recorded: ${result.data.lastSalesReportPeriod} · ${result.data.lastSalesReportAmount}.`
    );
  }

  if (status === "loading") {
    return (
      <p className="text-sm text-[var(--harbor-muted)]" role="status">
        Loading commercial package...
      </p>
    );
  }
  if (status === "error" || !pkg) {
    return (
      <p className="text-sm text-error" role="alert">
        {error ?? "Could not load commercial package."}
      </p>
    );
  }

  const locked = pkg.status === "accepted";

  return (
    <div className="space-y-6">
      <PortalCard className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="portal-section-title">Commercial leasing package</h2>
            <p className="mt-1 text-sm text-[var(--harbor-muted)]">
              Capture permitted use, tenant improvement allowance, guarantor
              details, and retail sales reporting for Harborline commercial
              suites.
            </p>
          </div>
          <PortalStatusBadge tone={toneForStatus(pkg.status)}>
            {pkg.status.replace(/_/g, " ")}
          </PortalStatusBadge>
        </div>
      </PortalCard>

      <PortalCard as="form" onSubmit={onSave} className="space-y-4">
        <h2 className="portal-section-title">Business identity</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <PortalField
            label="Legal business name"
            required
            value={pkg.businessName}
            disabled={locked}
            onChange={(e) =>
              setPkg((p) => (p ? { ...p, businessName: e.target.value } : p))
            }
          />
          <PortalField
            label="Doing business as / trade name"
            value={pkg.dbaName}
            disabled={locked}
            onChange={(e) =>
              setPkg((p) => (p ? { ...p, dbaName: e.target.value } : p))
            }
          />
          <PortalField
            label="Industry classification code"
            value={pkg.naicsCode}
            disabled={locked}
            onChange={(e) =>
              setPkg((p) => (p ? { ...p, naicsCode: e.target.value } : p))
            }
            placeholder="722511"
            hint="North American Industry Classification System code for your business type"
          />
        </div>

        <h2 className="portal-section-title">Use clause</h2>
        <PortalField
          as="textarea"
          label="Permitted use"
          required
          rows={4}
          value={pkg.useClause}
          disabled={locked}
          onChange={(e) =>
            setPkg((p) => (p ? { ...p, useClause: e.target.value } : p))
          }
          placeholder="Retail sale of apparel and related accessories; no food service."
        />
        <PortalField
          as="textarea"
          label="Exclusive use (if any)"
          rows={2}
          value={pkg.exclusiveUse}
          disabled={locked}
          onChange={(e) =>
            setPkg((p) => (p ? { ...p, exclusiveUse: e.target.value } : p))
          }
          placeholder="Exclusive right to operate a specialty coffee retail concept on Level 1."
        />

        <h2 className="portal-section-title">Tenant improvement allowance</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <PortalField
            label="Offered tenant improvement allowance"
            value={pkg.tiAllowanceLabel}
            disabled={locked}
            onChange={(e) =>
              setPkg((p) =>
                p ? { ...p, tiAllowanceLabel: e.target.value } : p
              )
            }
          />
          <PortalField
            label="Requested tenant improvement amount"
            value={pkg.tiRequestedAmount}
            disabled={locked}
            onChange={(e) =>
              setPkg((p) =>
                p ? { ...p, tiRequestedAmount: e.target.value } : p
              )
            }
            placeholder="$48,000"
          />
        </div>
        <PortalField
          as="textarea"
          label="Tenant improvement scope notes"
          rows={3}
          value={pkg.tiNotes}
          disabled={locked}
          onChange={(e) =>
            setPkg((p) => (p ? { ...p, tiNotes: e.target.value } : p))
          }
          placeholder="Storefront glass, demising wall, heating and cooling redistribution..."
        />

        <h2 className="portal-section-title">Guarantor</h2>
        <label className="flex items-start gap-3 text-sm text-[var(--harbor-ink)]">
          <input
            type="checkbox"
            className="portal-native-checkbox"
            checked={pkg.guarantorRequired}
            disabled={locked}
            onChange={(e) =>
              setPkg((p) =>
                p ? { ...p, guarantorRequired: e.target.checked } : p
              )
            }
          />
          <span>This commercial lease requires a personal or corporate guarantor.</span>
        </label>
        {pkg.guarantorRequired ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <PortalField
              label="Guarantor name"
              required
              value={pkg.guarantor.fullName}
              disabled={locked}
              onChange={(e) =>
                setPkg((p) =>
                  p
                    ? {
                        ...p,
                        guarantor: {
                          ...p.guarantor,
                          fullName: e.target.value,
                        },
                      }
                    : p
                )
              }
            />
            <PortalField
              label="Guarantor email"
              type="email"
              required
              value={pkg.guarantor.email}
              disabled={locked}
              onChange={(e) =>
                setPkg((p) =>
                  p
                    ? {
                        ...p,
                        guarantor: { ...p.guarantor, email: e.target.value },
                      }
                    : p
                )
              }
            />
            <PortalField
              label="Guarantor phone"
              type="tel"
              value={pkg.guarantor.phone}
              disabled={locked}
              onChange={(e) =>
                setPkg((p) =>
                  p
                    ? {
                        ...p,
                        guarantor: { ...p.guarantor, phone: e.target.value },
                      }
                    : p
                )
              }
            />
            <PortalField
              label="Relationship"
              value={pkg.guarantor.relationship}
              disabled={locked}
              onChange={(e) =>
                setPkg((p) =>
                  p
                    ? {
                        ...p,
                        guarantor: {
                          ...p.guarantor,
                          relationship: e.target.value,
                        },
                      }
                    : p
                )
              }
            />
            <PortalField
              label="Guaranteed amount"
              value={pkg.guarantor.guaranteedAmountLabel}
              disabled={locked}
              onChange={(e) =>
                setPkg((p) =>
                  p
                    ? {
                        ...p,
                        guarantor: {
                          ...p.guarantor,
                          guaranteedAmountLabel: e.target.value,
                        },
                      }
                    : p
                )
              }
              placeholder="Full lease obligations"
              className="sm:col-span-2"
            />
          </div>
        ) : null}

        <h2 className="portal-section-title">Sales reporting (retail)</h2>
        <label className="flex items-start gap-3 text-sm text-[var(--harbor-ink)]">
          <input
            type="checkbox"
            className="portal-native-checkbox"
            checked={pkg.salesReportingRequired}
            disabled={locked}
            onChange={(e) =>
              setPkg((p) =>
                p
                  ? {
                      ...p,
                      salesReportingRequired: e.target.checked,
                      salesReportingFrequency: e.target.checked
                        ? p.salesReportingFrequency === "not_required"
                          ? "monthly"
                          : p.salesReportingFrequency
                        : "not_required",
                    }
                  : p
              )
            }
          />
          <span>
            Percentage rent applies — tenant must report gross sales on schedule.
          </span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <PortalField
            label="Reporting frequency"
            as="select"
            value={pkg.salesReportingFrequency}
            disabled={locked || !pkg.salesReportingRequired}
            onChange={(e) =>
              setPkg((p) =>
                p
                  ? {
                      ...p,
                      salesReportingFrequency: e.target
                        .value as SalesReportingFrequency,
                    }
                  : p
              )
            }
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
            <option value="not_required">Not required</option>
          </PortalField>
          <PortalField
            label="Percentage rent rate"
            value={pkg.percentageRentRate}
            disabled={locked || !pkg.salesReportingRequired}
            onChange={(e) =>
              setPkg((p) =>
                p ? { ...p, percentageRentRate: e.target.value } : p
              )
            }
          />
          <PortalField
            label="Sales breakpoint"
            value={pkg.salesBreakpointLabel}
            disabled={locked || !pkg.salesReportingRequired}
            onChange={(e) =>
              setPkg((p) =>
                p ? { ...p, salesBreakpointLabel: e.target.value } : p
              )
            }
            className="sm:col-span-2"
          />
        </div>

        <PortalField
          as="textarea"
          label="Additional notes for leasing"
          rows={3}
          value={pkg.notes}
          disabled={locked}
          onChange={(e) =>
            setPkg((p) => (p ? { ...p, notes: e.target.value } : p))
          }
        />

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

        {!locked ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="portal-btn portal-btn-secondary portal-focus"
              disabled={busy}
            >
              {busy ? "Saving..." : "Save package"}
            </button>
            <button
              type="button"
              className="portal-btn portal-btn-primary portal-focus"
              disabled={busy}
              onClick={() => void onSubmit()}
            >
              {busy ? "Submitting..." : "Submit to leasing"}
            </button>
          </div>
        ) : null}
      </PortalCard>

      {pkg.salesReportingRequired ? (
        <PortalCard as="form" onSubmit={onSalesReport} className="space-y-4">
          <h2 className="portal-section-title">Record a sales report</h2>
          <p className="text-sm text-[var(--harbor-muted)]">
            Demo flow for retail percentage-rent reporting. Last filed:{" "}
            {pkg.lastSalesReportPeriod
              ? `${pkg.lastSalesReportPeriod} · ${pkg.lastSalesReportAmount}`
              : "none yet"}
            .
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <PortalField
              label="Period"
              required
              value={salesPeriod}
              onChange={(e) => setSalesPeriod(e.target.value)}
              placeholder="July 2026"
            />
            <PortalField
              label="Gross sales"
              required
              value={salesAmount}
              onChange={(e) => setSalesAmount(e.target.value)}
              placeholder="$38,250"
            />
          </div>
          <button
            type="submit"
            className="portal-btn portal-btn-primary portal-focus"
            disabled={busy}
          >
            {busy ? "Recording..." : "Submit sales report"}
          </button>
        </PortalCard>
      ) : null}
    </div>
  );
}

export function FutureCommercialPackagePage() {
  return (
    <RequireFutureApplicant>
      {(session) => <CommercialInner session={session} />}
    </RequireFutureApplicant>
  );
}
