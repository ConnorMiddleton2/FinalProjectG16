"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  FileText,
  PlusCircle,
  Receipt,
  ScrollText,
} from "lucide-react";

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

type Contract = {
  id: string;
  property: string;
  term: string;
  rent: string;
  status: "Active" | "Renewal pending";
};

type Invoice = {
  id: string;
  label: string;
  amount: string;
  due: string;
  status: "Paid" | "Due" | "Overdue";
};

const STORAGE_KEY = "harborline_tenant_applications";

const demoContracts: Contract[] = [
  {
    id: "c1",
    property: "Pier 12 · Suite 210",
    term: "Jan 2026 – Dec 2027",
    rent: "$4,800 / mo",
    status: "Active",
  },
  {
    id: "c2",
    property: "Canal Yard · Unit B",
    term: "Expired · renewal offered",
    rent: "$2,150 / mo",
    status: "Renewal pending",
  },
];

const demoInvoices: Invoice[] = [
  {
    id: "i1",
    label: "April rent · Pier 12",
    amount: "$4,800.00",
    due: "Apr 1, 2026",
    status: "Paid",
  },
  {
    id: "i2",
    label: "May rent · Pier 12",
    amount: "$4,800.00",
    due: "May 1, 2026",
    status: "Due",
  },
  {
    id: "i3",
    label: "Late fee · Canal Yard",
    amount: "$75.00",
    due: "Mar 15, 2026",
    status: "Overdue",
  },
];

export default function TenantPortalPage() {
  const [tab, setTab] = useState<Tab>("apply");
  const [applications, setApplications] = useState<Application[]>([]);
  const [property, setProperty] = useState("Pier 12 · Suite 305");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setApplications(JSON.parse(raw) as Application[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  }, [applications]);

  const tabs = useMemo(
    () =>
      [
        { id: "apply" as const, label: "New application", icon: PlusCircle },
        { id: "contracts" as const, label: "Contracts", icon: ScrollText },
        { id: "billing" as const, label: "Billing", icon: Receipt },
      ] as const,
    []
  );

  function handleApply(e: FormEvent) {
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
    setApplications((prev) => [next, ...prev]);
    setName("");
    setEmail("");
    setNotes("");
    setSavedMsg("Application submitted. Harborline will follow up shortly.");
    setTimeout(() => setSavedMsg(null), 4000);
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f3efe6_0%,#e8f4f6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--harbor-ink)] p-2 text-[var(--harbor-sand)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl leading-tight">Harborline</p>
              <p className="text-xs opacity-60">Tenant portal</p>
            </div>
          </div>
          <Link href="/" className="btn btn-ghost btn-sm gap-1">
            <ArrowLeft className="h-4 w-4" />
            Welcome
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 sm:py-10 space-y-8">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
            Your space, your paperwork, your balance.
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/70">
            Start a property application, review active lease contracts, or check
            billing — all from one tenant dashboard.
          </p>
        </div>

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
                  <option>Pier 12 · Suite 305</option>
                  <option>Canal Yard · Unit A</option>
                  <option>Harbor Court · Floor 3</option>
                  <option>Wharf East · Retail Bay 4</option>
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
              {savedMsg && <p className="text-sm text-[var(--harbor-mid)]">{savedMsg}</p>}
            </form>

            <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/70 p-6 shadow-sm">
              <h3 className="font-semibold text-lg">Your applications</h3>
              {applications.length === 0 ? (
                <p className="mt-3 text-sm opacity-60">
                  No applications yet. Submit one to see it tracked here.
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
                      <span className="badge badge-outline mt-2">{app.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {tab === "contracts" && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Current contracts</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {demoContracts.map((c) => (
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
                      c.status === "Active" ? "badge-success" : "badge-warning"
                    }`}
                  >
                    {c.status}
                  </span>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "billing" && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Billing</h2>
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
                  {demoInvoices.map((inv) => (
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
          </section>
        )}
      </main>
    </div>
  );
}
