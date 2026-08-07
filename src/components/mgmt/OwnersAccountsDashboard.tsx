"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Building2,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  PlusCircle,
  RefreshCw,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { OwnerAccount, OwnerApplication } from "@/lib/owner-auth";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  assetCategoryLabel,
  type PropertyAsset,
} from "@/lib/property-assets";
import {
  isHashedPassword,
  ownerPasswordForAdmin,
} from "@/lib/owner-credentials";
import {
  createOwnerAccountFromManagement,
  deleteOwnerAccountFromManagement,
  resetOwnerAccountPassword,
  setOwnerAccountPassword,
  updateOwnerAccountProfile,
} from "@/app/ops/management/owners/actions";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <span className="text-xs font-medium text-[var(--harbor-ink)]/65">
        {label}
      </span>
      {children}
    </div>
  );
}

function money(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

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
  const { items: assets } = useSharedCollection<PropertyAsset>(
    COLLECTIONS.propertyAssets
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewPropertyId, setPreviewPropertyId] = useState<string | null>(
    null
  );
  const [query, setQuery] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
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

  const previewProperty =
    selectedProperties.find((p) => p.id === previewPropertyId) ?? null;

  const previewAssets = useMemo(() => {
    if (!previewProperty) return [];
    return assets
      .filter((a) => a.propertyId === previewProperty.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assets, previewProperty]);

  function flash(message: string) {
    setMsg(message);
    setTimeout(() => setMsg(null), 5000);
  }

  function selectOwner(owner: OwnerAccount) {
    setSelectedId(owner.id);
    setFullName(owner.fullName || "");
    setEmail(owner.email || "");
    setPhone(owner.phone || "");
    setCompanyName(owner.companyName || "");
    setNotes(owner.notes || "");
    setManualPassword("");
    setCreating(false);
    setPreviewPropertyId(null);
  }

  useEffect(() => {
    if (!selected) return;
    setSelectedId(selected.id);
    setFullName(selected.fullName || "");
    setEmail(selected.email || "");
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
        email,
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
      flash("Owner account saved.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAccount() {
    if (!selected) return;
    const label = selected.fullName || selected.email;
    const ok = window.confirm(
      `Remove owner account for “${label}”?\n\nThis deletes their portal login. Linked properties stay in the system but will no longer be tied to this account.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      const result = await deleteOwnerAccountFromManagement({
        ownerId: selected.id,
      });
      if ("error" in result) {
        flash(result.error ?? "Something went wrong.");
        return;
      }
      setOwners((prev) => prev.filter((o) => o.id !== selected.id));
      setSelectedId(null);
      flash(`Removed owner account ${result.email}.`);
      await refresh();
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
              <p className="text-sm font-semibold">Edit account</p>
              <Field label="Full name">
                <input
                  className="input input-bordered w-full"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Login email">
                <input
                  type="email"
                  className="input input-bordered w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field label="Phone">
                <input
                  className="input input-bordered w-full"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
              <Field label="Company / entity">
                <input
                  className="input input-bordered w-full"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </Field>
              <Field label="Internal notes">
                <textarea
                  className="textarea textarea-bordered min-h-20 w-full"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
              <p className="text-xs opacity-55">
                Created {selected.createdAt?.slice(0, 10) || "—"}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="btn btn-neutral btn-sm"
                  disabled={busy}
                >
                  Save changes
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-error btn-sm gap-1"
                  disabled={busy}
                  onClick={() => void handleDeleteAccount()}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove account
                </button>
              </div>
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
                  {selectedProperties.map((p) => {
                    const assetCount = assets.filter(
                      (a) => a.propertyId === p.id
                    ).length;
                    const previewOpen = previewPropertyId === p.id;
                    return (
                      <li
                        key={p.id}
                        className="rounded-lg border border-base-300 px-3 py-2.5 text-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">{p.propertyName}</p>
                            <p className="text-xs opacity-60">
                              {[p.streetAddress, p.city, p.state]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                            <p className="mt-0.5 text-xs opacity-50">
                              {assetCount} tracked asset
                              {assetCount === 1 ? "" : "s"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs gap-1"
                              onClick={() =>
                                setPreviewPropertyId(previewOpen ? null : p.id)
                              }
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {previewOpen ? "Hide preview" : "Preview assets"}
                            </button>
                            <Link
                              href={`/ops/properties/${encodeURIComponent(p.id)}`}
                              className="btn btn-neutral btn-xs gap-1"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Property viewer
                            </Link>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {previewProperty ? (
                <div className="rounded-xl border border-[var(--harbor-deep)]/15 bg-[var(--harbor-sand)]/40 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {previewProperty.propertyName}
                      </p>
                      <p className="text-xs opacity-60">
                        Asset & property preview
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square"
                      aria-label="Close preview"
                      onClick={() => setPreviewPropertyId(null)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-3">
                    {[
                      ["Type", previewProperty.propertyType || "—"],
                      ["Units / suites", previewProperty.unitsSuites || "—"],
                      ["Rentable SF", previewProperty.rentableSf || "—"],
                      [
                        "Occupancy",
                        previewProperty.occupancyPercent
                          ? `${previewProperty.occupancyPercent}%`
                          : "—",
                      ],
                      [
                        "Mgmt fee",
                        previewProperty.feePercent
                          ? `${previewProperty.feePercent}%`
                          : "—",
                      ],
                      ["Year built", previewProperty.yearBuilt || "—"],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="opacity-55">{label}</dt>
                        <dd className="font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide opacity-55">
                      Tracked assets
                    </p>
                    {previewAssets.length === 0 ? (
                      <p className="text-sm opacity-60">
                        No PP&amp;E assets on file for this property.
                      </p>
                    ) : (
                      <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                        {previewAssets.map((a) => (
                          <li
                            key={a.id}
                            className="rounded-md border border-base-300/80 bg-white/80 px-2.5 py-1.5 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">{a.name}</p>
                                <p className="opacity-55">
                                  {assetCategoryLabel(a.category)}
                                </p>
                              </div>
                              <p className="shrink-0 tabular-nums font-medium">
                                {money(a.costBasis)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <Link
                    href={`/ops/properties/${encodeURIComponent(previewProperty.id)}`}
                    className="btn btn-neutral btn-sm gap-1 w-full sm:w-auto"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in property viewer
                  </Link>
                </div>
              ) : null}
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
