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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [contractForm, setContractForm] = useState(emptyTenantContract());
  const [invoiceForm, setInvoiceForm] = useState(emptyTenantInvoice());
  const [showContractForm, setShowContractForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  /** Look up lease billing by the email used on the application / lease. */
  const [billingEmail, setBillingEmail] = useState("");

  const normalizedBillingEmail = billingEmail.trim().toLowerCase();

  const myContracts = useMemo(() => {
    if (!normalizedBillingEmail) return [];
    return contracts.filter(
      (c) => (c.tenantEmail || "").toLowerCase() === normalizedBillingEmail
    );
  }, [contracts, normalizedBillingEmail]);

  const myInvoices = useMemo(() => {
    if (!normalizedBillingEmail) return [];
    return invoices.filter(
      (inv) => (inv.tenantEmail || "").toLowerCase() === normalizedBillingEmail
    );
  }, [invoices, normalizedBillingEmail]);

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
        } else if (!property) {
          setProperty("Pier 12 · Suite 305");
        }
      } catch {
        if (!property) setProperty("Pier 12 · Suite 305");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const propertyOptions = useMemo(() => {
    const names = managedProperties
      .map((p) => p.propertyName)
      .filter(Boolean);
    const fallback = [
      "Pier 12 · Suite 305",
      "Canal Yard · Unit A",
      "Harbor Court · Floor 3",
      "Wharf East · Retail Bay 4",
    ];
    return Array.from(new Set([...names, ...fallback]));
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
    const next: Application = {
      id: crypto.randomUUID(),
      property,
      name: name.trim() || "Applicant",
      email: email.trim() || "not provided",
      notes: notes.trim(),
      status: "Submitted",
      createdAt: new Date().toLocaleDateString(),
    };
    try {
      await saveApplication(next);
      setName("");
      setEmail("");
      setNotes("");
      setSavedMsg(
        "Application saved to the shared team database. Harborline will follow up shortly."
      );
      setTimeout(() => setSavedMsg(null), 4000);
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
      tenantEmail:
        contractForm.tenantEmail || normalizedBillingEmail || undefined,
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
      tenantEmail:
        invoiceForm.tenantEmail || normalizedBillingEmail || undefined,
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
                  value={property}
                  onChange={(e) => setProperty(e.target.value)}
                >
                  {propertyOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setBillingEmail(e.target.value);
                  }}
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
            <label className="form-control max-w-md">
              <span className="label-text mb-1">
                Your lease email (shows your unit rent)
              </span>
              <input
                type="email"
                className="input input-bordered w-full"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="tenant.grandview.1@harborline.example"
              />
            </label>
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
            ) : myContracts.length === 0 ? (
              <p className="text-sm opacity-60">
                No contracts match this email yet.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {myContracts.map((c) => (
                  <article
                    key={c.id}
                    className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 p-5 shadow-sm"
                  >
                    <p className="font-semibold text-lg">{c.property}</p>
                    {c.unit ? (
                      <p className="text-sm opacity-70">Unit {c.unit}</p>
                    ) : null}
                    <p className="mt-1 text-sm opacity-70">{c.term}</p>
                    <p className="mt-3 text-sm">
                      Monthly rent: <strong>${c.rent}</strong>
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
            <label className="form-control max-w-md">
              <span className="label-text mb-1">
                Your lease email (shows invoices at your unit rent)
              </span>
              <input
                type="email"
                className="input input-bordered w-full"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                placeholder="tenant.grandview.1@harborline.example"
              />
            </label>
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
                      <th>Unit</th>
                      <th>Amount</th>
                      <th>Due</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="opacity-60">
                          No invoices match this email yet.
                        </td>
                      </tr>
                    ) : (
                      myInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td>{inv.label}</td>
                          <td>{inv.unit || "—"}</td>
                          <td>${inv.amount}</td>
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
    </div>
  );
}
