"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { OwnerApplication } from "@/lib/owner-auth";
import {
  demoOwnerApplicationDiligence,
  propertyLocationLabel,
} from "@/lib/owner-application-intake";
import { OwnerApplicationPropertySummary } from "@/components/OwnerApplicationPropertySummary";
import { UnitRentSchedulePanel } from "@/components/mgmt/UnitRentSchedulePanel";
import {
  dedupeOwnerApplicationContractsAction,
  finalizeOwnerApplicationAction,
  sendOwnerApplicationContractAction,
} from "@/app/ops/management/owner-applications/actions";
import type { OwnerContract } from "@/lib/management";

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
    refresh: refreshApps,
  } = useSharedCollection<OwnerApplication>(COLLECTIONS.ownerApplications);
  const {
    items: contracts,
    saveOne: saveContract,
    refresh: refreshContracts,
  } = useSharedCollection<OwnerContract>(COLLECTIONS.ownerContracts);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<OwnerApplication | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [mgrSigner, setMgrSigner] = useState("CPMC Property Management Company");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    // Demo silly owner app disabled — portfolio data is seeded in shared_records.
    if (loading || seeded) return;
    setSeeded(true);
  }, [loading, seeded]);

  const selected = apps.find((a) => a.id === selectedId) ?? null;
  const relatedContracts = useMemo(() => {
    if (!selectedId) return [];
    const forApp = contracts.filter(
      (c) =>
        c.relatedApplicationId === selectedId ||
        (selected?.contractId != null && c.id === selected.contractId)
    );
    // One agreement per application in the UI
    const byId = new Map(forApp.map((c) => [c.id, c]));
    return [...byId.values()].sort((a, b) =>
      (b.sentAt || b.createdAt).localeCompare(a.sentAt || a.createdAt)
    );
  }, [contracts, selectedId, selected]);

  const [dedupedAppId, setDedupedAppId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!selectedId || relatedContracts.length <= 1) return;
    if (dedupedAppId === selectedId) return;
    setDedupedAppId(selectedId);
    void (async () => {
      await dedupeOwnerApplicationContractsAction({
        applicationId: selectedId,
        preferredContractId: selected?.contractId,
      });
      await refreshContracts();
    })();
  }, [
    selectedId,
    relatedContracts.length,
    selected?.contractId,
    refreshContracts,
    dedupedAppId,
  ]);

  async function persist(next: OwnerApplication) {
    await saveOne(next);
    setDraft(next);
  }

  function generateDiligenceFields() {
    if (!draft) return;
    const primary = draft.properties[0];
    const demo = demoOwnerApplicationDiligence({
      propertyName: primary?.propertyName,
      city: primary?.city,
    });
    setDraft({
      ...draft,
      ...demo,
    });
    setMsg(
      "Generated inspection, market research, and negotiation fields. Review, then Save diligence."
    );
    setTimeout(() => setMsg(null), 4000);
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

  /** Manager signs the generated agreement and posts it to the owner portal. */
  async function signAndSendToOwnerPortal() {
    if (!draft || busy) return;
    if (!mgrSigner.trim()) {
      setActionError("Enter the manager signer name.");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const result = await sendOwnerApplicationContractAction({
        applicationId: draft.id,
        managerSigner: mgrSigner.trim(),
      });
      if ("error" in result) {
        setActionError(result.error ?? "Could not send contract.");
        return;
      }
      setDraft(result.application);
      await refreshApps();
      await refreshContracts();
      setMsg(
        `Contract sent for owner signature. ${result.propertyCount} asset(s) staged — they appear on the owner dashboard after they sign.`
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
    setBusy(true);
    setActionError(null);
    try {
      const result = await finalizeOwnerApplicationAction({
        applicationId: draft.id,
        email: draft.email,
        fullName: draft.fullName,
      });
      if ("error" in result) {
        setActionError(result.error ?? "Could not finalize application.");
        return;
      }
      setDraft(result.application);
      await refreshApps();
      await refreshContracts();
      if (result.temporaryPassword) {
        setTempPassword(result.temporaryPassword);
      }
      setMsg(
        `Application completed. ${result.propertyCount} asset(s) linked to the owner dashboard.`
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Could not create temp password."
      );
    } finally {
      setBusy(false);
    }
  }

  const pending = apps.filter((a) =>
    ["pending", "needs_info", "awaiting_signature"].includes(a.status)
  );
  const completed = apps.filter((a) =>
    ["approved", "declined"].includes(a.status)
  );
  const agreementSent = Boolean(
    draft &&
      (draft.contractSentAt ||
        draft.contractId ||
        draft.status === "awaiting_signature" ||
        draft.status === "approved" ||
        draft.status === "declined" ||
        draft.mgmtStatus === "contract_sent" ||
        draft.mgmtStatus === "owner_signed" ||
        draft.mgmtStatus === "account_provisioned" ||
        relatedContracts.some((c) => Boolean(c.sentAt)))
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-2">
        {error && <p className="text-sm text-red-700">{error}</p>}
        {loading && <p className="text-sm opacity-60">Loading…</p>}
        <p className="text-xs font-semibold uppercase tracking-wide opacity-55">
          Open ({pending.length})
        </p>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--harbor-deep)]/20 px-3 py-6 text-center text-sm opacity-55">
            No open applications.
          </p>
        ) : (
          pending.map((app) => (
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
              <p className="text-sm opacity-70">
                {app.companyName || app.email}
              </p>
              <p className="text-xs opacity-55">
                {app.properties[0]
                  ? propertyLocationLabel(app.properties[0])
                  : "No property"}{" "}
                · {app.status.replaceAll("_", " ")}
                {app.mgmtStatus ? ` · ${app.mgmtStatus}` : ""}
              </p>
            </button>
          ))
        )}
        {completed.length > 0 ? (
          <>
            <p className="pt-3 text-xs font-semibold uppercase tracking-wide opacity-55">
              Completed ({completed.length})
            </p>
            {completed.map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => setSelectedId(app.id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left opacity-80 ${
                  selectedId === app.id
                    ? "border-[var(--harbor-mid)] bg-white shadow-sm"
                    : "border-[var(--harbor-deep)]/10 bg-white/60"
                }`}
              >
                <p className="font-medium text-sm">{app.fullName}</p>
                <p className="text-xs opacity-55 capitalize">
                  {app.status.replaceAll("_", " ")} ·{" "}
                  {app.properties.length} asset
                  {app.properties.length === 1 ? "" : "s"}
                </p>
              </button>
            ))}
          </>
        ) : null}
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
              <ul className="mt-2 space-y-2">
                {draft.properties.map((p, i) => (
                  <li key={i}>
                    <OwnerApplicationPropertySummary property={p} />
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

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--harbor-deep)]/25 bg-[var(--harbor-mist)]/25 px-3 py-2.5">
              <div>
                <p className="text-sm font-semibold text-[var(--harbor-ink)]">
                  Demo shortcut
                </p>
                <p className="text-xs opacity-60">
                  Fill inspection, meetings, negotiation, fee, and term fields
                  with new sample data each click.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm gap-1 border-0 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                onClick={generateDiligenceFields}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate fields
              </button>
            </div>

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

            <UnitRentSchedulePanel
              application={draft}
              onSaved={(next) => {
                void persist(next);
                setMsg(
                  "Unit rents saved on the application and published to leasing inventory."
                );
              }}
            />

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
                Save diligence, then sign as manager and send the agreement once
                to the owner portal. The button locks after send — no duplicate
                agreements.
              </p>
              <label className="form-control w-full max-w-sm">
                <span className="label-text text-xs mb-1">Manager signer</span>
                <input
                  className="input input-bordered input-sm bg-white"
                  value={mgrSigner}
                  onChange={(e) => setMgrSigner(e.target.value)}
                  placeholder="Your name / CPMC Property Management Company"
                  disabled={agreementSent || busy}
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
                  disabled={busy || agreementSent}
                  onClick={() => void signAndSendToOwnerPortal()}
                >
                  {agreementSent
                    ? "Application sent"
                    : "Sign & send to owner portal"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={
                    busy ||
                    draft.status === "approved" ||
                    !(
                      draft.status === "awaiting_signature" ||
                      draft.mgmtStatus === "owner_signed" ||
                      relatedContracts.some(
                        (c) =>
                          c.status === "signed_by_owner" ||
                          c.status === "fully_executed"
                      )
                    )
                  }
                  onClick={() => void provisionTempPassword()}
                >
                  Complete & link assets
                </button>
              </div>
            </div>

            <div className="space-y-2 border-t border-base-200 pt-3">
              <p className="text-sm font-medium">
                Agreement for this application
              </p>
              {relatedContracts.length === 0 ? (
                <p className="text-xs opacity-55">
                  No agreement yet — sign & send once to generate it.
                </p>
              ) : (
                relatedContracts.slice(0, 1).map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-base-300 bg-base-100 p-2 text-sm"
                  >
                    <p className="font-medium">{c.documentTitle}</p>
                    <p className="text-xs opacity-60">
                      Status: {c.status.replaceAll("_", " ")}
                      {c.cpmcSignedBy
                        ? ` · Manager: ${c.cpmcSignedBy}`
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
