"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeDollarSign,
  FileText,
  KeyRound,
  LogOut,
  Pencil,
  PlusCircle,
  Users,
  X,
} from "lucide-react";
import { teamLogout } from "@/app/team/actions";
import {
  clearEmployeeTempPassword,
  issueEmployeeTempPassword,
} from "@/app/ops/hr/actions";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import { createClient } from "@/lib/supabase/client";
import { deleteSharedRecord } from "@/lib/shared-store";
import { money } from "@/lib/money";
import {
  CADE_DEMO,
  CADE_EMPLOYEE_ID,
  categoryLabel,
  departmentLabel,
  emptyEmployee,
  employeeDisplayName,
  HR_DEPARTMENTS,
  HR_EMPLOYEE_CATEGORIES,
  HR_OPS_MODULES,
  HR_PAY_FREQUENCIES,
  HR_PAY_STUB_STATUSES,
  HR_PAY_TYPES,
  HR_STATUSES,
  makeCadeEmployee,
  nextEmployeeId,
  normalizeHrEmployee,
  employeeNeedsModuleAccessSync,
  isTypeDefaultModule,
  payStubStatusLabel,
  resolveEmployeeModuleAccess,
  seedPayStubs,
  syncEmployeeModuleAccess,
  SEED_EMPLOYEE_CATEGORIES,
  seedEmployees,
  statusLabel,
  type HrDepartment,
  type HrEmployee,
  type HrEmployeeCategory,
  type HrEmployeeStatus,
  type HrOpsModule,
  type HrPayFrequency,
  type HrPayStub,
  type HrPayStubStatus,
  type HrPayType,
} from "@/lib/hr";

type HrTab = "directory" | "access" | "payroll" | "contracts";

const TABS: {
  id: HrTab;
  label: string;
  description: string;
  icon: typeof Users;
}[] = [
  {
    id: "directory",
    label: "Directory",
    description: "Employee roster, IDs, departments, and status",
    icon: Users,
  },
  {
    id: "access",
    label: "Access",
    description: "Module authorization and temporary passwords",
    icon: KeyRound,
  },
  {
    id: "payroll",
    label: "Payroll",
    description: "Compensation, withholding, direct deposit, and pay history",
    icon: BadgeDollarSign,
  },
  {
    id: "contracts",
    label: "Contracts",
    description: "Employment agreement metadata",
    icon: FileText,
  },
];

function statusBadgeClass(status: HrEmployeeStatus) {
  if (status === "active") return "badge-success";
  if (status === "on_leave") return "badge-warning";
  return "badge-ghost";
}

export function HrDashboard() {
  const {
    items: employeeRows,
    loading,
    error,
    saveOne,
    refresh,
  } = useSharedCollection<HrEmployee>(COLLECTIONS.hrEmployees, seedEmployees);

  const employees = useMemo(
    () => employeeRows.map((e) => normalizeHrEmployee(e)),
    [employeeRows]
  );

  const [tab, setTab] = useState<HrTab>("directory");
  const [deptFilter, setDeptFilter] = useState<HrDepartment | "all">("all");
  const [statusFilter, setStatusFilter] = useState<HrEmployeeStatus | "all">(
    "all"
  );
  const [editing, setEditing] = useState<HrEmployee | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyEmployee());
  const [selectedId, setSelectedId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [cadeEnsured, setCadeEnsured] = useState(false);
  const [categoriesBackfilled, setCategoriesBackfilled] = useState(false);
  const [accessBackfilled, setAccessBackfilled] = useState(false);

  useEffect(() => {
    if (loading || cadeEnsured) return;
    const hasCade = employees.some(
      (e) =>
        e.id === CADE_EMPLOYEE_ID ||
        e.email.trim().toLowerCase() === CADE_DEMO.email.toLowerCase()
    );
    setCadeEnsured(true);
    if (!hasCade) {
      void saveOne(makeCadeEmployee()).catch(() => {
        /* ignore ensure failures; login path also seeds */
      });
    }
  }, [loading, employees, saveOne, cadeEnsured]);

  useEffect(() => {
    if (loading || categoriesBackfilled) return;
    const missing = employeeRows.filter(
      (row) =>
        row.category == null ||
        !HR_EMPLOYEE_CATEGORIES.some((c) => c.value === row.category)
    );
    setCategoriesBackfilled(true);
    if (missing.length === 0) return;
    void (async () => {
      const now = new Date().toISOString();
      for (const row of missing) {
        const seedCategory = SEED_EMPLOYEE_CATEGORIES[row.id];
        if (!seedCategory) continue;
        const next = normalizeHrEmployee({
          ...row,
          id: row.id,
          category: seedCategory,
          updatedAt: now,
        });
        try {
          await saveOne(next);
        } catch {
          /* ignore backfill failures */
        }
      }
    })();
  }, [loading, employeeRows, saveOne, categoriesBackfilled]);

  useEffect(() => {
    if (loading || accessBackfilled) return;
    const stale = employeeRows.filter((row) =>
      employeeNeedsModuleAccessSync(normalizeHrEmployee(row))
    );
    setAccessBackfilled(true);
    if (stale.length === 0) return;
    void (async () => {
      const now = new Date().toISOString();
      for (const row of stale) {
        const normalized = normalizeHrEmployee(row);
        const next: HrEmployee = {
          ...normalized,
          moduleAccess: syncEmployeeModuleAccess(normalized),
          updatedAt: now,
        };
        try {
          await saveOne(next);
        } catch {
          /* ignore backfill failures */
        }
      }
    })();
  }, [loading, employeeRows, saveOne, accessBackfilled]);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (deptFilter !== "all" && e.department !== deptFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      return true;
    });
  }, [employees, deptFilter, statusFilter]);

  const selected =
    employees.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

  const activeCount = employees.filter((e) => e.status === "active").length;
  const payrollHint = employees
    .filter((e) => e.status === "active" && e.payRate)
    .reduce((sum, e) => sum + (Number(e.payRate) || 0), 0);

  function flash(message: string) {
    setMsg(message);
    setTimeout(() => setMsg(null), 3500);
  }

  function startCreate() {
    setCreating(true);
    setEditing(null);
    const department: HrDepartment = "other";
    const category: HrEmployeeCategory = "property";
    setForm({
      ...emptyEmployee(),
      employeeId: nextEmployeeId(employees),
      department,
      category,
      moduleAccess: resolveEmployeeModuleAccess(department, category),
    });
  }

  function startEdit(emp: HrEmployee) {
    setCreating(false);
    setEditing(emp);
    setForm({
      employeeId: emp.employeeId,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      category: emp.category,
      jobTitle: emp.jobTitle,
      status: emp.status,
      moduleAccess: [...emp.moduleAccess],
      passwordHash: emp.passwordHash,
      temporaryPassword: emp.temporaryPassword,
      mustResetPassword: emp.mustResetPassword,
      payType: emp.payType,
      payRate: emp.payRate,
      payFrequency: emp.payFrequency,
      payEffectiveDate: emp.payEffectiveDate,
      federalWithholding: emp.federalWithholding,
      stateWithholding: emp.stateWithholding,
      deductionsNotes: emp.deductionsNotes,
      directDepositBank: emp.directDepositBank,
      directDepositAccountLast4: emp.directDepositAccountLast4,
      directDepositRoutingLast4: emp.directDepositRoutingLast4,
      payrollNotes: emp.payrollNotes,
      contractTitle: emp.contractTitle,
      contractStart: emp.contractStart,
      contractEnd: emp.contractEnd,
      contractFileName: emp.contractFileName,
      contractNotes: emp.contractNotes,
      hiredAt: emp.hiredAt,
      terminatedAt: emp.terminatedAt,
      notes: emp.notes,
    });
    setSelectedId(emp.id);
  }

  function cancelForm() {
    setCreating(false);
    setEditing(null);
    setForm(emptyEmployee());
  }

  function updateForm<K extends keyof ReturnType<typeof emptyEmployee>>(
    key: K,
    value: ReturnType<typeof emptyEmployee>[K]
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (
        creating &&
        (key === "department" || key === "category")
      ) {
        next.moduleAccess = resolveEmployeeModuleAccess(
          next.department,
          next.category
        );
      }
      return next;
    });
  }

  function applyTypeDefaults(emp: HrEmployee) {
    const moduleAccess = syncEmployeeModuleAccess(emp);
    const differs =
      moduleAccess.length !== emp.moduleAccess.length ||
      moduleAccess.some((m) => !emp.moduleAccess.includes(m));
    if (
      differs &&
      !window.confirm(
        `Replace current access with the recommended defaults for ${departmentLabel(emp.department)} · ${categoryLabel(emp.category)}?`
      )
    ) {
      return;
    }
    void patchEmployee(
      emp,
      { moduleAccess },
      `Applied type defaults for ${employeeDisplayName(emp)}.`
    );
  }

  async function handleSaveDirectory(e: FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.employeeId.trim()) {
      flash("Employee ID, first name, and last name are required.");
      return;
    }
    const now = new Date().toISOString();
    const moduleAccess = syncEmployeeModuleAccess({
      department: form.department,
      category: form.category,
      moduleAccess: form.moduleAccess,
    });
    setSaving(true);
    try {
      if (editing) {
        const next: HrEmployee = {
          ...editing,
          ...form,
          moduleAccess,
          updatedAt: now,
          terminatedAt:
            form.status === "terminated"
              ? form.terminatedAt || now.slice(0, 10)
              : "",
        };
        await saveOne(next);
        flash(`Updated ${employeeDisplayName(next)}.`);
      } else {
        const next: HrEmployee = {
          ...form,
          moduleAccess,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          terminatedAt:
            form.status === "terminated"
              ? form.terminatedAt || now.slice(0, 10)
              : "",
        };
        await saveOne(next);
        setSelectedId(next.id);
        flash(`Added ${employeeDisplayName(next)}.`);
      }
      cancelForm();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not save employee.");
    } finally {
      setSaving(false);
    }
  }

  async function patchEmployee(
    emp: HrEmployee,
    patch: Partial<HrEmployee>,
    success: string
  ) {
    setSaving(true);
    try {
      const next: HrEmployee = {
        ...emp,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      await saveOne(next);
      flash(success);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function issueTempPassword(emp: HrEmployee) {
    setSaving(true);
    try {
      const result = await issueEmployeeTempPassword(emp.id);
      if (!result.ok) {
        flash(result.error);
        return;
      }
      await refresh();
      flash(
        `Temporary password issued for ${employeeDisplayName(emp)}: ${result.temporaryPassword}`
      );
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not issue password.");
    } finally {
      setSaving(false);
    }
  }

  async function clearTempPassword(emp: HrEmployee) {
    setSaving(true);
    try {
      const result = await clearEmployeeTempPassword(emp.id);
      if (!result.ok) {
        flash(result.error);
        return;
      }
      await refresh();
      flash(`Password cleared for ${employeeDisplayName(emp)}.`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not clear password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 pl-14 sm:pl-6">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Human resources</p>
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

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-10 pl-14 sm:pl-6">
        <Link
          href="/ops"
          className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to operations
        </Link>

        <div>
          <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
            Human resources
          </h1>
          <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
            Staff roster, website access rights, payroll, and employment
            contracts. Website access is based on each person&apos;s department
            and category (Corporate or Property); use the Access tab to review
            or adjust module checkboxes.
          </p>
        </div>

        {msg ? (
          <p className="rounded-xl border border-[var(--harbor-mid)]/30 bg-[var(--harbor-mist)]/80 px-4 py-2 text-sm text-[var(--harbor-ink)]">
            {msg}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-xs uppercase tracking-wide opacity-55">
              Employees
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {loading ? "…" : employees.length}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-xs uppercase tracking-wide opacity-55">Active</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {loading ? "…" : activeCount}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 px-4 py-3 shadow-sm">
            <p className="text-xs uppercase tracking-wide opacity-55">
              Active compensation (sum)
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {loading ? "…" : `$${payrollHint.toLocaleString()}`}
            </p>
            <p className="text-xs opacity-50">Display only — not a payroll run</p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Human resources sections"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {TABS.map(({ id, label, description, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                className={`rounded-2xl border px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 ${
                  active
                    ? "border-[var(--harbor-ink)] bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                    : "border-[var(--harbor-deep)]/15 bg-white/85 text-[var(--harbor-ink)]"
                }`}
              >
                <Icon className="h-5 w-5 opacity-80" />
                <p className="mt-2 text-lg font-semibold">{label}</p>
                <p
                  className={`mt-1 text-sm ${
                    active ? "opacity-75" : "opacity-60"
                  }`}
                >
                  {description}
                </p>
              </button>
            );
          })}
        </div>

        <div role="tabpanel">
          {tab === "directory" ? (
            <DirectoryPanel
              loading={loading}
              filtered={filtered}
              deptFilter={deptFilter}
              statusFilter={statusFilter}
              onDeptFilter={setDeptFilter}
              onStatusFilter={setStatusFilter}
              creating={creating}
              editing={editing}
              form={form}
              saving={saving}
              onStartCreate={startCreate}
              onStartEdit={startEdit}
              onCancel={cancelForm}
              onUpdateForm={updateForm}
              onSave={handleSaveDirectory}
            />
          ) : null}

          {tab === "access" ? (
            <AccessPanel
              loading={loading}
              employees={filtered}
              selected={selected}
              selectedId={selected?.id ?? ""}
              onSelect={setSelectedId}
              saving={saving}
              onToggleModule={(emp, mod) => {
                const has = emp.moduleAccess.includes(mod);
                void patchEmployee(
                  emp,
                  {
                    moduleAccess: has
                      ? emp.moduleAccess.filter((m) => m !== mod)
                      : [...emp.moduleAccess, mod],
                  },
                  `Updated access for ${employeeDisplayName(emp)}.`
                );
              }}
              onIssuePassword={issueTempPassword}
              onClearPassword={(emp) => void clearTempPassword(emp)}
              onMustReset={(emp, value) =>
                void patchEmployee(
                  emp,
                  { mustResetPassword: value },
                  `Updated reset flag for ${employeeDisplayName(emp)}.`
                )
              }
              onApplyTypeDefaults={applyTypeDefaults}
            />
          ) : null}

          {tab === "payroll" ? (
            <PayrollPanel
              loading={loading}
              employees={filtered}
              selected={selected}
              onSelect={setSelectedId}
              saving={saving}
              onSave={(emp, patch) =>
                void patchEmployee(
                  emp,
                  patch,
                  `Updated payroll for ${employeeDisplayName(emp)}.`
                )
              }
            />
          ) : null}

          {tab === "contracts" ? (
            <ContractsPanel
              loading={loading}
              employees={filtered}
              selected={selected}
              onSelect={setSelectedId}
              saving={saving}
              onSave={(emp, patch) =>
                void patchEmployee(
                  emp,
                  patch,
                  `Updated contract for ${employeeDisplayName(emp)}.`
                )
              }
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}

function DirectoryPanel({
  loading,
  filtered,
  deptFilter,
  statusFilter,
  onDeptFilter,
  onStatusFilter,
  creating,
  editing,
  form,
  saving,
  onStartCreate,
  onStartEdit,
  onCancel,
  onUpdateForm,
  onSave,
}: {
  loading: boolean;
  filtered: HrEmployee[];
  deptFilter: HrDepartment | "all";
  statusFilter: HrEmployeeStatus | "all";
  onDeptFilter: (v: HrDepartment | "all") => void;
  onStatusFilter: (v: HrEmployeeStatus | "all") => void;
  creating: boolean;
  editing: HrEmployee | null;
  form: ReturnType<typeof emptyEmployee>;
  saving: boolean;
  onStartCreate: () => void;
  onStartEdit: (e: HrEmployee) => void;
  onCancel: () => void;
  onUpdateForm: <K extends keyof ReturnType<typeof emptyEmployee>>(
    key: K,
    value: ReturnType<typeof emptyEmployee>[K]
  ) => void;
  onSave: (e: FormEvent) => void;
}) {
  const showForm = creating || editing;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <label className="form-control">
            <span className="mb-1 text-xs opacity-60">Department</span>
            <select
              className="select select-bordered select-sm"
              value={deptFilter}
              onChange={(e) =>
                onDeptFilter(e.target.value as HrDepartment | "all")
              }
            >
              <option value="all">All</option>
              {HR_DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control">
            <span className="mb-1 text-xs opacity-60">Status</span>
            <select
              className="select select-bordered select-sm"
              value={statusFilter}
              onChange={(e) =>
                onStatusFilter(e.target.value as HrEmployeeStatus | "all")
              }
            >
              <option value="all">All</option>
              {HR_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="btn btn-neutral btn-sm gap-1"
          onClick={onStartCreate}
        >
          <PlusCircle className="h-4 w-4" />
          Add employee
        </button>
      </div>

      {showForm ? (
        <form
          onSubmit={onSave}
          className="rounded-2xl border border-[var(--harbor-deep)]/15 bg-white p-5 shadow-sm space-y-4"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold">
              {editing ? "Edit employee" : "New employee"}
            </h3>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square"
              onClick={onCancel}
              aria-label="Close form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="form-control">
              <span className="mb-1 text-sm opacity-70">Employee ID</span>
              <input
                className="input input-bordered"
                value={form.employeeId}
                onChange={(e) => onUpdateForm("employeeId", e.target.value)}
                required
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-sm opacity-70">Job title</span>
              <input
                className="input input-bordered"
                value={form.jobTitle}
                onChange={(e) => onUpdateForm("jobTitle", e.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-sm opacity-70">First name</span>
              <input
                className="input input-bordered"
                value={form.firstName}
                onChange={(e) => onUpdateForm("firstName", e.target.value)}
                required
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-sm opacity-70">Last name</span>
              <input
                className="input input-bordered"
                value={form.lastName}
                onChange={(e) => onUpdateForm("lastName", e.target.value)}
                required
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-sm opacity-70">Email</span>
              <input
                type="email"
                className="input input-bordered"
                value={form.email}
                onChange={(e) => onUpdateForm("email", e.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-sm opacity-70">Phone</span>
              <input
                className="input input-bordered"
                value={form.phone}
                onChange={(e) => onUpdateForm("phone", e.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-sm opacity-70">Department</span>
              <select
                className="select select-bordered"
                value={form.department}
                onChange={(e) =>
                  onUpdateForm("department", e.target.value as HrDepartment)
                }
              >
                {HR_DEPARTMENTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control">
              <span className="mb-1 text-sm opacity-70">Category</span>
              <select
                className="select select-bordered"
                value={form.category}
                onChange={(e) =>
                  onUpdateForm("category", e.target.value as HrEmployeeCategory)
                }
              >
                {HR_EMPLOYEE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control">
              <span className="mb-1 text-sm opacity-70">Status</span>
              <select
                className="select select-bordered"
                value={form.status}
                onChange={(e) =>
                  onUpdateForm("status", e.target.value as HrEmployeeStatus)
                }
              >
                {HR_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control">
              <span className="mb-1 text-sm opacity-70">Hired</span>
              <input
                type="date"
                className="input input-bordered"
                value={form.hiredAt}
                onChange={(e) => onUpdateForm("hiredAt", e.target.value)}
              />
            </label>
            <label className="form-control sm:col-span-2">
              <span className="mb-1 text-sm opacity-70">Notes</span>
              <textarea
                className="textarea textarea-bordered min-h-20"
                value={form.notes}
                onChange={(e) => onUpdateForm("notes", e.target.value)}
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-neutral" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save employee" : "Create employee"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 shadow-sm">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Department</th>
              <th>Category</th>
              <th>Title</th>
              <th>Status</th>
              <th>Hired</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="opacity-60">
                  Loading employees…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="opacity-60">
                  No employees match these filters.
                </td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <tr key={emp.id}>
                  <td className="font-mono text-sm">{emp.employeeId}</td>
                  <td>
                    <p className="font-medium">{employeeDisplayName(emp)}</p>
                    <p className="text-xs opacity-55">{emp.email || "—"}</p>
                  </td>
                  <td>{departmentLabel(emp.department)}</td>
                  <td className="text-sm">{categoryLabel(emp.category)}</td>
                  <td className="text-sm">{emp.jobTitle || "—"}</td>
                  <td>
                    <span
                      className={`badge badge-sm ${statusBadgeClass(emp.status)}`}
                    >
                      {statusLabel(emp.status)}
                    </span>
                  </td>
                  <td className="text-sm tabular-nums">{emp.hiredAt || "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs gap-1"
                      onClick={() => onStartEdit(emp)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmployeePicker({
  employees,
  selectedId,
  onSelect,
}: {
  employees: HrEmployee[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <label className="form-control w-full max-w-md">
      <span className="mb-1 text-sm opacity-70">Employee</span>
      <select
        className="select select-bordered"
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
      >
        {employees.length === 0 ? (
          <option value="">No employees</option>
        ) : (
          employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.employeeId} · {employeeDisplayName(e)}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

function AccessPanel({
  loading,
  employees,
  selected,
  selectedId,
  onSelect,
  saving,
  onToggleModule,
  onIssuePassword,
  onClearPassword,
  onMustReset,
  onApplyTypeDefaults,
}: {
  loading: boolean;
  employees: HrEmployee[];
  selected: HrEmployee | null;
  selectedId: string;
  onSelect: (id: string) => void;
  saving: boolean;
  onToggleModule: (emp: HrEmployee, mod: HrOpsModule) => void;
  onIssuePassword: (emp: HrEmployee) => void;
  onClearPassword: (emp: HrEmployee) => void;
  onMustReset: (emp: HrEmployee, value: boolean) => void;
  onApplyTypeDefaults: (emp: HrEmployee) => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 p-5 shadow-sm">
      <p className="text-sm opacity-65">
        Checked modules below determine what this employee can access in Ops.
        Recommended modules for their department and category are marked;
        use Apply type defaults to reset to that recommended set. Property
        staff cannot access Management or Human resources.
      </p>
      <EmployeePicker
        employees={employees}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      {loading ? (
        <p className="text-sm opacity-60">Loading…</p>
      ) : !selected ? (
        <p className="text-sm opacity-60">Select an employee to manage access.</p>
      ) : (
        <div className="space-y-6">
          <p className="text-sm opacity-65">
            <span className="font-medium">{departmentLabel(selected.department)}</span>
            {" · "}
            <span className="font-medium">{categoryLabel(selected.category)}</span>
          </p>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">
                Module access · {employeeDisplayName(selected)}
              </h3>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={saving}
                onClick={() => onApplyTypeDefaults(selected)}
              >
                Apply type defaults
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {HR_OPS_MODULES.map((mod) => {
                const checked = selected.moduleAccess.includes(mod.value);
                const recommended = isTypeDefaultModule(
                  selected.department,
                  selected.category,
                  mod.value
                );
                const isExtra = checked && !recommended;
                return (
                  <label
                    key={mod.value}
                    className="flex items-center gap-2 rounded-xl border border-base-300 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={checked}
                      disabled={saving}
                      onChange={() => onToggleModule(selected, mod.value)}
                    />
                    <span>
                      {mod.label}
                      {isExtra ? (
                        <span className="ml-1 text-xs opacity-50">(extra)</span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="space-y-3 border-t border-base-300 pt-4">
            <h3 className="font-semibold">Temporary password</h3>
            <p className="font-mono text-sm">
              {selected.temporaryPassword || (
                <span className="opacity-50">None set</span>
              )}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={selected.mustResetPassword}
                disabled={saving}
                onChange={(e) => onMustReset(selected, e.target.checked)}
              />
              Must reset password on next login
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-neutral btn-sm"
                disabled={saving}
                onClick={() => onIssuePassword(selected)}
              >
                Issue temporary password
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={saving || !selected.temporaryPassword}
                onClick={() => onClearPassword(selected)}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatPayAmount(raw: string) {
  const value = Number(raw.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(value)) return raw || "—";
  return money(value);
}

type PayrollProfilePatch = Pick<
  HrEmployee,
  | "payType"
  | "payRate"
  | "payFrequency"
  | "payEffectiveDate"
  | "federalWithholding"
  | "stateWithholding"
  | "deductionsNotes"
  | "directDepositBank"
  | "directDepositAccountLast4"
  | "directDepositRoutingLast4"
  | "payrollNotes"
>;

const EMPTY_STUB_FORM = {
  periodStart: "",
  periodEnd: "",
  payDate: "",
  grossPay: "",
  deductions: "",
  netPay: "",
  hoursWorked: "",
  status: "draft" as HrPayStubStatus,
  notes: "",
};

function PayrollPanel({
  loading,
  employees,
  selected,
  onSelect,
  saving,
  onSave,
}: {
  loading: boolean;
  employees: HrEmployee[];
  selected: HrEmployee | null;
  onSelect: (id: string) => void;
  saving: boolean;
  onSave: (emp: HrEmployee, patch: PayrollProfilePatch) => void;
}) {
  const {
    items: payStubs,
    setItems: setPayStubs,
    loading: stubsLoading,
    saveOne: saveStub,
  } = useSharedCollection<HrPayStub>(COLLECTIONS.hrPayStubs, seedPayStubs);

  const [payType, setPayType] = useState<HrPayType>("hourly");
  const [payRate, setPayRate] = useState("");
  const [payFrequency, setPayFrequency] = useState<HrPayFrequency>("biweekly");
  const [payEffectiveDate, setPayEffectiveDate] = useState("");
  const [federalWithholding, setFederalWithholding] = useState("");
  const [stateWithholding, setStateWithholding] = useState("");
  const [deductionsNotes, setDeductionsNotes] = useState("");
  const [directDepositBank, setDirectDepositBank] = useState("");
  const [directDepositAccountLast4, setDirectDepositAccountLast4] =
    useState("");
  const [directDepositRoutingLast4, setDirectDepositRoutingLast4] =
    useState("");
  const [payrollNotes, setPayrollNotes] = useState("");

  const [stubForm, setStubForm] = useState(EMPTY_STUB_FORM);
  const [editingStubId, setEditingStubId] = useState<string | null>(null);
  const [stubSaving, setStubSaving] = useState(false);

  const categoryMeta = HR_EMPLOYEE_CATEGORIES.find(
    (c) => c.value === selected?.category
  );

  const employeeStubs = useMemo(
    () =>
      payStubs
        .filter((s) => s.employeeId === selected?.id)
        .sort((a, b) => b.payDate.localeCompare(a.payDate)),
    [payStubs, selected?.id]
  );

  useEffect(() => {
    if (!selected) return;
    setPayType(selected.payType);
    setPayRate(selected.payRate);
    setPayFrequency(selected.payFrequency);
    setPayEffectiveDate(selected.payEffectiveDate);
    setFederalWithholding(selected.federalWithholding);
    setStateWithholding(selected.stateWithholding);
    setDeductionsNotes(selected.deductionsNotes);
    setDirectDepositBank(selected.directDepositBank);
    setDirectDepositAccountLast4(selected.directDepositAccountLast4);
    setDirectDepositRoutingLast4(selected.directDepositRoutingLast4);
    setPayrollNotes(selected.payrollNotes);
    setEditingStubId(null);
    setStubForm(EMPTY_STUB_FORM);
  }, [selected]);

  async function deleteStub(stub: HrPayStub) {
    if (!window.confirm("Delete this pay stub?")) return;
    setStubSaving(true);
    try {
      const supabase = createClient();
      await deleteSharedRecord(supabase, COLLECTIONS.hrPayStubs, stub.id);
      setPayStubs((prev) => prev.filter((s) => s.id !== stub.id));
    } finally {
      setStubSaving(false);
    }
  }

  function startEditStub(stub: HrPayStub) {
    setEditingStubId(stub.id);
    setStubForm({
      periodStart: stub.periodStart,
      periodEnd: stub.periodEnd,
      payDate: stub.payDate,
      grossPay: stub.grossPay,
      deductions: stub.deductions,
      netPay: stub.netPay,
      hoursWorked: stub.hoursWorked,
      status: stub.status,
      notes: stub.notes,
    });
  }

  async function handleStubSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const now = new Date().toISOString();
    setStubSaving(true);
    try {
      const stub: HrPayStub = {
        id: editingStubId ?? crypto.randomUUID(),
        employeeId: selected.id,
        ...stubForm,
        createdAt: editingStubId
          ? payStubs.find((s) => s.id === editingStubId)?.createdAt ?? now
          : now,
        updatedAt: now,
      };
      await saveStub(stub);
      setEditingStubId(null);
      setStubForm(EMPTY_STUB_FORM);
    } finally {
      setStubSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 p-5 shadow-sm">
      <EmployeePicker
        employees={employees}
        selectedId={selected?.id ?? ""}
        onSelect={onSelect}
      />
      {loading ? (
        <p className="text-sm opacity-60">Loading…</p>
      ) : !selected ? (
        <p className="text-sm opacity-60">
          Select an employee to manage payroll.
        </p>
      ) : (
        <div className="space-y-8">
          <section className="space-y-2">
            <h3 className="font-semibold">Classification</h3>
            <p className="text-sm">
              <span className="font-medium">
                {departmentLabel(selected.department)}
              </span>
              {" · "}
              <span className="font-medium">
                {categoryLabel(selected.category)}
              </span>
            </p>
            {categoryMeta ? (
              <p className="text-sm opacity-65">{categoryMeta.description}</p>
            ) : null}
          </section>

          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              onSave(selected, {
                payType,
                payRate,
                payFrequency,
                payEffectiveDate,
                federalWithholding,
                stateWithholding,
                deductionsNotes,
                directDepositBank,
                directDepositAccountLast4,
                directDepositRoutingLast4,
                payrollNotes,
              });
            }}
          >
            <section className="space-y-3">
              <h3 className="font-semibold">Compensation</h3>
              <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
                <label className="form-control">
                  <span className="mb-1 text-sm opacity-70">Pay type</span>
                  <select
                    className="select select-bordered"
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as HrPayType)}
                  >
                    {HR_PAY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control">
                  <span className="mb-1 text-sm opacity-70">
                    {payType === "salary" ? "Annual salary ($)" : "Hourly rate ($)"}
                  </span>
                  <input
                    className="input input-bordered"
                    value={payRate}
                    onChange={(e) => setPayRate(e.target.value)}
                    placeholder={payType === "salary" ? "72000" : "28.50"}
                  />
                </label>
                <label className="form-control">
                  <span className="mb-1 text-sm opacity-70">Pay frequency</span>
                  <select
                    className="select select-bordered"
                    value={payFrequency}
                    onChange={(e) =>
                      setPayFrequency(e.target.value as HrPayFrequency)
                    }
                  >
                    {HR_PAY_FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control">
                  <span className="mb-1 text-sm opacity-70">Effective date</span>
                  <input
                    type="date"
                    className="input input-bordered"
                    value={payEffectiveDate}
                    onChange={(e) => setPayEffectiveDate(e.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold">Tax and deductions</h3>
              <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
                <label className="form-control sm:col-span-2">
                  <span className="mb-1 text-sm opacity-70">
                    Federal withholding
                  </span>
                  <input
                    className="input input-bordered"
                    value={federalWithholding}
                    onChange={(e) => setFederalWithholding(e.target.value)}
                    placeholder="W-4 filing status or rate note"
                  />
                </label>
                <label className="form-control sm:col-span-2">
                  <span className="mb-1 text-sm opacity-70">
                    State withholding
                  </span>
                  <input
                    className="input input-bordered"
                    value={stateWithholding}
                    onChange={(e) => setStateWithholding(e.target.value)}
                    placeholder="State tax note"
                  />
                </label>
                <label className="form-control sm:col-span-2">
                  <span className="mb-1 text-sm opacity-70">
                    Deductions notes
                  </span>
                  <textarea
                    className="textarea textarea-bordered min-h-16"
                    value={deductionsNotes}
                    onChange={(e) => setDeductionsNotes(e.target.value)}
                    placeholder="Benefits, garnishments, other deductions"
                  />
                </label>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold">Direct deposit</h3>
              <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
                <label className="form-control sm:col-span-2">
                  <span className="mb-1 text-sm opacity-70">Bank name</span>
                  <input
                    className="input input-bordered"
                    value={directDepositBank}
                    onChange={(e) => setDirectDepositBank(e.target.value)}
                  />
                </label>
                <label className="form-control">
                  <span className="mb-1 text-sm opacity-70">Account last 4</span>
                  <input
                    className="input input-bordered"
                    value={directDepositAccountLast4}
                    onChange={(e) =>
                      setDirectDepositAccountLast4(e.target.value)
                    }
                    maxLength={4}
                    placeholder="1234"
                  />
                </label>
                <label className="form-control">
                  <span className="mb-1 text-sm opacity-70">Routing last 4</span>
                  <input
                    className="input input-bordered"
                    value={directDepositRoutingLast4}
                    onChange={(e) =>
                      setDirectDepositRoutingLast4(e.target.value)
                    }
                    maxLength={4}
                    placeholder="5678"
                  />
                </label>
              </div>
            </section>

            <label className="form-control max-w-2xl">
              <span className="mb-1 text-sm opacity-70">Payroll notes</span>
              <textarea
                className="textarea textarea-bordered min-h-20"
                value={payrollNotes}
                onChange={(e) => setPayrollNotes(e.target.value)}
              />
            </label>

            <button
              type="submit"
              className="btn btn-neutral"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save payroll profile"}
            </button>
          </form>

          <section className="space-y-4 border-t border-base-300 pt-6">
            <h3 className="font-semibold">Pay history</h3>
            {stubsLoading ? (
              <p className="text-sm opacity-60">Loading pay stubs…</p>
            ) : employeeStubs.length === 0 ? (
              <p className="text-sm opacity-60">No pay stubs for this employee yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-base-300">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Pay date</th>
                      <th>Gross</th>
                      <th>Deductions</th>
                      <th>Net</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {employeeStubs.map((stub) => (
                      <tr key={stub.id}>
                        <td className="text-xs whitespace-nowrap">
                          {stub.periodStart} → {stub.periodEnd}
                        </td>
                        <td className="text-sm tabular-nums">{stub.payDate}</td>
                        <td className="text-sm tabular-nums">
                          {formatPayAmount(stub.grossPay)}
                        </td>
                        <td className="text-sm tabular-nums">
                          {formatPayAmount(stub.deductions)}
                        </td>
                        <td className="text-sm tabular-nums">
                          {formatPayAmount(stub.netPay)}
                        </td>
                        <td>
                          <span className="badge badge-sm badge-ghost">
                            {payStubStatusLabel(stub.status)}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              disabled={stubSaving}
                              onClick={() => startEditStub(stub)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs text-error"
                              disabled={stubSaving}
                              onClick={() => void deleteStub(stub)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <form
              className="grid max-w-2xl gap-3 rounded-xl border border-base-300 p-4 sm:grid-cols-2"
              onSubmit={(e) => void handleStubSubmit(e)}
            >
              <p className="font-medium sm:col-span-2">
                {editingStubId ? "Edit pay stub" : "Add pay stub"}
              </p>
              <label className="form-control">
                <span className="mb-1 text-xs opacity-70">Period start</span>
                <input
                  type="date"
                  className="input input-bordered input-sm"
                  value={stubForm.periodStart}
                  onChange={(e) =>
                    setStubForm((f) => ({ ...f, periodStart: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="form-control">
                <span className="mb-1 text-xs opacity-70">Period end</span>
                <input
                  type="date"
                  className="input input-bordered input-sm"
                  value={stubForm.periodEnd}
                  onChange={(e) =>
                    setStubForm((f) => ({ ...f, periodEnd: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="form-control">
                <span className="mb-1 text-xs opacity-70">Pay date</span>
                <input
                  type="date"
                  className="input input-bordered input-sm"
                  value={stubForm.payDate}
                  onChange={(e) =>
                    setStubForm((f) => ({ ...f, payDate: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="form-control">
                <span className="mb-1 text-xs opacity-70">Status</span>
                <select
                  className="select select-bordered select-sm"
                  value={stubForm.status}
                  onChange={(e) =>
                    setStubForm((f) => ({
                      ...f,
                      status: e.target.value as HrPayStubStatus,
                    }))
                  }
                >
                  {HR_PAY_STUB_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-control">
                <span className="mb-1 text-xs opacity-70">Gross pay ($)</span>
                <input
                  className="input input-bordered input-sm"
                  value={stubForm.grossPay}
                  onChange={(e) =>
                    setStubForm((f) => ({ ...f, grossPay: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="form-control">
                <span className="mb-1 text-xs opacity-70">Deductions ($)</span>
                <input
                  className="input input-bordered input-sm"
                  value={stubForm.deductions}
                  onChange={(e) =>
                    setStubForm((f) => ({ ...f, deductions: e.target.value }))
                  }
                  required
                />
              </label>
              <label className="form-control">
                <span className="mb-1 text-xs opacity-70">Net pay ($)</span>
                <input
                  className="input input-bordered input-sm"
                  value={stubForm.netPay}
                  onChange={(e) =>
                    setStubForm((f) => ({ ...f, netPay: e.target.value }))
                  }
                  required
                />
              </label>
              {payType === "hourly" ? (
                <label className="form-control">
                  <span className="mb-1 text-xs opacity-70">Hours worked</span>
                  <input
                    className="input input-bordered input-sm"
                    value={stubForm.hoursWorked}
                    onChange={(e) =>
                      setStubForm((f) => ({
                        ...f,
                        hoursWorked: e.target.value,
                      }))
                    }
                    placeholder="40"
                  />
                </label>
              ) : null}
              <label className="form-control sm:col-span-2">
                <span className="mb-1 text-xs opacity-70">Notes</span>
                <textarea
                  className="textarea textarea-bordered textarea-sm min-h-14"
                  value={stubForm.notes}
                  onChange={(e) =>
                    setStubForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <button
                  type="submit"
                  className="btn btn-neutral btn-sm"
                  disabled={stubSaving}
                >
                  {stubSaving
                    ? "Saving…"
                    : editingStubId
                      ? "Update pay stub"
                      : "Add pay stub"}
                </button>
                {editingStubId ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setEditingStubId(null);
                      setStubForm(EMPTY_STUB_FORM);
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function ContractsPanel({
  loading,
  employees,
  selected,
  onSelect,
  saving,
  onSave,
}: {
  loading: boolean;
  employees: HrEmployee[];
  selected: HrEmployee | null;
  onSelect: (id: string) => void;
  saving: boolean;
  onSave: (
    emp: HrEmployee,
    patch: Pick<
      HrEmployee,
      | "contractTitle"
      | "contractStart"
      | "contractEnd"
      | "contractFileName"
      | "contractNotes"
    >
  ) => void;
}) {
  const [contractTitle, setContractTitle] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  const [contractFileName, setContractFileName] = useState("");
  const [contractNotes, setContractNotes] = useState("");

  useEffect(() => {
    if (!selected) return;
    setContractTitle(selected.contractTitle);
    setContractStart(selected.contractStart);
    setContractEnd(selected.contractEnd);
    setContractFileName(selected.contractFileName);
    setContractNotes(selected.contractNotes);
  }, [selected]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 p-5 shadow-sm space-y-4">
        <EmployeePicker
          employees={employees}
          selectedId={selected?.id ?? ""}
          onSelect={onSelect}
        />
        {loading ? (
          <p className="text-sm opacity-60">Loading…</p>
        ) : !selected ? (
          <p className="text-sm opacity-60">
            Select an employee to edit their contract.
          </p>
        ) : (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              onSave(selected, {
                contractTitle,
                contractStart,
                contractEnd,
                contractFileName,
                contractNotes,
              });
            }}
          >
            <label className="form-control sm:col-span-2">
              <span className="mb-1 text-sm opacity-70">Contract title</span>
              <input
                className="input input-bordered"
                value={contractTitle}
                onChange={(e) => setContractTitle(e.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-sm opacity-70">Start</span>
              <input
                type="date"
                className="input input-bordered"
                value={contractStart}
                onChange={(e) => setContractStart(e.target.value)}
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-sm opacity-70">End (optional)</span>
              <input
                type="date"
                className="input input-bordered"
                value={contractEnd}
                onChange={(e) => setContractEnd(e.target.value)}
              />
            </label>
            <label className="form-control sm:col-span-2">
              <span className="mb-1 text-sm opacity-70">
                File name (optional)
              </span>
              <input
                type="file"
                className="file-input file-input-bordered w-full"
                accept=".pdf,image/*"
                onChange={(e) =>
                  setContractFileName(e.target.files?.[0]?.name ?? "")
                }
              />
              {contractFileName ? (
                <span className="mt-1 text-xs opacity-60">
                  Current: {contractFileName}
                </span>
              ) : null}
            </label>
            <label className="form-control sm:col-span-2">
              <span className="mb-1 text-sm opacity-70">Notes</span>
              <textarea
                className="textarea textarea-bordered min-h-20"
                value={contractNotes}
                onChange={(e) => setContractNotes(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="btn btn-neutral sm:col-span-2"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save contract"}
            </button>
          </form>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 p-5 shadow-sm">
        <h3 className="font-semibold">Contracts overview</h3>
        <ul className="mt-3 space-y-2">
          {employees.length === 0 ? (
            <li className="text-sm opacity-60">No employees yet.</li>
          ) : (
            employees.map((emp) => (
              <li
                key={emp.id}
                className="rounded-xl border border-base-300 px-3 py-2 text-sm"
              >
                <p className="font-medium">
                  {employeeDisplayName(emp)} · {emp.employeeId}
                </p>
                <p className="text-xs opacity-60">
                  {emp.contractTitle || "No contract title"}
                  {emp.contractStart ? ` · ${emp.contractStart}` : ""}
                  {emp.contractEnd ? ` → ${emp.contractEnd}` : ""}
                  {emp.contractFileName ? ` · ${emp.contractFileName}` : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
