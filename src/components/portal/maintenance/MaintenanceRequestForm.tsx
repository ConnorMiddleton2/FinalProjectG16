"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import {
  portalSubmitWorkOrder,
  type PortalWorkOrderInput,
} from "@/app/portal/maintenance-actions";
import {
  WORK_ORDER_CATEGORIES,
  WORK_ORDER_PRIORITIES,
  type WorkOrderCategory,
  type WorkOrderPriority,
} from "@/lib/maintenance";

type Props = {
  propertyName: string;
  unit: string;
  tenantName: string;
};

type FormState = {
  title: string;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  description: string;
};

type SubmitResult = {
  id: string;
  requestNumber: string;
  submittedAt: string;
  title: string;
  property: string;
  unit: string;
};

const initialForm: FormState = {
  title: "",
  category: "general",
  priority: "normal",
  description: "",
};

export function MaintenanceRequestForm({
  propertyName,
  unit,
  tenantName,
}: Props) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, startTransition] = useTransition();

  const propertyLocked = Boolean(propertyName);
  const unitLabel = unit || "—";
  const locationLabel = [propertyName, unit].filter(Boolean).join(" · ");

  const canSubmit = useMemo(
    () =>
      Boolean(form.title.trim() && form.description.trim() && propertyLocked),
    [form.title, form.description, propertyLocked]
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!propertyLocked) {
      setError(
        "Your account is not linked to a leased property yet. Contact CPMC or finish lease activation first."
      );
      return;
    }
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required.");
      return;
    }

    const payload: PortalWorkOrderInput = {
      title: form.title.trim(),
      category: form.category,
      priority: form.priority,
      description: form.description.trim(),
    };

    startTransition(async () => {
      const res = await portalSubmitWorkOrder(payload);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if (!("ok" in res) || !res.ok) {
        setError("Could not submit the work order.");
        return;
      }
      setResult({
        id: res.id,
        requestNumber: res.requestNumber,
        submittedAt: res.submittedAt,
        title: res.order.title,
        property: res.order.property,
        unit: res.order.unit,
      });
    });
  }

  if (result) {
    return (
      <div className="space-y-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-700" />
          <div>
            <h2 className="text-xl font-semibold text-[var(--harbor-ink)]">
              Work order submitted to Management
            </h2>
            <p className="mt-1 text-sm text-[var(--harbor-ink)]/70">
              Maintenance received your request as a pending work order (
              {result.requestNumber}). You can track it here; Management sees
              the same record on their work order ledger.
            </p>
          </div>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="opacity-60">Title</dt>
            <dd className="font-medium">{result.title}</dd>
          </div>
          <div>
            <dt className="opacity-60">Submitted</dt>
            <dd className="font-medium">{result.submittedAt}</dd>
          </div>
          <div>
            <dt className="opacity-60">Property</dt>
            <dd className="font-medium">{result.property}</dd>
          </div>
          <div>
            <dt className="opacity-60">Unit</dt>
            <dd className="font-medium">{result.unit || "—"}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/maintenance" className="btn btn-neutral btn-sm">
            View my requests
          </Link>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setResult(null);
              setForm(initialForm);
              setError(null);
            }}
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EmergencyGuidanceBanner />

      <section className="space-y-4 rounded-2xl border border-[var(--harbor-deep)]/15 bg-[var(--harbor-mist)]/35 p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-mid)]">
            New work order
          </p>
          <h2 className="mt-1 font-display text-2xl tracking-tight text-[var(--harbor-ink)]">
            Request a work order
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--harbor-ink)]/65">
            Submit something to clean, fix, inspect, or otherwise work on.
            Requests are saved to the shared Maintenance work order ledger as
            pending.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--harbor-deep)]/10 pb-2">
              <Wrench className="h-5 w-5 text-[var(--harbor-mid)]" />
              <h3 className="text-lg font-semibold text-[var(--harbor-ink)]">
                Request details
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="form-control w-full sm:col-span-2">
                <span className="mb-1 text-sm opacity-70">Title</span>
                <input
                  className="input input-bordered w-full"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="Fix suite leak / Replace lobby bulb"
                  required
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Category</span>
                <select
                  className="select select-bordered w-full"
                  value={form.category}
                  onChange={(e) =>
                    update("category", e.target.value as WorkOrderCategory)
                  }
                >
                  {WORK_ORDER_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Priority</span>
                <select
                  className="select select-bordered w-full"
                  value={form.priority}
                  onChange={(e) =>
                    update("priority", e.target.value as WorkOrderPriority)
                  }
                >
                  {WORK_ORDER_PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Property</span>
                <input
                  className="input input-bordered w-full bg-[var(--harbor-sand)]/40"
                  value={propertyName || "Not linked yet"}
                  readOnly
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Unit / area</span>
                <input
                  className="input input-bordered w-full bg-[var(--harbor-sand)]/40"
                  value={unitLabel}
                  readOnly
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Submitted by</span>
                <input
                  className="input input-bordered w-full bg-[var(--harbor-sand)]/40"
                  value="Tenant submitted"
                  readOnly
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Requested by</span>
                <input
                  className="input input-bordered w-full bg-[var(--harbor-sand)]/40"
                  value={`${tenantName}${unit ? ` · ${unit}` : ""}`}
                  readOnly
                />
              </label>

              <div className="sm:col-span-2">
                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">
                    Description — what needs to be done?
                  </span>
                  <textarea
                    className="textarea textarea-bordered min-h-28 w-full"
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Describe the cleaning, repair, or inspection needed…"
                    required
                  />
                </label>
              </div>
            </div>
          </div>

          {!propertyLocked ? (
            <p
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
            >
              No leased property is linked to this account yet, so a work order
              cannot be posted to the ledger. Finish lease activation or contact
              CPMC.
            </p>
          ) : (
            <p className="text-xs text-[var(--harbor-muted)]">
              Posting for {locationLabel}. Maintenance will see this as a
              tenant-submitted pending work order.
            </p>
          )}

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="btn btn-neutral"
              disabled={pending || !canSubmit}
            >
              {pending ? "Saving…" : "Submit to Management"}
            </button>
            <Link href="/portal/maintenance" className="btn btn-ghost btn-sm">
              Cancel
            </Link>
            <p className="text-sm text-[var(--harbor-ink)]/55">
              Creates a pending work order on the Maintenance ledger with no
              cost. Staff add costs from invoices or receipts later.
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}

function EmergencyGuidanceBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-950">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">Emergencies</p>
        <p className="mt-0.5 opacity-80">
          For gas leaks, flooding, fire, or immediate danger, call emergency
          services first. Then notify CPMC. Do not wait on this form for
          life-safety issues.
        </p>
      </div>
    </div>
  );
}
