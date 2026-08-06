"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { OwnerApplication } from "@/lib/owner-auth";
import { provisionOwnerTempPassword, sendManagementContractOffer } from "@/app/ops/management/owner-applications/actions";
import {
  draftManagementAgreement,
  sillyOwnerApplication,
  SILLY_OWNER_APP_ID,
  type OwnerContract,
} from "@/lib/management";

function FileList({
  files,
  onAdd,
  onRemove,
  label,
}: {
  files: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
  label: string;
}) {
  const [name, setName] = useState("");
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium opacity-70">{label}</p>
      <div className="flex flex-wrap gap-1">
        {files.map((f) => (
          <span key={f} className="badge badge-outline gap-1">
            {f}
            <button
              type="button"
              className="text-xs"
              onClick={() => onRemove(f)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          className="input input-bordered input-xs bg-white flex-1"
          placeholder="filename.pdf"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => {
            if (!name.trim()) return;
            onAdd(name.trim());
            setName("");
          }}
        >
          Upload
        </button>
      </div>
    </div>
  );
}

export function OwnerApplicationsDashboard() {
  const {
    items: apps,
    saveOne,
    loading,
    error,
  } = useSharedCollection<OwnerApplication>(COLLECTIONS.ownerApplications);
  const {
    items: contracts,
    saveOne: saveContract,
  } = useSharedCollection<OwnerContract>(COLLECTIONS.ownerContracts);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<OwnerApplication | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [mgrSigner, setMgrSigner] = useState("Harborline Management");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (loading || seeded) return;
    if (apps.some((a) => a.id === SILLY_OWNER_APP_ID)) {
      setSeeded(true);
      return;
    }
    void (async () => {
      await saveOne(sillyOwnerApplication());
      setSeeded(true);
      setSelectedId(SILLY_OWNER_APP_ID);
    })();
  }, [loading, apps, saveOne, seeded]);

  const selected = apps.find((a) => a.id === selectedId) ?? null;
  const relatedContracts = useMemo(
    () =>
      contracts.filter(
        (c) =>
          c.relatedApplicationId === selectedId ||
          (selected &&
            c.ownerEmail.toLowerCase() === selected.email.toLowerCase())
      ),
    [contracts, selectedId, selected]
  );

  useEffect(() => {
    if (selected) {
      setDraft({
        ...selected,
        inspectionDocuments: selected.inspectionDocuments ?? [],
        meetingMinutesFiles: selected.meetingMinutesFiles ?? [],
        meetingsCount: selected.meetingsCount ?? 0,
      });
      setTempPassword(null);
      setMsg(null);
      setActionError(null);
    } else setDraft(null);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function persist(next: OwnerApplication) {
    await saveOne(next);
    setDraft(next);
  }

  async function saveDiligence() {
    if (!draft || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await persist({ ...draft, mgmtStatus: "diligence" });
      setMsg("Application diligence saved.");
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not save diligence."
      );
    } finally {
      setBusy(false);
    }
  }

  /** Manager signs and provisions managed_properties (same path as Properties). */
  async function signAndSendToOwnerPortal() {
    if (!draft || busy) return;
    if (!mgrSigner.trim()) {
      setActionError("Enter the manager signer name.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const offer = await sendManagementContractOffer({
        applicationId: draft.id,
        reviewedBy: mgrSigner.trim(),
        reviewNotes: draft.negotiationTerms || draft.reviewNotes,
        feePercent: draft.proposedFeePercent || "4",
      });
      if ("error" in offer) {
        setActionError(offer.error ?? "Could not send contract.");
        return;
      }

      const body = draftManagementAgreement({
        ...draft,
        ...offer.application,
      });
      const contractId = draft.contractId || crypto.randomUUID();
      const propertyName =
        draft.properties[0]?.location || draft.companyName || "Owner asset";
      const now = new Date().toISOString();

      const contract: OwnerContract = {
        id: contractId,
        ownerName: draft.fullName,
        ownerEmail: draft.email,
        propertyName,
        documentTitle: "Exclusive Property Management Agreement",
        body,
        status: "pending_owner_signature",
        createdAt: now,
        sentAt: now,
        harborlineSignedAt: now,
        harborlineSignedBy: mgrSigner.trim(),
        relatedApplicationId: draft.id,
      };
      await saveContract(contract);

      await persist({
        ...draft,
        ...offer.application,
        draftContract: body,
        contractId,
        contractSentAt: now,
        mgmtStatus: "contract_sent",
        accountMessage: `Harborline sent your Property Management Agreement. Review and sign at /owners/status (look up your email). ${offer.propertiesProvisioned} propert${offer.propertiesProvisioned === 1 ? "y was" : "ies were"} provisioned for management.`,
      });

      setMsg(
        `Contract sent — ${offer.propertiesProvisioned} managed propert${offer.propertiesProvisioned === 1 ? "y" : "ies"} created. Owner signs at /owners/status.`
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not send contract."
      );
    } finally {
      setBusy(false);
    }
  }

  async function provisionTempPassword() {
    if (!draft || busy) return;
    const signed = relatedContracts.find(
      (c) => c.status === "signed_by_owner" || c.status === "fully_executed"
    );
    if (!signed) {
      setMsg("Wait until the owner has signed the contract in their portal.");
      return;
    }

    setBusy(true);
    setActionError(null);
    try {
      const provisioned = await provisionOwnerTempPassword({
        email: draft.email,
        fullName: draft.fullName,
      });
      if ("error" in provisioned) {
        setActionError(provisioned.error ?? "Could not create temp password.");
        return;
      }

      await saveContract({
        ...signed,
        status: "fully_executed",
      });

      await persist({
        ...draft,
        status: "approved",
        mgmtStatus: "account_provisioned",
        tempPasswordIssuedAt: new Date().toISOString(),
        accountMessage: `Your management agreement is fully executed. Use the temporary password from Harborline Management to sign in at /owners.`,
      });

      setTempPassword(provisioned.temporaryPassword);
      setMsg(
        `Temporary password created for ${provisioned.email}. Share it with the owner so they can sign in.`
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not create temp password."
      );
    } finally {
      setBusy(false);
    }
  }

  const pending = apps.filter((a) => a.status === "pending");

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-2">
        {error && <p className="text-sm text-red-700">{error}</p>}
        {loading && <p className="text-sm opacity-60">Loading…</p>}
        {pending.map((app) => (
          <button
            key={app.id}
            type="button"
            onClick={() => setSelectedId(app.id)}
            className={`w-full rounded-xl border px-3 py-3 text-left ${
              selectedId === app.id
                ? "border-[var(--harbor-mid)] bg-white shadow-sm"
                : "border-[var(--harbor-deep)]/10 bg-white/80"
            }`}
          >
            <p className="font-semibold">{app.fullName}</p>
            <p className="text-sm opacity-70">{app.companyName || app.email}</p>
            <p className="text-xs opacity-55">
              {app.properties[0]?.location || "No property"} ·{" "}
              {app.mgmtStatus ?? "new"}
            </p>
          </button>
        ))}
      </div>

      <div className="max-h-[70vh] space-y-3 overflow-y-auto rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-4 shadow-sm">
        {!draft ? (
          <p className="text-sm opacity-60">Select an application.</p>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-semibold">Full application</h2>
              <p className="text-sm opacity-70">
                {draft.fullName} · {draft.email} · {draft.phone || "no phone"}
              </p>
              <p className="text-sm opacity-70">{draft.companyName}</p>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {draft.properties.map((p, i) => (
                  <li key={i}>
                    {p.location}
                    {p.squareFeet ? ` · ${p.squareFeet} SF` : ""}
                    {p.category ? ` · ${p.category}` : ""}
                  </li>
                ))}
              </ul>
              {draft.message ? (
                <p className="mt-2 text-sm italic">“{draft.message}”</p>
              ) : null}
            </div>

            {(msg || actionError) && (
              <div className="space-y-2">
                {msg && (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    {msg}
                  </p>
                )}
                {actionError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {actionError}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2 border-t border-base-200 pt-3">
              <p className="text-sm font-medium">Inspection & asset</p>
              <label className="label cursor-pointer justify-start gap-2 py-0">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={!!draft.inspected}
                  onChange={(e) =>
                    setDraft({ ...draft, inspected: e.target.checked })
                  }
                />
                <span className="label-text text-sm">Inspected</span>
              </label>
              <input
                type="date"
                className="input input-bordered input-xs bg-white"
                value={draft.inspectionDate ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, inspectionDate: e.target.value })
                }
              />
              <FileList
                label="Inspection documents"
                files={draft.inspectionDocuments ?? []}
                onAdd={(n) =>
                  setDraft({
                    ...draft,
                    inspectionDocuments: [
                      ...(draft.inspectionDocuments ?? []),
                      n,
                    ],
                  })
                }
                onRemove={(n) =>
                  setDraft({
                    ...draft,
                    inspectionDocuments: (
                      draft.inspectionDocuments ?? []
                    ).filter((f) => f !== n),
                  })
                }
              />
              <textarea
                className="textarea textarea-bordered textarea-xs w-full bg-white min-h-16"
                placeholder="More asset information…"
                value={draft.assetDetails ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, assetDetails: e.target.value })
                }
              />
              <textarea
                className="textarea textarea-bordered textarea-xs w-full bg-white min-h-16"
                placeholder="Inspection notes…"
                value={draft.inspectionNotes ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, inspectionNotes: e.target.value })
                }
              />
              <textarea
                className="textarea textarea-bordered textarea-xs w-full bg-white min-h-16"
                placeholder="Market research…"
                value={draft.marketResearch ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, marketResearch: e.target.value })
                }
              />
            </div>

            <div className="space-y-2 border-t border-base-200 pt-3">
              <p className="text-sm font-medium">Meetings & negotiation</p>
              <label className="label cursor-pointer justify-start gap-2 py-0">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={!!draft.metWithOwner}
                  onChange={(e) =>
                    setDraft({ ...draft, metWithOwner: e.target.checked })
                  }
                />
                <span className="label-text text-sm">Met with owner</span>
              </label>
              <input
                type="number"
                className="input input-bordered input-xs bg-white w-40"
                placeholder="# of meetings"
                value={draft.meetingsCount ?? 0}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    meetingsCount: Number(e.target.value) || 0,
                  })
                }
              />
              <textarea
                className="textarea textarea-bordered textarea-xs w-full bg-white min-h-14"
                placeholder="Terms the owner wants…"
                value={draft.ownerDesiredTerms ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, ownerDesiredTerms: e.target.value })
                }
              />
              <textarea
                className="textarea textarea-bordered textarea-xs w-full bg-white min-h-14"
                placeholder="Negotiation terms…"
                value={draft.negotiationTerms ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, negotiationTerms: e.target.value })
                }
              />
              <textarea
                className="textarea textarea-bordered textarea-xs w-full bg-white min-h-14"
                placeholder="Payment terms…"
                value={draft.paymentTerms ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, paymentTerms: e.target.value })
                }
              />
              <FileList
                label="Meeting minutes uploads"
                files={draft.meetingMinutesFiles ?? []}
                onAdd={(n) =>
                  setDraft({
                    ...draft,
                    meetingMinutesFiles: [
                      ...(draft.meetingMinutesFiles ?? []),
                      n,
                    ],
                  })
                }
                onRemove={(n) =>
                  setDraft({
                    ...draft,
                    meetingMinutesFiles: (
                      draft.meetingMinutesFiles ?? []
                    ).filter((f) => f !== n),
                  })
                }
              />
              <textarea
                className="textarea textarea-bordered textarea-xs w-full bg-white min-h-14"
                placeholder="Meeting minutes notes…"
                value={draft.meetingMinutesNotes ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, meetingMinutesNotes: e.target.value })
                }
              />
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  className="input input-bordered input-xs bg-white"
                  placeholder="Fee %"
                  value={draft.proposedFeePercent ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, proposedFeePercent: e.target.value })
                  }
                />
                <input
                  className="input input-bordered input-xs bg-white"
                  placeholder="Term years"
                  value={draft.proposedTermYears ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, proposedTermYears: e.target.value })
                  }
                />
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={draft.exclusiveManagement !== false}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        exclusiveManagement: e.target.checked,
                      })
                    }
                  />
                  <span className="label-text text-xs">Exclusive</span>
                </label>
              </div>
            </div>

            <div className="space-y-3 border-t border-base-200 pt-3">
              <p className="text-sm font-medium">Contract</p>
              <p className="text-xs opacity-65">
                Save diligence, then sign as manager and send the agreement to
                the owner portal. No email — the owner reviews and signs in
                their portal.
              </p>
              <label className="form-control w-full max-w-sm">
                <span className="label-text text-xs mb-1">Manager signer</span>
                <input
                  className="input input-bordered input-sm bg-white"
                  value={mgrSigner}
                  onChange={(e) => setMgrSigner(e.target.value)}
                  placeholder="Your name / Harborline Management"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={busy}
                  onClick={() => void saveDiligence()}
                >
                  Save diligence
                </button>
                <button
                  type="button"
                  className="btn btn-neutral btn-sm"
                  disabled={busy}
                  onClick={() => void signAndSendToOwnerPortal()}
                >
                  Sign & send to owner portal
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={
                    busy ||
                    !relatedContracts.some(
                      (c) =>
                        c.status === "signed_by_owner" ||
                        c.status === "fully_executed"
                    )
                  }
                  onClick={() => void provisionTempPassword()}
                >
                  Create temp password (after owner signs)
                </button>
              </div>
            </div>

            <div className="space-y-2 border-t border-base-200 pt-3">
              <p className="text-sm font-medium">
                Contracts for this application
              </p>
              {relatedContracts.length === 0 ? (
                <p className="text-xs opacity-55">
                  No contracts yet — sign & send to generate one.
                </p>
              ) : (
                relatedContracts.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-base-300 bg-base-100 p-2 text-sm"
                  >
                    <p className="font-medium">{c.documentTitle}</p>
                    <p className="text-xs opacity-60">
                      Status: {c.status.replaceAll("_", " ")}
                      {c.harborlineSignedBy
                        ? ` · Manager: ${c.harborlineSignedBy}`
                        : ""}
                      {c.ownerSignedAt
                        ? ` · Owner signed ${new Date(c.ownerSignedAt).toLocaleString()}`
                        : ""}
                    </p>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs">
                        View contract
                      </summary>
                      <pre className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap font-[Georgia,serif] text-[11px]">
                        {c.body}
                      </pre>
                    </details>
                  </div>
                ))
              )}
            </div>

            {tempPassword && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                Temp password for <strong>{draft.email}</strong>:{" "}
                <strong>{tempPassword}</strong>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
