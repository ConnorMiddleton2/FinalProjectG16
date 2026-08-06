"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  PlusCircle,
  RefreshCw,
  UserRound,
} from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { OwnerAccount, OwnerApplication } from "@/lib/owner-auth";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  isHashedPassword,
  ownerPasswordForAdmin,
} from "@/lib/owner-credentials";
import {
  createOwnerAccountFromManagement,
  resetOwnerAccountPassword,
  setOwnerAccountPassword,
  updateOwnerAccountProfile,
} from "@/app/ops/management/owners/actions";

export function OwnersAccountsDashboard() {
  const {
    items: owners,
    setItems: setOwners,
    loading,
    error,
    refresh,
  } = useSharedCollection<OwnerAccount>(COLLECTIONS.ownerAccounts);
  const { items: applications } = useSharedCollection<OwnerApplication>(
    COLLECTIONS.ownerApplications
  );
  const { items: properties } = useSharedCollection<ManagementContractDraft>(
    COLLECTIONS.managedProperties
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [notes, setNotes] = useState("");
  const [manualPassword, setManualPassword] = useState("");

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const sorted = useMemo(
    () =>
      [...owners].sort((a, b) =>
        (a.fullName || a.email).localeCompare(b.fullName || b.email)
      ),
    [owners]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((o) => {
      const hay = [
        o.fullName,
        o.email,
        o.companyName,
        o.phone,
        o.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [sorted, query]);

  const selected =
    owners.find((o) => o.id === selectedId) ?? filtered[0] ?? null;

  const selectedApps = useMemo(() => {
    if (!selected) return [];
    const email = selected.email.toLowerCase();
    return applications.filter((a) => a.email.toLowerCase() === email);
  }, [applications, selected]);

  const selectedProperties = useMemo(() => {
    if (!selected) return [];
    const email = selected.email.toLowerCase();
    return properties.filter(
      (p) =>
        (p.ownerAccountId && p.ownerAccountId === selected.id) ||
        (p.ownerEmail && p.ownerEmail.toLowerCase() === email)
    );
  }, [properties, selected]);

  function flash(message: string) {
    setMsg(message);
    setTimeout(() => setMsg(null), 5000);
  }

  function selectOwner(owner: OwnerAccount) {
    setSelectedId(owner.id);
    setFullName(owner.fullName || "");
    setPhone(owner.phone || "");
    setCompanyName(owner.companyName || "");
    setNotes(owner.notes || "");
    setManualPassword("");
    setCreating(false);
  }

  useEffect(() => {
    if (!selected) return;
    setSelectedId(selected.id);
    setFullName(selected.fullName || "");
    setPhone(selected.phone || "");
    setCompanyName(selected.companyName || "");
    setNotes(selected.notes || "");
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- form sync on selection

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      const result = await updateOwnerAccountProfile({
        ownerId: selected.id,
        fullName,
        phone,
        companyName,
        notes,
      });
      if ("error" in result) {
        flash(result.error ?? "Something went wrong.");
        return;
      }
      setOwners((prev) =>
        prev.map((o) => (o.id === result.account.id ? result.account : o))
      );
      flash("Owner profile saved.");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword() {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await resetOwnerAccountPassword({
        ownerId: selected.id,
        email: selected.email,
      });
      if ("error" in result) {
        flash(result.error ?? "Something went wrong.");
        return;
      }
      setOwners((prev) =>
        prev.map((o) =>
          o.id === selected.id
            ? {
                ...o,
                passwordReveal: result.temporaryPassword,
                mustChangePassword: true,
              }
            : o
        )
      );
      flash(
        `Temporary password issued for ${result.email}: ${result.temporaryPassword}`
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault();
    if (!selected || !manualPassword.trim()) return;
    setBusy(true);
    try {
      const result = await setOwnerAccountPassword({
        ownerId: selected.id,
        email: selected.email,
        password: manualPassword,
        mustChangePassword: false,
      });
      if ("error" in result) {
        flash(result.error ?? "Something went wrong.");
        return;
      }
      setOwners((prev) =>
        prev.map((o) =>
          o.id === selected.id
            ? {
                ...o,
                passwordReveal: result.password,
                mustChangePassword: false,
              }
            : o
        )
      );
      setManualPassword("");
      flash(`Password updated for ${result.email}.`);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await createOwnerAccountFromManagement({
        fullName: newName,
        email: newEmail,
        password: newPassword || undefined,
        phone: newPhone,
        companyName: newCompany,
      });
      if ("error" in result) {
        flash(result.error ?? "Something went wrong.");
        return;
      }
      flash(
        `Created ${result.email} — password: ${result.password}`
      );
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewCompany("");
      setNewPassword("");
      setCreating(false);
      await refresh();
      setSelectedId(result.accountId);
    } finally {
      setBusy(false);
    }
  }

  const visiblePassword = selected
    ? ownerPasswordForAdmin(selected)
    : "";

  return (
    <div className="space-y-4">
      {msg ? (
        <div className="rounded-xl border border-[var(--harbor-mid)]/30 bg-white/90 px-4 py-3 text-sm">
          {msg}
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="form-control min-w-[16rem] flex-1 max-w-md">
          <span className="sr-only">Search owners</span>
          <input
            className="input input-bordered bg-white"
            placeholder="Search name, email, company…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn-neutral gap-2"
          onClick={() => setCreating((v) => !v)}
        >
          <PlusCircle className="h-4 w-4" />
          {creating ? "Cancel" : "New owner account"}
        </button>
      </div>

      {creating ? (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="grid gap-3 rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 p-5 shadow-sm sm:grid-cols-2"
        >
          <h3 className="font-semibold sm:col-span-2">Create owner account</h3>
          <input
            className="input input-bordered"
            placeholder="Full name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
          <input
            type="email"
            className="input input-bordered"
            placeholder="Email (login)"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <input
            className="input input-bordered"
            placeholder="Phone"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
          />
          <input
            className="input input-bordered"
            placeholder="Company / entity"
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
          />
          <input
            className="input input-bordered sm:col-span-2"
            placeholder="Password (optional — auto-generated if blank)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-neutral sm:col-span-2"
            disabled={busy}
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 shadow-sm">
          <table className="table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Email</th>
                <th>Password</th>
                <th>Assets</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="opacity-60">
                    Loading owner accounts…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="opacity-60">
                    No owner accounts found.
                  </td>
                </tr>
              ) : (
                filtered.map((owner) => {
                  const pwd = ownerPasswordForAdmin(owner);
                  const assetCount = properties.filter(
                    (p) =>
                      p.ownerAccountId === owner.id ||
                      (p.ownerEmail || "").toLowerCase() ===
                        owner.email.toLowerCase()
                  ).length;
                  const active = selected?.id === owner.id;
                  return (
                    <tr
                      key={owner.id}
                      className={`cursor-pointer ${active ? "bg-[var(--harbor-deep)]/8" : ""}`}
                      onClick={() => selectOwner(owner)}
                    >
                      <td>
                        <p className="font-medium">
                          {owner.fullName || "—"}
                        </p>
                        <p className="text-xs opacity-55">
                          {owner.companyName || "—"}
                        </p>
                      </td>
                      <td className="text-sm">{owner.email}</td>
                      <td className="font-mono text-xs">
                        {pwd ? (
                          showPassword ? (
                            pwd
                          ) : (
                            "••••••••"
                          )
                        ) : (
                          <span className="opacity-55">Reset to reveal</span>
                        )}
                      </td>
                      <td className="tabular-nums">{assetCount}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {selected ? (
          <div className="space-y-4 rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-lg font-semibold">
                  <UserRound className="h-5 w-5 opacity-70" />
                  {selected.fullName}
                </p>
                <p className="mt-1 text-sm opacity-65">{selected.email}</p>
                <p className="mt-1 font-mono text-xs opacity-50">
                  Account ID: {selected.id}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-1"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {showPassword ? "Hide" : "Show"} passwords
              </button>
            </div>

            <section className="rounded-xl border border-base-300 bg-base-100/60 p-4 space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="h-4 w-4" />
                Login credentials
              </p>
              <p className="text-sm">
                Email:{" "}
                <span className="font-mono">{selected.email}</span>
              </p>
              <p className="text-sm">
                Password:{" "}
                <span className="font-mono font-semibold">
                  {visiblePassword
                    ? showPassword
                      ? visiblePassword
                      : "••••••••"
                    : "Not on file — reset or set a password"}
                </span>
              </p>
              <p className="text-xs opacity-60">
                Storage:{" "}
                {isHashedPassword(selected.password)
                  ? "hashed in database"
                  : "legacy plaintext in database"}
                {selected.mustChangePassword
                  ? " · must change on next login"
                  : ""}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  className="btn btn-outline btn-sm gap-1"
                  disabled={busy}
                  onClick={() => void handleResetPassword()}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reset &amp; show temp password
                </button>
              </div>
              <form
                onSubmit={(e) => void handleSetPassword(e)}
                className="flex flex-wrap gap-2 pt-2"
              >
                <input
                  className="input input-bordered input-sm flex-1 min-w-[12rem]"
                  placeholder="Set specific password"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-neutral btn-sm"
                  disabled={busy || manualPassword.trim().length < 8}
                >
                  Set password
                </button>
              </form>
            </section>

            <form onSubmit={(e) => void handleSaveProfile(e)} className="space-y-3">
              <p className="text-sm font-semibold">Account details</p>
              <label className="form-control">
                <span className="mb-1 text-xs opacity-70">Full name</span>
                <input
                  className="input input-bordered"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>
              <label className="form-control">
                <span className="mb-1 text-xs opacity-70">Phone</span>
                <input
                  className="input input-bordered"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label className="form-control">
                <span className="mb-1 text-xs opacity-70">Company / entity</span>
                <input
                  className="input input-bordered"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </label>
              <label className="form-control">
                <span className="mb-1 text-xs opacity-70">Internal notes</span>
                <textarea
                  className="textarea textarea-bordered min-h-20"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
              <p className="text-xs opacity-55">
                Created {selected.createdAt?.slice(0, 10) || "—"}
              </p>
              <button
                type="submit"
                className="btn btn-neutral btn-sm"
                disabled={busy}
              >
                Save account details
              </button>
            </form>

            <section className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Building2 className="h-4 w-4" />
                Properties under management
              </p>
              {selectedProperties.length === 0 ? (
                <p className="text-sm opacity-60">No linked properties yet.</p>
              ) : (
                <ul className="space-y-2">
                  {selectedProperties.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-lg border border-base-300 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{p.propertyName}</p>
                      <p className="text-xs opacity-60">
                        {[p.streetAddress, p.city, p.state]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {selectedApps.length > 0 ? (
              <section className="space-y-2">
                <p className="text-sm font-semibold">Related applications</p>
                <ul className="space-y-1 text-sm">
                  {selectedApps.map((a) => (
                    <li key={a.id} className="opacity-80">
                      {a.status}
                      {a.mgmtStatus ? ` · ${a.mgmtStatus}` : ""} ·{" "}
                      {a.createdAt?.slice(0, 10)}
                      {a.loginRevealPassword
                        ? ` · app reveal: ${a.loginRevealPassword}`
                        : ""}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/20 p-8 text-sm opacity-60">
            Select an owner account to view credentials and details.
          </div>
        )}
      </div>
    </div>
  );
}
