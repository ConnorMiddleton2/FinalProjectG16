"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
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
  DOCUMENT_STORAGE_KEY,
  emptyDocument,
  emptyWorkOrder,
  laborLabel,
  seedBudget,
  seedDocuments,
  seedVendors,
  seedWorkOrders,
  sourceLabel,
  statusLabel,
  VENDOR_STORAGE_KEY,
  WORK_ORDER_CATEGORIES,
  WORK_ORDER_STATUSES,
  WORK_ORDER_STORAGE_KEY,
  type BudgetLine,
  type DocumentKind,
  type MaintenanceDocument,
  type VendorRecord,
  type WorkOrder,
  type WorkOrderCategory,
  type WorkOrderLabor,
  type WorkOrderSource,
  type WorkOrderStatus,
} from "@/lib/maintenance";

type Panel = "new" | "ledger" | "vendors" | "budget" | "documents";

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
  const [documents, setDocuments] = useState<MaintenanceDocument[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [form, setForm] = useState(emptyWorkOrder);
  const [docForm, setDocForm] = useState(emptyDocument);
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
    const existingDocs = loadJson<MaintenanceDocument[] | null>(
      DOCUMENT_STORAGE_KEY,
      null
    );

    setOrders(existingOrders ?? seedWorkOrders());
    setVendors(existingVendors ?? seedVendors());
    setBudget(existingBudget ?? seedBudget());
    setDocuments(existingDocs ?? seedDocuments());
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

  useEffect(() => {
    if (documents.length) {
      localStorage.setItem(DOCUMENT_STORAGE_KEY, JSON.stringify(documents));
    }
  }, [documents]);

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

  const budgetSheetRows = useMemo(() => {
    const lines = budget.filter((b) => b.category !== "all");
    const totalBudget = lines.reduce((sum, b) => sum + b.budgetAmount, 0);
    const totalSpent = lines.reduce((sum, b) => sum + b.spentAmount, 0);
    const existingTotal = budget.find((b) => b.category === "all");
    return [
      ...lines,
      {
        id: existingTotal?.id ?? "total",
        category: "all" as const,
        label: existingTotal?.label ?? "Total maintenance budget",
        budgetAmount: totalBudget,
        spentAmount: totalSpent,
        notes: existingTotal?.notes ?? "",
      },
    ];
  }, [budget]);

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

  function updateDocForm<K extends keyof ReturnType<typeof emptyDocument>>(
    key: K,
    value: ReturnType<typeof emptyDocument>[K]
  ) {
    setDocForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmitDocument(e: FormEvent) {
    e.preventDefault();
    if (!docForm.vendorName.trim() || !docForm.amount.trim()) {
      setSavedMsg("Vendor and amount are required for invoices/receipts.");
      return;
    }
    if (!docForm.fileName.trim()) {
      setSavedMsg("Attach or name the invoice/receipt file.");
      return;
    }

    const amount = Number(docForm.amount);
    const next: MaintenanceDocument = {
      ...docForm,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
    };

    setDocuments((prev) => [next, ...prev]);

    if (docForm.applyToBudget && docForm.budgetLineId && !Number.isNaN(amount) && amount > 0) {
      setBudget((prev) =>
        prev.map((line) => {
          if (line.id === docForm.budgetLineId) {
            return {
              ...line,
              spentAmount: line.spentAmount + amount,
              notes: `${line.notes ? `${line.notes} · ` : ""}${docForm.kind} ${docForm.fileName}`,
            };
          }
          if (line.category === "all") {
            return { ...line, spentAmount: line.spentAmount + amount };
          }
          return line;
        })
      );
    }

    setDocForm(emptyDocument());
    setSavedMsg(
      `${docForm.kind === "invoice" ? "Invoice" : "Receipt"} submitted${
        docForm.applyToBudget ? " and applied to budget" : ""
      }.`
    );
    setTimeout(() => setSavedMsg(null), 3500);
  }

  const panels: { id: Panel; label: string; icon: typeof Wrench }[] = [
    { id: "new", label: "New work order", icon: PlusCircle },
    { id: "ledger", label: "Work order ledger", icon: ClipboardList },
    { id: "vendors", label: "3rd party dashboard", icon: Users },
    { id: "budget", label: "Budget dashboard", icon: Wallet },
    { id: "documents", label: "Invoices & receipts", icon: FileText },
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
            Enter work orders, track the ledger, manage third-party vendors,
            compare spend to budget, and submit invoices or receipts.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
            <div>
              <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
                Maintenance budget workbook
              </h2>
              <p className="mt-1 text-sm opacity-65">
                Spreadsheet view of management&apos;s maintenance allocation versus
                recorded expenses. Edit green cells directly.
              </p>
            </div>

            <div className="overflow-hidden rounded-sm border border-[#a9b7c6] bg-white shadow-md">
              <div className="flex items-center gap-2 border-b border-[#a9b7c6] bg-[#217346] px-3 py-2 text-white">
                <span className="text-sm font-semibold tracking-wide">
                  Harborline Maintenance Budget.xlsx
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-[13px] [font-family:Calibri,Segoe_UI,Arial,sans-serif]">
                  <thead>
                    <tr className="bg-[#eee]">
                      <th className="w-10 border border-[#c0c0c0] px-2 py-1 text-center font-semibold text-[#666]">
                        #
                      </th>
                      <th className="border border-[#c0c0c0] px-2 py-1 text-left font-semibold">
                        A · Line item
                      </th>
                      <th className="border border-[#c0c0c0] px-2 py-1 text-left font-semibold">
                        B · Category
                      </th>
                      <th className="border border-[#c0c0c0] px-2 py-1 text-right font-semibold">
                        C · Budget
                      </th>
                      <th className="border border-[#c0c0c0] px-2 py-1 text-right font-semibold">
                        D · Spent
                      </th>
                      <th className="border border-[#c0c0c0] px-2 py-1 text-right font-semibold">
                        E · Remaining
                      </th>
                      <th className="border border-[#c0c0c0] px-2 py-1 text-right font-semibold">
                        F · % Used
                      </th>
                      <th className="border border-[#c0c0c0] px-2 py-1 text-left font-semibold">
                        G · Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetSheetRows.map((line, index) => {
                      const remaining = line.budgetAmount - line.spentAmount;
                      const pct = line.budgetAmount
                        ? Math.round(
                            (line.spentAmount / line.budgetAmount) * 100
                          )
                        : 0;
                      const over = remaining < 0;
                      const isTotal = line.category === "all";
                      return (
                        <tr
                          key={line.id}
                          className={
                            isTotal
                              ? "bg-[#fff2cc] font-semibold"
                              : index % 2 === 0
                                ? "bg-white"
                                : "bg-[#fafafa]"
                          }
                        >
                          <td className="border border-[#c0c0c0] bg-[#eee] px-2 py-1 text-center text-[#666]">
                            {index + 1}
                          </td>
                          <td className="border border-[#c0c0c0] px-1 py-0.5">
                            {isTotal ? (
                              <span className="block px-1 py-1">{line.label}</span>
                            ) : (
                              <input
                                className="w-full bg-[#e2efda] px-1 py-1 outline-none focus:ring-1 focus:ring-[#217346]"
                                value={line.label}
                                onChange={(e) =>
                                  setBudget((prev) =>
                                    prev.map((b) =>
                                      b.id === line.id
                                        ? { ...b, label: e.target.value }
                                        : b
                                    )
                                  )
                                }
                              />
                            )}
                          </td>
                          <td className="border border-[#c0c0c0] px-2 py-1 capitalize">
                            {line.category === "all"
                              ? "TOTAL"
                              : categoryLabel(line.category)}
                          </td>
                          <td className="border border-[#c0c0c0] px-1 py-0.5 text-right tabular-nums">
                            {isTotal ? (
                              <span className="block px-1 py-1">
                                {money(line.budgetAmount)}
                              </span>
                            ) : (
                              <input
                                className="w-full bg-[#e2efda] px-1 py-1 text-right outline-none focus:ring-1 focus:ring-[#217346]"
                                value={line.budgetAmount}
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  if (Number.isNaN(value)) return;
                                  setBudget((prev) =>
                                    prev.map((b) =>
                                      b.id === line.id
                                        ? { ...b, budgetAmount: value }
                                        : b
                                    )
                                  );
                                }}
                              />
                            )}
                          </td>
                          <td className="border border-[#c0c0c0] px-1 py-0.5 text-right tabular-nums">
                            {isTotal ? (
                              <span className="block px-1 py-1">
                                {money(line.spentAmount)}
                              </span>
                            ) : (
                              <input
                                className="w-full bg-[#e2efda] px-1 py-1 text-right outline-none focus:ring-1 focus:ring-[#217346]"
                                value={line.spentAmount}
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  if (Number.isNaN(value)) return;
                                  setBudget((prev) =>
                                    prev.map((b) =>
                                      b.id === line.id
                                        ? { ...b, spentAmount: value }
                                        : b
                                    )
                                  );
                                }}
                              />
                            )}
                          </td>
                          <td
                            className={`border border-[#c0c0c0] px-2 py-1 text-right tabular-nums ${
                              over ? "bg-[#fce4ec] text-[#c62828]" : ""
                            }`}
                          >
                            {money(remaining)}
                          </td>
                          <td
                            className={`border border-[#c0c0c0] px-2 py-1 text-right tabular-nums ${
                              over ? "bg-[#fce4ec] text-[#c62828]" : ""
                            }`}
                          >
                            {pct}%
                          </td>
                          <td className="border border-[#c0c0c0] px-1 py-0.5">
                            <input
                              className="w-full bg-[#e2efda] px-1 py-1 outline-none focus:ring-1 focus:ring-[#217346]"
                              value={line.notes}
                              onChange={(e) =>
                                setBudget((prev) =>
                                  prev.map((b) =>
                                    b.id === line.id
                                      ? { ...b, notes: e.target.value }
                                      : b
                                  )
                                )
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-end gap-1 border-t border-[#a9b7c6] bg-[#f3f3f3] px-2 pt-2">
                <div className="rounded-t border border-b-0 border-[#a9b7c6] bg-white px-4 py-1 text-xs font-medium text-[#217346]">
                  Budget
                </div>
                <div className="rounded-t border border-b-0 border-transparent px-4 py-1 text-xs text-[#666]">
                  Expenses
                </div>
                <div className="rounded-t border border-b-0 border-transparent px-4 py-1 text-xs text-[#666]">
                  YTD Summary
                </div>
              </div>
            </div>

            <form
              onSubmit={recordExpense}
              className="overflow-hidden rounded-sm border border-[#a9b7c6] bg-white shadow-md"
            >
              <div className="border-b border-[#a9b7c6] bg-[#f3f3f3] px-3 py-2 text-sm font-semibold">
                Quick entry · add expense to a budget line
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                <select
                  className="select select-bordered w-full rounded-none border-[#c0c0c0]"
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
                  className="input input-bordered w-full rounded-none border-[#c0c0c0]"
                  placeholder="Amount ($)"
                  value={expenseForm.amount}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  required
                />
                <input
                  className="input input-bordered w-full rounded-none border-[#c0c0c0] sm:col-span-2"
                  placeholder="Note (optional)"
                  value={expenseForm.note}
                  onChange={(e) =>
                    setExpenseForm((f) => ({ ...f, note: e.target.value }))
                  }
                />
                <button
                  type="submit"
                  className="btn rounded-none border-0 bg-[#217346] text-white hover:bg-[#1a5c38] sm:col-span-2"
                >
                  Post expense to sheet
                </button>
              </div>
            </form>
          </section>
        )}

        {panel === "documents" && (
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <form
              onSubmit={handleSubmitDocument}
              className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm space-y-4 h-fit"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--harbor-mid)]" />
                <h2 className="text-lg font-semibold">
                  Submit invoice or receipt
                </h2>
              </div>
              <p className="text-sm opacity-65">
                Upload maintenance invoices and receipts for recordkeeping. You
                can optionally push the amount into the budget dashboard.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Document type</span>
                  <select
                    className="select select-bordered w-full"
                    value={docForm.kind}
                    onChange={(e) =>
                      updateDocForm("kind", e.target.value as DocumentKind)
                    }
                  >
                    <option value="invoice">Invoice</option>
                    <option value="receipt">Receipt</option>
                  </select>
                </label>

                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Document date</span>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={docForm.documentDate}
                    onChange={(e) =>
                      updateDocForm("documentDate", e.target.value)
                    }
                    required
                  />
                </label>

                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Vendor / payee</span>
                  <input
                    className="input input-bordered w-full"
                    value={docForm.vendorName}
                    onChange={(e) => updateDocForm("vendorName", e.target.value)}
                    list="vendor-names-docs"
                    placeholder="Oxford HVAC Pros"
                    required
                  />
                  <datalist id="vendor-names-docs">
                    {vendors.map((v) => (
                      <option key={v.id} value={v.name} />
                    ))}
                  </datalist>
                </label>

                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Amount ($)</span>
                  <input
                    className="input input-bordered w-full"
                    value={docForm.amount}
                    onChange={(e) => updateDocForm("amount", e.target.value)}
                    placeholder="850.00"
                    required
                  />
                </label>

                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Property</span>
                  <input
                    className="input input-bordered w-full"
                    value={docForm.property}
                    onChange={(e) => updateDocForm("property", e.target.value)}
                    placeholder="Riverbend Commerce Center"
                  />
                </label>

                <label className="form-control w-full">
                  <span className="mb-1 text-sm opacity-70">Category</span>
                  <select
                    className="select select-bordered w-full"
                    value={docForm.category}
                    onChange={(e) =>
                      updateDocForm(
                        "category",
                        e.target.value as WorkOrderCategory | ""
                      )
                    }
                  >
                    <option value="">No category</option>
                    {WORK_ORDER_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-control w-full sm:col-span-2">
                  <span className="mb-1 text-sm opacity-70">
                    Related work order (optional)
                  </span>
                  <select
                    className="select select-bordered w-full"
                    value={docForm.workOrderId}
                    onChange={(e) =>
                      updateDocForm("workOrderId", e.target.value)
                    }
                  >
                    <option value="">None</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title} · {o.property}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-control w-full sm:col-span-2">
                  <span className="mb-1 text-sm opacity-70">
                    Attach invoice / receipt file
                  </span>
                  <input
                    type="file"
                    className="file-input file-input-bordered w-full"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      updateDocForm("fileName", file?.name ?? "");
                    }}
                  />
                  {docForm.fileName ? (
                    <span className="mt-1 text-xs opacity-60">
                      Selected: {docForm.fileName}
                    </span>
                  ) : null}
                </label>

                <label className="form-control w-full sm:col-span-2">
                  <span className="mb-1 text-sm opacity-70">Notes</span>
                  <textarea
                    className="textarea textarea-bordered w-full min-h-20"
                    value={docForm.notes}
                    onChange={(e) => updateDocForm("notes", e.target.value)}
                    placeholder="What was purchased or billed?"
                  />
                </label>

                <label className="flex items-center gap-2 sm:col-span-2 text-sm">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={docForm.applyToBudget}
                    onChange={(e) =>
                      updateDocForm("applyToBudget", e.target.checked)
                    }
                  />
                  Also apply this amount to the maintenance budget
                </label>

                {docForm.applyToBudget && (
                  <label className="form-control w-full sm:col-span-2">
                    <span className="mb-1 text-sm opacity-70">Budget line</span>
                    <select
                      className="select select-bordered w-full"
                      value={docForm.budgetLineId}
                      onChange={(e) =>
                        updateDocForm("budgetLineId", e.target.value)
                      }
                      required={docForm.applyToBudget}
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
                  </label>
                )}
              </div>

              <button type="submit" className="btn btn-neutral">
                Submit {docForm.kind}
              </button>
            </form>

            <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Submitted documents</h2>
              {documents.length === 0 ? (
                <p className="mt-3 text-sm opacity-60">
                  No invoices or receipts submitted yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {documents.map((doc) => {
                    const related = orders.find((o) => o.id === doc.workOrderId);
                    return (
                      <li
                        key={doc.id}
                        className="rounded-xl border border-base-300 px-3 py-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium capitalize">
                              {doc.kind} · {doc.vendorName}
                            </p>
                            <p className="text-sm opacity-65">
                              {doc.property || "No property"} ·{" "}
                              {doc.documentDate}
                              {doc.category
                                ? ` · ${categoryLabel(doc.category)}`
                                : ""}
                            </p>
                          </div>
                          <span className="badge badge-outline">
                            ${doc.amount}
                          </span>
                        </div>
                        <p className="mt-2 text-xs opacity-60">
                          File: {doc.fileName || "—"}
                          {related ? ` · WO: ${related.title}` : ""}
                          {doc.applyToBudget ? " · Applied to budget" : ""}
                        </p>
                        {doc.notes ? (
                          <p className="mt-1 text-sm opacity-70">{doc.notes}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
