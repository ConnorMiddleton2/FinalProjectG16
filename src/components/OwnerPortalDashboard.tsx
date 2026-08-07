"use client";

import { useMemo, useState, useTransition } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { OwnerAccount } from "@/lib/owner-auth";
import {
  CAPEX_PAYMENT_METHODS,
  capexPaymentLabel,
  money,
  type CapExPaymentMethod,
  type CapitalExpenditure,
  type OwnerContract,
} from "@/lib/management";
import { signOwnerProposedContract } from "@/lib/owner-application-portal";

type Props = {
  owner: OwnerAccount;
};

export function OwnerPortalDashboard({ owner }: Props) {
  const { items: contracts, refresh: refreshContracts } =
    useSharedCollection<OwnerContract>(COLLECTIONS.ownerContracts);
  const { items: apps, refresh: refreshApps } = useSharedCollection<{
    id: string;
    email: string;
    accountMessage?: string;
    mgmtStatus?: string;
    contractId?: string;
    status?: string;
  }>(COLLECTIONS.ownerApplications);
  const { items: capex, saveOne: saveCapex } =
    useSharedCollection<CapitalExpenditure>(COLLECTIONS.capitalExpenditures);

  const [msg, setMsg] = useState<string | null>(null);
  const [signer, setSigner] = useState(owner.fullName);
  const [pending, startTransition] = useTransition();
  const [paymentByCapex, setPaymentByCapex] = useState<
    Record<string, CapExPaymentMethod>
  >({});

  const myContracts = useMemo(() => {
    const mine = contracts.filter(
      (c) => c.ownerEmail.toLowerCase() === owner.email.toLowerCase()
    );
    // One agreement per application (or standalone id)
    const byKey = new Map<string, OwnerContract>();
    for (const c of mine) {
      const key = c.relatedApplicationId || c.id;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, c);
        continue;
      }
      const rank = (x: OwnerContract) =>
        x.status === "fully_executed"
          ? 3
          : x.status === "signed_by_owner"
            ? 2
            : x.sentAt
              ? 1
              : 0;
      if (rank(c) >= rank(existing)) byKey.set(key, c);
    }
    return [...byKey.values()];
  }, [contracts, owner.email]);
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

  function signContract(c: OwnerContract) {
    if (!signer.trim()) return;
    const related = myApps.find(
      (a) => a.contractId === c.id || a.id === c.relatedApplicationId
    );
    if (!related) {
      setMsg("Could not find the related application for this contract.");
      return;
    }
    startTransition(async () => {
      const result = await signOwnerProposedContract({
        contractId: c.id,
        email: owner.email,
        applicationId: related.id,
        signatureName: signer.trim(),
      });
      if ("error" in result) {
        setMsg(result.error ?? "Could not sign the agreement.");
        return;
      }
      await refreshContracts();
      await refreshApps();
      setMsg(
        result.temporaryPassword
          ? `Signed. Your assets are on the dashboard. Temp password: ${result.temporaryPassword}`
          : "Signed. Your assets now appear under management contracts on your dashboard."
      );
    });
  }

  async function respondCapex(
    c: CapitalExpenditure,
    status: "approved_by_owner" | "declined_by_owner"
  ) {
    if (status === "approved_by_owner") {
      const method = paymentByCapex[c.id];
      if (!method) {
        setMsg("Select how you want to pay before approving.");
        return;
      }
      await saveCapex({
        ...c,
        status,
        paymentMethod: method,
        ownerRespondedAt: new Date().toISOString(),
        ownerResponseNotes: `Owner approved CapEx. Payment preference: ${capexPaymentLabel(method)}.`,
      });
      setMsg(
        `CapEx approved · ${capexPaymentLabel(method)}. CPMC will follow up.`
      );
      return;
    }
    await saveCapex({
      ...c,
      status,
      ownerRespondedAt: new Date().toISOString(),
      ownerResponseNotes: "Owner declined CapEx request.",
    });
    setMsg("CapEx declined.");
  }

  return (
    <div className="space-y-8">
      {msg && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {msg}
        </p>
      )}

      <section className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Messages from CPMC</h2>
        {myApps.length === 0 ? (
          <p className="mt-2 text-sm opacity-60">No application messages.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {myApps.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm whitespace-pre-wrap"
              >
                <p className="mb-1 text-xs opacity-55">
                  Status: {a.mgmtStatus ?? "pending"}
                </p>
                {a.accountMessage || "No messages yet."}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Contracts to review & sign</h2>
        {myContracts.length === 0 ? (
          <p className="text-sm opacity-60">No contracts in your portal yet.</p>
        ) : (
          myContracts.map((c) => (
            <article
              key={c.id}
              className="space-y-2 rounded-xl border border-base-300 bg-base-100 p-4"
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
                    disabled={pending}
                    onClick={() => void signContract(c)}
                  >
                    {pending ? "Signing…" : "Sign & return to CPMC"}
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

      <section className="space-y-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/85 p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Capital expenditure requests</h2>
        <p className="text-sm opacity-65">
          Review vendor invoices carefully before approving. Choose how you want
          to fund the work when you approve.
        </p>
        {myCapex.length === 0 ? (
          <p className="text-sm opacity-60">No CapEx requests right now.</p>
        ) : (
          myCapex.map((c) => (
            <article
              key={c.id}
              className="space-y-3 rounded-xl border border-base-300 bg-base-100 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.title}</p>
                  <p className="text-sm opacity-70">
                    {c.propertyName} · {money(c.estimatedCost)} ·{" "}
                    {c.category.replaceAll("_", " ")}
                  </p>
                </div>
                <span className="badge badge-sm capitalize">
                  {c.status.replaceAll("_", " ")}
                </span>
              </div>
              <p className="text-sm">{c.description}</p>
              <p className="text-sm opacity-80">{c.justification}</p>

              <div className="rounded-lg border border-[var(--harbor-deep)]/10 bg-white p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-55">
                  Vendor invoices
                </p>
                {(c.vendorInvoices ?? []).length === 0 ? (
                  <p className="text-xs opacity-55">
                    No invoices attached. Ask CPMC to upload the vendor
                    quotes before approving if needed.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {(c.vendorInvoices ?? []).map((inv) => (
                      <li
                        key={inv.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span>
                          {inv.vendorName} · {inv.fileName}
                          {inv.amount > 0 ? ` · ${money(inv.amount)}` : ""}
                        </span>
                        {inv.dataUrl ? (
                          <a
                            href={inv.dataUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline btn-xs"
                          >
                            View invoice
                          </a>
                        ) : (
                          <span className="text-xs opacity-50">
                            File name on record (preview not embedded)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {c.status === "pending_owner_approval" ? (
                <div className="space-y-3">
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">
                      How would you like to pay if you approve?
                    </legend>
                    {CAPEX_PAYMENT_METHODS.map((m) => (
                      <label
                        key={m.value}
                        className="flex cursor-pointer gap-2 rounded-lg border border-base-300 bg-white px-3 py-2 text-sm has-[:checked]:border-[var(--harbor-mid)] has-[:checked]:bg-[var(--harbor-deep)]/[0.04]"
                      >
                        <input
                          type="radio"
                          className="radio radio-sm mt-0.5"
                          name={`pay-${c.id}`}
                          checked={paymentByCapex[c.id] === m.value}
                          onChange={() =>
                            setPaymentByCapex((prev) => ({
                              ...prev,
                              [c.id]: m.value,
                            }))
                          }
                        />
                        <span>
                          <span className="font-medium">{m.label}</span>
                          <span className="mt-0.5 block text-xs opacity-60">
                            {m.blurb}
                          </span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <div className="flex flex-wrap gap-2">
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
                </div>
              ) : (
                <div className="text-sm">
                  {c.paymentMethod ? (
                    <p>
                      Payment preference:{" "}
                      <strong>{capexPaymentLabel(c.paymentMethod)}</strong>
                    </p>
                  ) : null}
                  {c.ownerResponseNotes ? (
                    <p className="opacity-70">{c.ownerResponseNotes}</p>
                  ) : null}
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
