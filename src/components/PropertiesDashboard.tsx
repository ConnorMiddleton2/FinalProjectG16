"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  ClipboardList,
  FilePlus2,
  LogOut,
} from "lucide-react";
import {
  AcquireManagementContractForm,
  useSavedContracts,
} from "@/components/AcquireManagementContractForm";
import { PropertyDetailView } from "@/components/PropertyDetailView";
import { teamLogout } from "@/app/team/actions";
import type { ManagementContractDraft } from "@/lib/management-contract";

type Props = {
  pendingApplicationCount: number;
};

export function PropertiesDashboard({ pendingApplicationCount }: Props) {
  const [mode, setMode] = useState<"list" | "acquire" | "detail">("list");
  const { contracts, refresh, loading, error } = useSavedContracts();
  const [justSaved, setJustSaved] = useState<ManagementContractDraft | null>(
    null
  );
  const [selected, setSelected] = useState<ManagementContractDraft | null>(
    null
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#e8f4f6_0%,#f3efe6_100%)]">
      <header className="border-b border-[var(--harbor-deep)]/10 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-display text-2xl leading-tight">Harborline</p>
            <p className="text-xs opacity-70">Properties</p>
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
        {mode !== "detail" && (
          <Link
            href="/ops"
            className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to operations
          </Link>
        )}

        {mode === "detail" && selected ? (
          <PropertyDetailView
            contract={selected}
            onBack={() => {
              setSelected(null);
              setMode("list");
            }}
          />
        ) : mode === "list" ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-4xl tracking-tight text-[var(--harbor-ink)]">
                  Properties
                </h1>
                <p className="mt-2 max-w-2xl text-[var(--harbor-ink)]/65">
                  Track managed assets and open any property for full occupancy,
                  tenant, and performance details.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/ops/properties/applications"
                  className="btn btn-outline gap-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  Pending applications
                  <span className="badge badge-neutral">
                    {pendingApplicationCount}
                  </span>
                </Link>
                <button
                  type="button"
                  className="btn btn-neutral gap-2"
                  onClick={() => {
                    setJustSaved(null);
                    setMode("acquire");
                  }}
                >
                  <FilePlus2 className="h-4 w-4" />
                  Acquire new management contract
                </button>
              </div>
            </div>

            {justSaved && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                Saved <strong>{justSaved.propertyName}</strong> to the shared team
                database — classmates will see it after refresh.
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {loading ? (
              <div className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/50 px-6 py-16 text-center text-sm opacity-70">
                Loading shared properties…
              </div>
            ) : contracts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/50 px-6 py-16 text-center">
                <Building2 className="mx-auto h-8 w-8 text-[var(--harbor-mid)] opacity-70" />
                <p className="mt-3 font-medium text-[var(--harbor-ink)]">
                  No managed assets yet
                </p>
                <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
                  Start with Acquire new management contract to capture a full
                  asset intake package.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {contracts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelected(c);
                      setMode("detail");
                    }}
                    className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--harbor-mid)]"
                  >
                    <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
                      {c.propertyName}
                    </h2>
                    <p className="mt-1 text-sm opacity-70">
                      {c.streetAddress}
                      {c.city ? `, ${c.city}` : ""}
                      {c.state ? `, ${c.state}` : ""} {c.zip}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="badge badge-outline capitalize">
                        {c.propertyType}
                      </span>
                      {c.rentableSf && (
                        <span className="badge badge-ghost">
                          {c.rentableSf} RSF
                        </span>
                      )}
                      {c.occupancyPercent && (
                        <span className="badge badge-ghost">
                          {c.occupancyPercent}% occupied
                        </span>
                      )}
                      {c.tenantCount && (
                        <span className="badge badge-ghost">
                          {c.tenantCount} tenants
                        </span>
                      )}
                      {c.feePercent && (
                        <span className="badge badge-ghost">
                          {c.feePercent}% mgmt fee
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm opacity-65">
                      Owner: {c.ownerLegalName || "—"} · Start:{" "}
                      {c.contractStartDate || "—"}
                    </p>
                    <p className="mt-3 text-sm font-medium text-[var(--harbor-mid)]">
                      Open full property details →
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <AcquireManagementContractForm
            onCancel={() => setMode("list")}
            onSaved={(draft) => {
              setJustSaved(draft);
              void refresh();
              setMode("list");
            }}
          />
        )}
      </main>
    </div>
  );
}
