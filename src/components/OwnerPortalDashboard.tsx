"use client";

import { useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { OwnerAccount } from "@/lib/owner-auth";
import {
  money,
  type CapitalExpenditure,
  type OwnerContract,
} from "@/lib/management";

type Props = {
  owner: OwnerAccount;
};

export function OwnerPortalDashboard({ owner }: Props) {
  const { items: contracts, saveOne: saveContract } =
    useSharedCollection<OwnerContract>(COLLECTIONS.ownerContracts);
  const { items: apps, saveOne: saveApp } = useSharedCollection<{
    id: string;
    email: string;
    accountMessage?: string;
    mgmtStatus?: string;
    contractId?: string;
  }>(COLLECTIONS.ownerApplications);
  const { items: capex, saveOne: saveCapex } =
    useSharedCollection<CapitalExpenditure>(COLLECTIONS.capitalExpenditures);

  const [msg, setMsg] = useState<string | null>(null);
  const [signer, setSigner] = useState(owner.fullName);

  const myContracts = useMemo(
    () =>
      contracts.filter(
        (c) => c.ownerEmail.toLowerCase() === owner.email.toLowerCase()
      ),
    [contracts, owner.email]
  );
  const myApps = useMemo(
    () =>
      apps.filter((a) => a.email.toLowerCase() === owner.email.toLowerCase()),
    [apps, owner.email]
  );
  const myCapex = useMemo(
    () =>
      capex.filter(
        (c) =>
          c.ownerEmail.toLowerCase() === owner.email.toLowerCase() &&
          (c.status === "pending_owner_approval" ||
            c.status === "approved_by_owner" ||
            c.status === "declined_by_owner")
      ),
    [capex, owner.email]
  );

  async function signContract(c: OwnerContract) {
    if (!signer.trim()) return;
    await saveContract({
      ...c,
      status: "signed_by_owner",
      ownerSignedAt: new Date().toISOString(),
      ownerSignatureName: signer.trim(),
    });
    const related = myApps.find(
      (a) => a.contractId === c.id || a.id === c.relatedApplicationId
    );
    if (related) {
      await saveApp({
        ...related,
        mgmtStatus: "owner_signed",
        accountMessage: `Contract signed and returned to Harborline on ${new Date().toLocaleString()}. Awaiting account provisioning.`,
      });
    }
    setMsg(
      "Contract signed and returned to Harborline Management. They will provision your full account access."
    );
  }

  async function respondCapex(
    c: CapitalExpenditure,
    status: "approved_by_owner" | "declined_by_owner"
  ) {
    await saveCapex({
      ...c,
      status,
      ownerRespondedAt: new Date().toISOString(),
      ownerResponseNotes:
        status === "approved_by_owner"
          ? "Owner approved CapEx request."
          : "Owner declined CapEx request.",
    });
    setMsg(
      status === "approved_by_owner"
        ? "CapEx approved."
        : "CapEx declined."
    );
  }

  return (
    <div className="space-y-8">
      {msg && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {msg}
        </p>
      )}

      <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Messages from Harborline</h2>
        {myApps.length === 0 ? (
          <p className="mt-2 text-sm opacity-60">No application messages.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {myApps.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm whitespace-pre-wrap"
              >
                <p className="text-xs opacity-55 mb-1">
                  Status: {a.mgmtStatus ?? "pending"}
                </p>
                {a.accountMessage || "No messages yet."}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold">Contracts to review & sign</h2>
        {myContracts.length === 0 ? (
          <p className="text-sm opacity-60">No contracts in your portal yet.</p>
        ) : (
          myContracts.map((c) => (
            <article
              key={c.id}
              className="rounded-xl border border-base-300 bg-base-100 p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.documentTitle}</p>
                  <p className="text-sm opacity-70">{c.propertyName}</p>
                </div>
                <span className="badge badge-sm capitalize">
                  {c.status.replaceAll("_", " ")}
                </span>
              </div>
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-white p-3 font-[Georgia,serif] text-xs leading-relaxed">
                {c.body}
              </pre>
              {c.status === "pending_owner_signature" ? (
                <div className="flex flex-wrap items-end gap-2">
                  <input
                    className="input input-bordered input-sm bg-white"
                    value={signer}
                    onChange={(e) => setSigner(e.target.value)}
                    placeholder="Type your full legal name"
                  />
                  <button
                    type="button"
                    className="btn btn-neutral btn-sm"
                    onClick={() => void signContract(c)}
                  >
                    Sign & return to Harborline
                  </button>
                </div>
              ) : (
                <p className="text-sm text-emerald-800">
                  Signed
                  {c.ownerSignatureName
                    ? ` by ${c.ownerSignatureName}`
                    : ""}
                  {c.ownerSignedAt
                    ? ` on ${new Date(c.ownerSignedAt).toLocaleString()}`
                    : ""}
                </p>
              )}
            </article>
          ))
        )}
      </section>

      <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold">Capital expenditure requests</h2>
        {myCapex.length === 0 ? (
          <p className="text-sm opacity-60">No CapEx requests right now.</p>
        ) : (
          myCapex.map((c) => (
            <article
              key={c.id}
              className="rounded-xl border border-base-300 bg-base-100 p-4 space-y-2"
            >
              <p className="font-semibold">{c.title}</p>
              <p className="text-sm opacity-70">
                {c.propertyName} · {money(c.estimatedCost)} · {c.category}
              </p>
              <p className="text-sm">{c.description}</p>
              <p className="text-sm opacity-80">{c.justification}</p>
              {c.status === "pending_owner_approval" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-neutral btn-sm"
                    onClick={() => void respondCapex(c, "approved_by_owner")}
                  >
                    Approve CapEx
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => void respondCapex(c, "declined_by_owner")}
                  >
                    Decline
                  </button>
                </div>
              ) : (
                <span className="badge badge-sm capitalize">
                  {c.status.replaceAll("_", " ")}
                </span>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
