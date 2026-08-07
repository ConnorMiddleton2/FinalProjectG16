"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  accumulatedDepreciation,
  annualDepreciationForYear,
  ASSET_CATEGORIES,
  ASSET_OWNERSHIPS,
  assetCategoryLabel,
  assetOwnershipLabel,
  DEPRECIATION_METHODS,
  depreciationMethodLabel,
  emptyPropertyAsset,
  netBookValue,
  normalizeAssetOwnership,
  seedPropertyAssets,
  type PropertyAsset,
} from "@/lib/property-assets";
import { money } from "@/lib/money";
import {
  ensurePropertyAssetsAction,
  savePropertyAssetAction,
} from "@/app/ops/assets/actions";

export function AssetsDashboard() {
  const {
    items: assets,
    loading,
    error,
    refresh,
    saveOne,
  } = useSharedCollection<PropertyAsset>(
    COLLECTIONS.propertyAssets,
    seedPropertyAssets
  );
  const { items: properties } = useSharedCollection<ManagementContractDraft>(
    COLLECTIONS.managedProperties
  );

  const [propertyFilter, setPropertyFilter] = useState("all");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<PropertyAsset | null>(null);
  const [isNew, setIsNew] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    void (async () => {
      setBusy(true);
      try {
        const result = await ensurePropertyAssetsAction();
        if (result.created > 0) {
          setMsg(
            `Seeded ${result.created} assets across ${result.propertyCount} properties.`
          );
          setTimeout(() => setMsg(null), 4000);
        }
        await refresh();
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return [...assets]
      .filter(
        (a) => propertyFilter === "all" || a.propertyId === propertyFilter
      )
      .sort((a, b) => {
        const p = a.propertyName.localeCompare(b.propertyName);
        if (p !== 0) return p;
        return a.name.localeCompare(b.name);
      });
  }, [assets, propertyFilter]);

  const totals = useMemo(() => {
    let cost = 0;
    let accum = 0;
    let depYear = 0;
    for (const a of filtered) {
      cost += a.costBasis;
      accum += accumulatedDepreciation(a, year, 12);
      depYear += annualDepreciationForYear(a, year);
    }
    return {
      cost: Math.round(cost * 100) / 100,
      accum: Math.round(accum * 100) / 100,
      nbv: Math.round((cost - accum) * 100) / 100,
      depYear: Math.round(depYear * 100) / 100,
    };
  }, [filtered, year]);

  function startAdd() {
    const preferred =
      properties.find((p) => p.id === propertyFilter) ?? properties[0];
    if (!preferred) {
      setMsg("Add a managed property before creating assets.");
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    setIsNew(true);
    setEditing(
      emptyPropertyAsset({
        propertyId: preferred.id,
        propertyName: preferred.propertyName,
      })
    );
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.propertyId || !editing.name.trim()) {
      setMsg("Property and asset name are required.");
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    setBusy(true);
    try {
      const result = await savePropertyAssetAction({
        ...editing,
        ownership: normalizeAssetOwnership(editing.ownership),
      });
      if ("ok" in result && result.ok) {
        await saveOne(result.asset);
        setEditing(null);
        setIsNew(false);
        setMsg(isNew ? "Asset added." : "Asset saved.");
        setTimeout(() => setMsg(null), 2500);
      } else if ("error" in result) {
        setMsg(result.error);
        setTimeout(() => setMsg(null), 3500);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {msg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {msg}
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--harbor-deep)]/15 bg-[var(--harbor-sand)]/40 px-4 py-3 text-sm text-[var(--harbor-ink)]/80">
        Track equipment and PP&amp;E operationally per property. Assets default
        to <span className="font-medium">property owner</span> ownership — they
        are not placed on CPMC&apos;s books unless you mark them as
        management-company owned.
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="form-control max-w-sm">
          <span className="mb-1 text-sm opacity-70">Filter by property</span>
          <select
            className="select select-bordered bg-white"
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
          >
            <option value="all">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.propertyName}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-sm border-0 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
            disabled={busy || properties.length === 0}
            onClick={startAdd}
          >
            Add asset
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={busy}
            onClick={() =>
              void (async () => {
                setBusy(true);
                try {
                  await ensurePropertyAssetsAction();
                  await refresh();
                  setMsg("Assets synced from managed properties.");
                  setTimeout(() => setMsg(null), 3000);
                } finally {
                  setBusy(false);
                }
              })()
            }
          >
            Sync assets from properties
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Cost basis" value={money(totals.cost)} />
        <Kpi label={`Accum. dep. (${year})`} value={money(totals.accum)} />
        <Kpi label="Net book value" value={money(totals.nbv)} />
        <Kpi label={`${year} depreciation`} value={money(totals.depYear)} />
      </div>

      {loading ? (
        <p className="text-sm opacity-60">Loading assets…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/50 px-4 py-10 text-center text-sm opacity-60">
          No assets yet. Add an asset or sync from managed properties.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 shadow-sm">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Property</th>
                <th>Asset</th>
                <th>Category</th>
                <th>Ownership</th>
                <th>Placed in service</th>
                <th>Method</th>
                <th>Life</th>
                <th className="text-right">Cost</th>
                <th className="text-right">NBV</th>
                <th className="text-right">{year} dep.</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const ownership = normalizeAssetOwnership(a.ownership);
                return (
                  <tr key={a.id}>
                    <td className="max-w-[10rem] truncate">{a.propertyName}</td>
                    <td>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs opacity-55 line-clamp-1">
                        {a.description}
                      </p>
                    </td>
                    <td>{assetCategoryLabel(a.category)}</td>
                    <td className="text-xs">
                      {ownership === "management_company" ? (
                        <span className="badge badge-warning badge-sm badge-outline">
                          CPMC
                        </span>
                      ) : (
                        <span className="badge badge-ghost badge-sm">
                          Owner
                        </span>
                      )}
                      <p className="mt-0.5 opacity-50">
                        {assetOwnershipLabel(ownership).split(" (")[0]}
                      </p>
                    </td>
                    <td className="whitespace-nowrap">{a.placedInServiceDate}</td>
                    <td className="text-xs">
                      {depreciationMethodLabel(a.depreciationMethod)}
                    </td>
                    <td>
                      {a.usefulLifeYears > 0 ? `${a.usefulLifeYears} yr` : "—"}
                    </td>
                    <td className="text-right tabular-nums">
                      {money(a.costBasis)}
                    </td>
                    <td className="text-right tabular-nums">
                      {money(netBookValue(a, year))}
                    </td>
                    <td className="text-right tabular-nums">
                      {money(annualDepreciationForYear(a, year))}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                          setIsNew(false);
                          setEditing({
                            ...a,
                            ownership: normalizeAssetOwnership(a.ownership),
                          });
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--harbor-ink)]/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              {isNew ? "Add asset" : "Edit asset"}
            </h2>
            <p className="mt-1 text-sm opacity-60">
              {isNew
                ? "Defaults to property-owner ownership (operational tracking only)."
                : editing.propertyName}
            </p>
            <div className="mt-4 grid gap-3">
              <Field label="Property">
                <select
                  className="select select-bordered w-full"
                  value={editing.propertyId}
                  onChange={(e) => {
                    const p = properties.find((x) => x.id === e.target.value);
                    if (!p) return;
                    setEditing({
                      ...editing,
                      propertyId: p.id,
                      propertyName: p.propertyName,
                    });
                  }}
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.propertyName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ownership">
                <select
                  className="select select-bordered w-full"
                  value={normalizeAssetOwnership(editing.ownership)}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      ownership: normalizeAssetOwnership(e.target.value),
                    })
                  }
                >
                  {ASSET_OWNERSHIPS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Name">
                <input
                  className="input input-bordered w-full"
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </Field>
              <Field label="Category">
                <select
                  className="select select-bordered w-full"
                  value={editing.category}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      category: e.target
                        .value as PropertyAsset["category"],
                    })
                  }
                >
                  {ASSET_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Description">
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={2}
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cost basis">
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={editing.costBasis}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        costBasis: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
                <Field label="Salvage value">
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={editing.salvageValue}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        salvageValue: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Useful life (years)">
                  <input
                    type="number"
                    className="input input-bordered w-full"
                    value={editing.usefulLifeYears}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        usefulLifeYears: Number(e.target.value) || 0,
                      })
                    }
                  />
                </Field>
                <Field label="Placed in service">
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={editing.placedInServiceDate}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        placedInServiceDate: e.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <Field label="Depreciation method">
                <select
                  className="select select-bordered w-full"
                  value={editing.depreciationMethod}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      depreciationMethod: e.target
                        .value as PropertyAsset["depreciationMethod"],
                    })
                  }
                >
                  {DEPRECIATION_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setEditing(null);
                  setIsNew(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm border-0 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                disabled={busy}
                onClick={() => void handleSave()}
              >
                {isNew ? "Add asset" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/90 px-4 py-3 shadow-sm">
      <p className="text-[10px] uppercase tracking-wide opacity-55">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="form-control w-full">
      <span className="mb-1 text-sm opacity-70">{label}</span>
      {children}
    </label>
  );
}
