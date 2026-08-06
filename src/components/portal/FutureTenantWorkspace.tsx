"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  FileText,
  PlusCircle,
  Receipt,
  ScrollText,
} from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import { createClient } from "@/lib/supabase/client";
import { listSharedRecords } from "@/lib/shared-store";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  emptyTenantContract,
  emptyTenantInvoice,
  seedTenantContracts,
  seedTenantInvoices,
  type TenantContract,
  type TenantInvoice,
} from "@/lib/portal-records";

type Tab = "apply" | "contracts" | "billing";

type Application = {
  id: string;
  property: string;
  name: string;
  email: string;
  notes: string;
  status: "Submitted" | "In review";
  createdAt: string;
  unit?: string;
  monthlyRent?: string;
  propertyId?: string;
  building?: string;
  roomSize?: string;
  smStatus?: "new";
};

export function FutureTenantWorkspace() {
  const [tab, setTab] = useState<Tab>("apply");
  const {
    items: applications,
    saveOne: saveApplication,
    loading,
    error,
  } = useSharedCollection<Application>(COLLECTIONS.tenantApplications);
  const {
    items: contracts,
    saveOne: saveContract,
    loading: contractsLoading,
    error: contractsError,
  } = useSharedCollection<TenantContract>(
    COLLECTIONS.tenantContracts,
    seedTenantContracts
  );
  const {
    items: invoices,
    saveOne: saveInvoice,
    loading: invoicesLoading,
    error: invoicesError,
  } = useSharedCollection<TenantInvoice>(
    COLLECTIONS.tenantInvoices,
    seedTenantInvoices
  );

  const [managedProperties, setManagedProperties] = useState<
    ManagementContractDraft[]
  >([]);
  const [property, setProperty] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [unit, setUnit] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [contractForm, setContractForm] = useState(emptyTenantContract());
  const [invoiceForm, setInvoiceForm] = useState(emptyTenantInvoice());
  const [showContractForm, setShowContractForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const supabase = createClient();
        const rows = await listSharedRecords<ManagementContractDraft>(
          supabase,
          COLLECTIONS.managedProperties
        );
        setManagedProperties(rows);
        if (!property && rows[0]?.propertyName) {
          setProperty(rows[0].propertyName);
          setPropertyId(rows[0].id);
        } else if (!property) {
          setProperty("Pier 12 Commerce Center");
        }
      } catch {
        if (!property) setProperty("Pier 12 Commerce Center");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const propertyOptions = useMemo(() => {
    const fromManaged = managedProperties
      .map((p) => ({ id: p.id, name: p.propertyName }))
      .filter((p) => p.name);
    if (fromManaged.length > 0) return fromManaged;
    return [
      { id: "", name: "Pier 12 Commerce Center" },
      { id: "", name: "Canal Yard" },
      { id: "", name: "Riverbend Commerce Center" },
    ];
  }, [managedProperties]);

  const tabs = useMemo(
    () =>
      [
        { id: "apply" as const, label: "New application", icon: PlusCircle },
        { id: "contracts" as const, label: "Contracts", icon: ScrollText },
        { id: "billing" as const, label: "Billing", icon: Receipt },
      ] as const,
    []
  );

  async function handleApply(e: FormEvent) {
    e.preventDefault();
    const rent = monthlyRent.trim();
    if (!unit.trim()) {
      setSavedMsg("Enter the unit or suite you want to lease.");
      return;
    }
    if (!rent || Number(rent.replace(/[$,\s]/g, "")) <= 0) {
      setSavedMsg("Enter the monthly rent agreed for this unit.");
      return;
    }
    const next: Application = {
      id: crypto.randomUUID(),
      property,
      propertyId: propertyId || undefined,
      building: property,
      unit: unit.trim(),
      roomSize: unit.trim(),
      monthlyRent: rent,
      name: name.trim() || "Applicant",
      email: email.trim() || "not provided",
      notes: notes.trim(),
      status: "Submitted",
      smStatus: "new",
      createdAt: new Date().toLocaleDateString(),
    };
    try {
      await saveApplication(next);
      setName("");
      setEmail("");
      setNotes("");
      setUnit("");
      setMonthlyRent("");
      setSavedMsg(
        "Application saved. Harborline Sales & Marketing will review it; once approved you will appear on the property roster and rent will post to Accounts Receivable."
      );
      setTimeout(() => setSavedMsg(null), 5000);
    } catch (err) {
      setSavedMsg(
        err instanceof Error ? err.message : "Could not save application."
      );
    }
  }

  async function handleAddContract(e: FormEvent) {
    e.preventDefault();
    if (!contractForm.property.trim()) return;
    await saveContract({
      ...contractForm,
      id: crypto.randomUUID(),
      property: contractForm.property.trim(),
    });
    setContractForm(emptyTenantContract());
    setShowContractForm(false);
  }

  async function handleAddInvoice(e: FormEvent) {
    e.preventDefault();
    if (!invoiceForm.label.trim()) return;
    await saveInvoice({
      ...invoiceForm,
      id: crypto.randomUUID(),
      label: invoiceForm.label.trim(),
    });
    setInvoiceForm(emptyTenantInvoice());
    setShowInvoiceForm(false);
  }

  return (
    <div className="space-y-8">
        <div className="flex flex-wrap gap-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`btn gap-2 ${tab === id ? "btn-neutral" : "btn-outline"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "apply" && (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <form
              onSubmit={handleApply}
              className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--harbor-mid)]" />
                <h2 className="text-xl font-semibold">Start a new application</h2>
              </div>
              <label className="form-control w-full">
                <span className="label-text mb-1">Property interest</span>
                <select
                  className="select select-bordered w-full"
                  value={propertyId || property}
                  onChange={(e) => {
                    const opt = propertyOptions.find(
                      (p) => p.id === e.target.value || p.name === e.target.value
                    );
                    setProperty(opt?.name || e.target.value);
                    setPropertyId(opt?.id || "");
                  }}
                >
                  {propertyOptions.map((opt) => (
                    <option key={opt.id || opt.name} value={opt.id || opt.name}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-1">Unit / suite</span>
                <input
                  className="input input-bordered w-full"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Suite 210"
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-1">Monthly rent (USD)</span>
                <input
                  className="input input-bordered w-full"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  placeholder="4850"
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-1">Full name</span>
                <input
                  className="input input-bordered w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Tenant"
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-1">Email</span>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-1">Notes</span>
                <textarea
                  className="textarea textarea-bordered w-full min-h-24"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Desired move-in date, square footage, or questions"
                />
              </label>
              <button type="submit" className="btn btn-neutral">
                Submit application
              </button>
              {savedMsg && (
                <p className="text-sm text-[var(--harbor-mid)]">{savedMsg}</p>
              )}
            </form>

            <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/70 p-6 shadow-sm">
              <h3 className="font-semibold text-lg">Your applications</h3>
              {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
              {loading ? (
                <p className="mt-3 text-sm opacity-60">
                  Loading shared applications…
                </p>
              ) : applications.length === 0 ? (
                <p className="mt-3 text-sm opacity-60">
                  No applications yet. Submit one to see it tracked here for the
                  whole team.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {applications.map((app) => (
                    <li
                      key={app.id}
                      className="rounded-xl border border-base-300 bg-base-100 px-4 py-3"
                    >
                      <p className="font-medium">{app.property}</p>
                      <p className="text-sm opacity-70">
                        {app.name} · {app.createdAt}
                      </p>
                      <span className="badge badge-outline mt-2">
                        {app.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {tab === "contracts" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Current contracts</h2>
              <button
                type="button"
                className="btn btn-outline btn-sm gap-1"
                onClick={() => setShowContractForm((v) => !v)}
              >
                <PlusCircle className="h-4 w-4" />
                {showContractForm ? "Hide" : "Add contract"}
              </button>
            </div>
            {contractsError && (
              <p className="text-sm text-red-700">{contractsError}</p>
            )}
            {showContractForm && (
              <form
                onSubmit={handleAddContract}
                className="grid gap-2 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 sm:grid-cols-2"
              >
                <input
                  className="input input-bordered input-sm"
                  placeholder="Property"
                  value={contractForm.property}
                  onChange={(e) =>
                    setContractForm((f) => ({ ...f, property: e.target.value }))
                  }
                  required
                />
                <input
                  className="input input-bordered input-sm"
                  placeholder="Term"
                  value={contractForm.term}
                  onChange={(e) =>
                    setContractForm((f) => ({ ...f, term: e.target.value }))
                  }
                />
                <input
                  className="input input-bordered input-sm"
                  placeholder="Rent"
                  value={contractForm.rent}
                  onChange={(e) =>
                    setContractForm((f) => ({ ...f, rent: e.target.value }))
                  }
                />
                <select
                  className="select select-bordered select-sm"
                  value={contractForm.status}
                  onChange={(e) =>
                    setContractForm((f) => ({
                      ...f,
                      status: e.target.value as TenantContract["status"],
                    }))
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Renewal pending">Renewal pending</option>
                </select>
                <button type="submit" className="btn btn-neutral btn-sm">
                  Save to shared database
                </button>
              </form>
            )}
            {contractsLoading ? (
              <p className="text-sm opacity-60">Loading shared contracts…</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {contracts.map((c) => (
                  <article
                    key={c.id}
                    className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5 shadow-sm"
                  >
                    <p className="font-semibold text-lg">{c.property}</p>
                    <p className="mt-1 text-sm opacity-70">{c.term}</p>
                    <p className="mt-3 text-sm">
                      Rent: <strong>{c.rent}</strong>
                    </p>
                    <span
                      className={`badge mt-3 ${
                        c.status === "Active"
                          ? "badge-success"
                          : "badge-warning"
                      }`}
                    >
                      {c.status}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "billing" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Billing</h2>
              <button
                type="button"
                className="btn btn-outline btn-sm gap-1"
                onClick={() => setShowInvoiceForm((v) => !v)}
              >
                <PlusCircle className="h-4 w-4" />
                {showInvoiceForm ? "Hide" : "Add invoice"}
              </button>
            </div>
            {invoicesError && (
              <p className="text-sm text-red-700">{invoicesError}</p>
            )}
            {showInvoiceForm && (
              <form
                onSubmit={handleAddInvoice}
                className="grid gap-2 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4 sm:grid-cols-2"
              >
                <input
                  className="input input-bordered input-sm"
                  placeholder="Label"
                  value={invoiceForm.label}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({ ...f, label: e.target.value }))
                  }
                  required
                />
                <input
                  className="input input-bordered input-sm"
                  placeholder="Amount"
                  value={invoiceForm.amount}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({ ...f, amount: e.target.value }))
                  }
                />
                <input
                  className="input input-bordered input-sm"
                  placeholder="Due date"
                  value={invoiceForm.due}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({ ...f, due: e.target.value }))
                  }
                />
                <select
                  className="select select-bordered select-sm"
                  value={invoiceForm.status}
                  onChange={(e) =>
                    setInvoiceForm((f) => ({
                      ...f,
                      status: e.target.value as TenantInvoice["status"],
                    }))
                  }
                >
                  <option value="Paid">Paid</option>
                  <option value="Due">Due</option>
                  <option value="Overdue">Overdue</option>
                </select>
                <button type="submit" className="btn btn-neutral btn-sm">
                  Save to shared database
                </button>
              </form>
            )}
            {invoicesLoading ? (
              <p className="text-sm opacity-60">Loading shared billing…</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 shadow-sm">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Amount</th>
                      <th>Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td>{inv.label}</td>
                        <td>{inv.amount}</td>
                        <td>{inv.due}</td>
                        <td>
                          <span
                            className={`badge ${
                              inv.status === "Paid"
                                ? "badge-success"
                                : inv.status === "Due"
                                  ? "badge-info"
                                  : "badge-error"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
    </div>
  );
}
