"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  LogOut,
  PlusCircle,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import {
  BUDGET_STORAGE_KEY,
  categoryLabel,
  emptyWorkOrder,
  laborLabel,
  seedBudget,
  seedVendors,
  seedWorkOrders,
  sourceLabel,
  statusLabel,
  VENDOR_STORAGE_KEY,
  WORK_ORDER_CATEGORIES,
  WORK_ORDER_STATUSES,
  WORK_ORDER_STORAGE_KEY,
  type BudgetLine,
  type VendorRecord,
  type WorkOrder,
  type WorkOrderCategory,
  type WorkOrderLabor,
  type WorkOrderSource,
  type WorkOrderStatus,
} from "@/lib/maintenance";

type Panel = "new" | "ledger" | "vendors" | "budget";

type Filters = {
  status: WorkOrderStatus | "all";
  source: WorkOrderSource | "all";
  labor: WorkOrderLabor | "all";
  category: WorkOrderCategory | "all";
  property: string;
  dateFrom: string;
  dateTo: string;
};

const defaultFilters: Filters = {
  status: "all",
  source: "all",
  labor: "all",
  category: "all",
  property: "",
  dateFrom: "",
  dateTo: "",
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function money(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function MaintenanceDashboard() {
  const [panel, setPanel] = useState<Panel>("ledger");
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [budget, setBudget] = useState<BudgetLine[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [form, setForm] = useState(emptyWorkOrder);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    lineId: "",
    amount: "",
    note: "",
  });

  useEffect(() => {
    const existingOrders = loadJson<WorkOrder[] | null>(
      WORK_ORDER_STORAGE_KEY,
      null
    );
    const existingVendors = loadJson<VendorRecord[] | null>(
      VENDOR_STORAGE_KEY,
      null
    );
    const existingBudget = loadJson<BudgetLine[] | null>(
      BUDGET_STORAGE_KEY,
      null
    );

    setOrders(existingOrders ?? seedWorkOrders());
    setVendors(existingVendors ?? seedVendors());
    setBudget(existingBudget ?? seedBudget());
  }, []);

  useEffect(() => {
    if (orders.length) {
      localStorage.setItem(WORK_ORDER_STORAGE_KEY, JSON.stringify(orders));
    }
  }, [orders]);

  useEffect(() => {
    if (vendors.length) {
      localStorage.setItem(VENDOR_STORAGE_KEY, JSON.stringify(vendors));
    }
  }, [vendors]);

  useEffect(() => {
    if (budget.length) {
      localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budget));
    }
  }, [budget]);

  const properties = useMemo(() => {
    return Array.from(new Set(orders.map((o) => o.property).filter(Boolean))).sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filters.status !== "all" && o.status !== filters.status) return false;
      if (filters.source !== "all" && o.source !== filters.source) return false;
      if (filters.labor !== "all" && o.labor !== filters.labor) return false;
      if (filters.category !== "all" && o.category !== filters.category)
        return false;
      if (
        filters.property &&
        !o.property.toLowerCase().includes(filters.property.toLowerCase())
      ) {
        return false;
      }
      if (filters.dateFrom && o.createdAt < filters.dateFrom) return false;
      if (filters.dateTo && o.createdAt > filters.dateTo) return false;
      return true;
    });
  }, [orders, filters]);

  const thirdPartyOpen = useMemo(
    () =>
      orders.filter(
        (o) => o.labor === "third_party" && o.status !== "completed"
      ),
    [orders]
  );

  function updateForm<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreateWorkOrder(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.property.trim()) {
      setSavedMsg("Title and property are required.");
      return;
    }

    const next: WorkOrder = {
      ...form,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString().slice(0, 10),
      completedAt:
        form.status === "completed"
          ? form.completedAt || new Date().toISOString().slice(0, 10)
          : "",
    };

    setOrders((prev) => [next, ...prev]);
    setForm(emptyWorkOrder());
    setSavedMsg("Work order created.");
    setPanel("ledger");
    setTimeout(() => setSavedMsg(null), 3000);
  }

  function updateOrderStatus(id: string, status: WorkOrderStatus) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              status,
              completedAt:
                status === "completed"
                  ? o.completedAt || new Date().toISOString().slice(0, 10)
                  : "",
            }
          : o
      )
    );
  }

  function addVendor(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const next: VendorRecord = {
      id: crypto.randomUUID(),
      name: String(data.get("name") ?? "").trim(),
      specialty: String(data.get("specialty") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      notes: String(data.get("notes") ?? "").trim(),
    };
    if (!next.name) return;
    setVendors((prev) => [next, ...prev]);
    e.currentTarget.reset();
  }

  function recordExpense(e: FormEvent) {
    e.preventDefault();
    const amount = Number(expenseForm.amount);
    if (!expenseForm.lineId || Number.isNaN(amount) || amount <= 0) return;

    setBudget((prev) =>
      prev.map((line) => {
        if (line.id !== expenseForm.lineId && line.category !== "all") {
          return line;
        }
        if (line.id === expenseForm.lineId) {
          return {
            ...line,
            spentAmount: line.spentAmount + amount,
            notes: expenseForm.note
              ? `${line.notes ? `${line.notes} · ` : ""}${expenseForm.note}`
              : line.notes,
          };
        }
        if (line.category === "all") {
          return { ...line, spentAmount: line.spentAmount + amount };
        }
        return line;
      })
    );
    setExpenseForm({ lineId: "", amount: "", note: "" });
  }

  const panels: { id: Panel; label: string; icon: typeof Wrench }[] = [
    { id: "new", label: "New work order", icon: PlusCircle },
    { id: "ledger", label: "Work order ledger", icon: ClipboardList },
    { id: "vendors", label: "3rd party dashboard", icon: Users },
    { id: "budget", label: "Budget dashboard", icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Maintenance</p>
          </div>
          <form action={teamLogout}>
            <button
              type="submit"
              className="btn btn-sm btn-ghost gap-1 text-[var(--harbor-sand)]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <Link
          href="/ops"
          className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to operations
        </Link>

        <div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
            Maintenance
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
            Enter work orders, track the ledger with filters, manage third-party
            vendors, and compare spend against the maintenance budget.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {panels.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPanel(id)}
              className={`rounded-2xl border px-4 py-5 text-left shadow-sm transition hover:-translate-y-0.5 ${
                panel === id
                  ? "border-[var(--harbor-ink)] bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                  : "border-[var(--harbor-deep)]/15 bg-white/85 text-[var(--harbor-ink)]"
              }`}
            >
              <Icon className="h-5 w-5 opacity-80" />
              <p className="mt-3 font-semibold leading-snug">{label}</p>
            </button>
          ))}
        </div>

        {savedMsg && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {savedMsg}
          </div>
        )}

        {panel === "new" && (
          <form
            onSubmit={handleCreateWorkOrder}
            className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-[var(--harbor-mid)]" />
              <h2 className="text-xl font-semibold">Enter a new work order</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="form-control w-full sm:col-span-2">
                <span className="mb-1 text-sm opacity-70">Title</span>
                <input
                  className="input input-bordered w-full"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                  placeholder="Replace lobby ballast"
                  required
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Category</span>
                <select
                  className="select select-bordered w-full"
                  value={form.category}
                  onChange={(e) =>
                    updateForm("category", e.target.value as WorkOrderCategory)
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
                <span className="mb-1 text-sm opacity-70">Status</span>
                <select
                  className="select select-bordered w-full"
                  value={form.status}
                  onChange={(e) =>
                    updateForm("status", e.target.value as WorkOrderStatus)
                  }
                >
                  {WORK_ORDER_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Property</span>
                <input
                  className="input input-bordered w-full"
                  value={form.property}
                  onChange={(e) => updateForm("property", e.target.value)}
                  placeholder="Riverbend Commerce Center"
                  required
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Unit / area</span>
                <input
                  className="input input-bordered w-full"
                  value={form.unit}
                  onChange={(e) => updateForm("unit", e.target.value)}
                  placeholder="Suite 210"
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Submitted by</span>
                <select
                  className="select select-bordered w-full"
                  value={form.source}
                  onChange={(e) =>
                    updateForm("source", e.target.value as WorkOrderSource)
                  }
                >
                  <option value="management_submitted">Management submitted</option>
                  <option value="tenant_submitted">Tenant submitted</option>
                </select>
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Labor type</span>
                <select
                  className="select select-bordered w-full"
                  value={form.labor}
                  onChange={(e) =>
                    updateForm("labor", e.target.value as WorkOrderLabor)
                  }
                >
                  <option value="in_house">In-house</option>
                  <option value="third_party">3rd party required</option>
                </select>
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Requested by</span>
                <input
                  className="input input-bordered w-full"
                  value={form.requestedBy}
                  onChange={(e) => updateForm("requestedBy", e.target.value)}
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Due date</span>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={form.dueDate}
                  onChange={(e) => updateForm("dueDate", e.target.value)}
                />
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Vendor (if 3rd party)</span>
                <input
                  className="input input-bordered w-full"
                  value={form.vendorName}
                  onChange={(e) => updateForm("vendorName", e.target.value)}
                  list="vendor-names"
                />
                <datalist id="vendor-names">
                  {vendors.map((v) => (
                    <option key={v.id} value={v.name} />
                  ))}
                </datalist>
              </label>

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Estimated cost ($)</span>
                <input
                  className="input input-bordered w-full"
                  value={form.estimatedCost}
                  onChange={(e) => updateForm("estimatedCost", e.target.value)}
                />
              </label>

              <div className="sm:col-span-2">
                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Description</span>
                  <textarea
                    className="textarea textarea-bordered w-full min-h-24"
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                  />
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-neutral">
              Create work order
            </button>
          </form>
        )}

        {panel === "ledger" && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4 shadow-sm">
              <p className="mb-3 text-sm font-medium">Filter work orders</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  className="select select-bordered select-sm w-full"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      status: e.target.value as Filters["status"],
                    }))
                  }
                >
                  <option value="all">All statuses</option>
                  {WORK_ORDER_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                <select
                  className="select select-bordered select-sm w-full"
                  value={filters.source}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      source: e.target.value as Filters["source"],
                    }))
                  }
                >
                  <option value="all">All sources</option>
                  <option value="tenant_submitted">Tenant submitted</option>
                  <option value="management_submitted">
                    Management submitted
                  </option>
                </select>

                <select
                  className="select select-bordered select-sm w-full"
                  value={filters.labor}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      labor: e.target.value as Filters["labor"],
                    }))
                  }
                >
                  <option value="all">In-house + 3rd party</option>
                  <option value="in_house">In-house</option>
                  <option value="third_party">3rd party required</option>
                </select>

                <select
                  className="select select-bordered select-sm w-full"
                  value={filters.category}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      category: e.target.value as Filters["category"],
                    }))
                  }
                >
                  <option value="all">All categories</option>
                  {WORK_ORDER_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>

                <select
                  className="select select-bordered select-sm w-full"
                  value={filters.property}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, property: e.target.value }))
                  }
                >
                  <option value="">All properties</option>
                  {properties.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  className="input input-bordered input-sm w-full"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, dateFrom: e.target.value }))
                  }
                  aria-label="From date"
                />
                <input
                  type="date"
                  className="input input-bordered input-sm w-full"
                  value={filters.dateTo}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, dateTo: e.target.value }))
                  }
                  aria-label="To date"
                />

                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setFilters(defaultFilters)}
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 shadow-sm">
              <table className="table">
                <thead>
                  <tr>
                    <th>Work order</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Labor</th>
                    <th>Property</th>
                    <th>Date</th>
                    <th>Update</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center opacity-60 py-8">
                        No work orders match these filters.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <p className="font-medium">{o.title}</p>
                          <p className="text-xs opacity-60">
                            {categoryLabel(o.category)}
                            {o.unit ? ` · ${o.unit}` : ""}
                          </p>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              o.status === "completed"
                                ? "badge-success"
                                : o.status === "in_progress"
                                  ? "badge-info"
                                  : "badge-warning"
                            }`}
                          >
                            {statusLabel(o.status)}
                          </span>
                        </td>
                        <td className="text-sm">{sourceLabel(o.source)}</td>
                        <td className="text-sm">{laborLabel(o.labor)}</td>
                        <td className="text-sm">{o.property}</td>
                        <td className="text-sm">{o.createdAt}</td>
                        <td>
                          <select
                            className="select select-bordered select-xs"
                            value={o.status}
                            onChange={(e) =>
                              updateOrderStatus(
                                o.id,
                                e.target.value as WorkOrderStatus
                              )
                            }
                          >
                            {WORK_ORDER_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {panel === "vendors" && (
          <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <form
              onSubmit={addVendor}
              className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm space-y-3 h-fit"
            >
              <h2 className="text-lg font-semibold">Add 3rd party vendor</h2>
              <input
                name="name"
                className="input input-bordered w-full"
                placeholder="Vendor name"
                required
              />
              <input
                name="specialty"
                className="input input-bordered w-full"
                placeholder="Specialty (HVAC, plumbing…)"
              />
              <input
                name="phone"
                className="input input-bordered w-full"
                placeholder="Phone"
              />
              <input
                name="email"
                className="input input-bordered w-full"
                placeholder="Email"
              />
              <textarea
                name="notes"
                className="textarea textarea-bordered w-full"
                placeholder="Notes"
              />
              <button type="submit" className="btn btn-neutral btn-sm">
                Save vendor
              </button>
            </form>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Vendor directory</h2>
                <ul className="mt-3 space-y-3">
                  {vendors.map((v) => (
                    <li
                      key={v.id}
                      className="rounded-xl border border-base-300 px-3 py-3"
                    >
                      <p className="font-medium">{v.name}</p>
                      <p className="text-sm opacity-65">
                        {v.specialty || "General"} · {v.phone || "No phone"} ·{" "}
                        {v.email || "No email"}
                      </p>
                      {v.notes ? (
                        <p className="mt-1 text-xs opacity-55">{v.notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Open 3rd party work</h2>
                {thirdPartyOpen.length === 0 ? (
                  <p className="mt-2 text-sm opacity-60">
                    No open third-party work orders.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {thirdPartyOpen.map((o) => (
                      <li
                        key={o.id}
                        className="rounded-xl border border-base-300 px-3 py-2 text-sm"
                      >
                        <p className="font-medium">{o.title}</p>
                        <p className="opacity-65">
                          {o.vendorName || "Unassigned vendor"} · {o.property} ·{" "}
                          {statusLabel(o.status)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        {panel === "budget" && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
              <h2 className="text-lg font-semibold">
                Maintenance budget vs expenses
              </h2>
              <p className="mt-1 text-sm opacity-65">
                Compare recorded spend against the budget management allocated to
                the maintenance department.
              </p>

              <div className="mt-4 space-y-4">
                {budget.map((line) => {
                  const pct = line.budgetAmount
                    ? Math.min(
                        100,
                        Math.round((line.spentAmount / line.budgetAmount) * 100)
                      )
                    : 0;
                  const over = line.spentAmount > line.budgetAmount;
                  return (
                    <div key={line.id}>
                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <p className="font-medium">{line.label}</p>
                          <p className="text-xs opacity-60">
                            {money(line.spentAmount)} spent of{" "}
                            {money(line.budgetAmount)}
                            {line.category !== "all"
                              ? ` · ${categoryLabel(line.category)}`
                              : ""}
                          </p>
                        </div>
                        <span
                          className={`badge ${over ? "badge-error" : "badge-ghost"}`}
                        >
                          {pct}% used
                        </span>
                      </div>
                      <progress
                        className={`progress mt-2 w-full ${
                          over ? "progress-error" : "progress-info"
                        }`}
                        value={pct}
                        max={100}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <form
              onSubmit={recordExpense}
              className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm grid gap-3 sm:grid-cols-2"
            >
              <h3 className="sm:col-span-2 font-semibold">Record an expense</h3>
              <select
                className="select select-bordered w-full"
                value={expenseForm.lineId}
                onChange={(e) =>
                  setExpenseForm((f) => ({ ...f, lineId: e.target.value }))
                }
                required
              >
                <option value="">Select budget line</option>
                {budget
                  .filter((b) => b.category !== "all")
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
              </select>
              <input
                className="input input-bordered w-full"
                placeholder="Amount ($)"
                value={expenseForm.amount}
                onChange={(e) =>
                  setExpenseForm((f) => ({ ...f, amount: e.target.value }))
                }
                required
              />
              <input
                className="input input-bordered w-full sm:col-span-2"
                placeholder="Note (optional)"
                value={expenseForm.note}
                onChange={(e) =>
                  setExpenseForm((f) => ({ ...f, note: e.target.value }))
                }
              />
              <button type="submit" className="btn btn-neutral sm:col-span-2">
                Add expense to budget
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
