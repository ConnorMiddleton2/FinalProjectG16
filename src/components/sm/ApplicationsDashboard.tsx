"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type {
  ManagementContractDraft,
  SharedPropertyTenant,
} from "@/lib/management-contract";
import {
  buildTourPrompt,
  labelSlot,
  slotConflicts,
  SM_APP_STATUSES,
  toLocalInput,
  type ContactMethod,
  type SmCalendarEvent,
  type SmTenantApplication,
} from "@/lib/sales-marketing";
import type { TenantPortalMessage } from "@/lib/tenant-portal-accounts";
import {
  confirmSignedLeaseAndMoveIn,
  offerLeaseForApplication,
  requestAdditionalApplicantForms,
  sendAvailabilityToApplicant,
} from "@/app/ops/sm/tenant-pipeline-actions";

type TourOption = { start: string; end: string };

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function defaultTourOption(offsetDays: number): TourOption {
  const start = new Date();
  start.setDate(start.getDate() + offsetDays);
  start.setMinutes(0, 0, 0);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setHours(11, 0, 0, 0);
  return { start: toLocalInput(start), end: toLocalInput(end) };
}

export function ApplicationsDashboard() {
  const {
    items: applications,
    saveOne: saveApp,
    loading,
    error,
  } = useSharedCollection<SmTenantApplication>(COLLECTIONS.tenantApplications);
  const {
    items: events,
    saveOne: saveEvent,
  } = useSharedCollection<SmCalendarEvent>(COLLECTIONS.smCalendarEvents);
  const { items: properties } = useSharedCollection<ManagementContractDraft>(
    COLLECTIONS.managedProperties
  );
  const { items: unitRoster, refresh: refreshUnits } =
    useSharedCollection<SharedPropertyTenant>(COLLECTIONS.propertyTenants);
  const { items: portalMessages } = useSharedCollection<TenantPortalMessage>(
    COLLECTIONS.tenantPortalMessages
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SmTenantApplication | null>(null);
  const [moveInBusy, setMoveInBusy] = useState(false);
  /** Vacant unit ids checked for the next availability send (max 5). */
  const [offerUnitIds, setOfferUnitIds] = useState<string[]>([]);
  const [tourOptions, setTourOptions] = useState<TourOption[]>([
    defaultTourOption(2),
    defaultTourOption(3),
    defaultTourOption(4),
  ]);

  useEffect(() => {
    // Demo silly tenant app disabled — portfolio data is seeded in shared_records.
    if (loading || seeded) return;
    setSeeded(true);
  }, [loading, seeded]);

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) {
      setDraft({
        ...selected,
        building: selected.building ?? selected.property,
        roomSize: selected.roomSize ?? "",
      });
      setEditing(false);
      setPrompt(null);
      setOfferUnitIds([]);
    } else {
      setDraft(null);
      setOfferUnitIds([]);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps -- reset draft when selection changes

  const vacantUnits = useMemo(() => {
    const name = (draft?.building || draft?.property || "").toLowerCase();
    return unitRoster.filter((u) => {
      const vacant = u.status === "vacant" || !u.name?.trim();
      if (!vacant) return false;
      if (draft?.propertyId) return u.propertyId === draft.propertyId;
      if (!name) return true;
      return u.propertyName.toLowerCase().includes(name.split("·")[0].trim());
    });
  }, [unitRoster, draft?.building, draft?.property, draft?.propertyId]);

  const relatedPortalMessages = useMemo(() => {
    if (!selected) return [];
    return portalMessages
      .filter(
        (m) =>
          m.relatedApplicationId === selected.id ||
          m.tenantEmail.toLowerCase() === selected.email.toLowerCase()
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 12);
  }, [portalMessages, selected]);

  const optionConflicts = useMemo(() => {
    return tourOptions.map((opt) =>
      slotConflicts(opt.start, opt.end, events, true)
    );
  }, [tourOptions, events]);

  async function markCommunicated(method: ContactMethod) {
    if (!selected) return;
    await saveApp({
      ...selected,
      communicated: true,
      lastContactAt: new Date().toISOString(),
      lastContactMethod: method,
      smStatus: selected.smStatus === "new" ? "contacted" : selected.smStatus,
      status: "In review",
    });
    setMsg(`Marked as communicated via ${method}.`);
    setTimeout(() => setMsg(null), 2500);
  }

  async function saveEdits() {
    if (!draft) return;
    await saveApp({
      ...draft,
      building: draft.building?.trim() || draft.property,
      roomSize: draft.roomSize?.trim() || "",
      property:
        draft.building && draft.roomSize
          ? `${draft.building} · ${draft.roomSize}`
          : draft.property,
      name: draft.name.trim(),
      email: draft.email.trim(),
      notes: draft.notes.trim(),
    });
    setEditing(false);
    setMsg("Application updated.");
    setTimeout(() => setMsg(null), 2500);
  }

  function assignUnit(unitId: string) {
    const unit = unitRoster.find((u) => u.id === unitId);
    if (!unit || !draft) return;
    const rent = Number(unit.askingRent || unit.monthlyRent || 0);
    setDraft({
      ...draft,
      propertyId: unit.propertyId,
      unitId: unit.id,
      unitLabel: unit.unit,
      roomSize: `${unit.unit}${unit.floorPlan ? ` · ${unit.floorPlan}` : ""} · ${unit.sqft} SF`,
      building: unit.propertyName,
      property: `${unit.propertyName} · ${unit.unit}`,
      proposedRent: rent,
    });
  }

  async function handleStatusChange(smStatus: SmTenantApplication["smStatus"]) {
    if (!selected || !draft) return;
    const next = { ...selected, ...draft, smStatus };
    if (smStatus === "approved") {
      if (!draft.unitId || !draft.propertyId) {
        setMsg(
          "Select a vacant unit with published asking rent before offering the lease."
        );
        setTimeout(() => setMsg(null), 3500);
        return;
      }
      setMoveInBusy(true);
      try {
        const result = await offerLeaseForApplication({
          applicationId: selected.id,
          propertyId: draft.propertyId,
          unitId: draft.unitId,
          tenantName: draft.name,
          tenantEmail: draft.email,
        });
        if ("error" in result) {
          setMsg(result.error ?? "Could not offer lease.");
          setTimeout(() => setMsg(null), 4000);
          return;
        }
        await saveApp({
          ...next,
          smStatus: "approved",
          status: "In review",
          proposedRent: result.monthlyRent,
          unitLabel: result.unitLabel,
          leasePacketStatus: "sent",
          leaseOfferedAt: new Date().toISOString(),
          roomSize: `${result.unitLabel} · ${money(result.monthlyRent)}/mo`,
        });
        setDraft((d) =>
          d
            ? {
                ...d,
                smStatus: "approved",
                proposedRent: result.monthlyRent,
                unitLabel: result.unitLabel,
                leasePacketStatus: "sent",
              }
            : d
        );
        setMsg(
          `Lease offered at ${money(result.monthlyRent)}/mo for ${result.unitLabel}. Tenant must sign in their portal; then use “Confirm signed lease” to move them in.`
        );
        setTimeout(() => setMsg(null), 6000);
      } finally {
        setMoveInBusy(false);
      }
      return;
    }

    setDraft((d) => (d ? { ...d, smStatus } : d));
    await saveApp(next);
  }

  async function handleSendAvailability() {
    if (!selected || !draft) return;
    if (offerUnitIds.length < 1 || offerUnitIds.length > 5) {
      setMsg("Select between 1 and 5 vacant units to send.");
      setTimeout(() => setMsg(null), 4000);
      return;
    }
    setMoveInBusy(true);
    try {
      const result = await sendAvailabilityToApplicant({
        applicationId: selected.id,
        propertyId: draft.propertyId,
        unitIds: offerUnitIds,
      });
      if ("error" in result) {
        setMsg(result.error ?? "Something went wrong.");
        setTimeout(() => setMsg(null), 4000);
        return;
      }
      setDraft((d) =>
        d
          ? {
              ...d,
              availabilityOfferedUnitIds: offerUnitIds,
              availabilityOfferedAt: new Date().toISOString(),
              unitSelectedFromAvailabilityAt: "",
              unitId: undefined,
              unitLabel: undefined,
              proposedRent: undefined,
            }
          : d
      );
      setOfferUnitIds([]);
      setMsg(
        `Sent ${result.unitCount} vacant option${result.unitCount === 1 ? "" : "s"} to the applicant. They can select only one.`
      );
      setTimeout(() => setMsg(null), 5000);
    } finally {
      setMoveInBusy(false);
    }
  }

  function toggleOfferUnit(unitId: string) {
    setOfferUnitIds((prev) => {
      if (prev.includes(unitId)) return prev.filter((id) => id !== unitId);
      if (prev.length >= 5) {
        setMsg("You can send at most 5 vacant options.");
        setTimeout(() => setMsg(null), 3000);
        return prev;
      }
      return [...prev, unitId];
    });
  }

  async function handleRequestAdditionalForms() {
    if (!selected) return;
    setMoveInBusy(true);
    try {
      const result = await requestAdditionalApplicantForms({
        applicationId: selected.id,
      });
      if ("error" in result) {
        setMsg(result.error ?? "Something went wrong.");
        setTimeout(() => setMsg(null), 4000);
        return;
      }
      setMsg(
        "Additional information form sent to the applicant portal."
      );
      setTimeout(() => setMsg(null), 4000);
    } finally {
      setMoveInBusy(false);
    }
  }

  async function handleConfirmSignedLease() {
    if (!selected) return;
    setMoveInBusy(true);
    try {
      const result = await confirmSignedLeaseAndMoveIn({
        applicationId: selected.id,
      });
      if ("error" in result) {
        setMsg(result.error ?? "Something went wrong.");
        setTimeout(() => setMsg(null), 4000);
        return;
      }
      await refreshUnits();
      setDraft((d) =>
        d
          ? {
              ...d,
              smStatus: "approved",
              status: "Completed",
              leasePacketStatus: "approved",
              movedInAt: new Date().toISOString(),
              proposedRent: result.monthlyRent,
              unitLabel: result.unitLabel,
            }
          : d
      );
      setMsg(
        `Application completed. ${result.unitLabel} is now a current tenant at ${money(result.monthlyRent)}/mo (${result.receivableId}).`
      );
      setTimeout(() => setMsg(null), 5000);
    } finally {
      setMoveInBusy(false);
    }
  }

  async function sendTourPrompt() {
    if (!selected || !draft) return;

    const incomplete = tourOptions.some((o) => !o.start || !o.end);
    if (incomplete) {
      setMsg("Pick a start and end time for all three tour options.");
      return;
    }

    const hardConflicts = optionConflicts.some((c) => c.length > 0);
    if (hardConflicts) {
      setMsg(
        "One or more options conflict with your calendar. Adjust those times before sending."
      );
      return;
    }

    const labeled = tourOptions.map((o) => ({
      start: o.start,
      end: o.end,
      label: labelSlot(o.start),
    }));
    const text = buildTourPrompt(selected.name, labeled);
    setPrompt(text);

    const holdIds: string[] = [];
    for (let i = 0; i < tourOptions.length; i++) {
      const opt = tourOptions[i];
      const hold: SmCalendarEvent = {
        id: crypto.randomUUID(),
        title: `Tour option ${i + 1} · ${selected.name} (hold)`,
        type: "tour",
        start: opt.start,
        end: opt.end,
        notes: `Soft hold for ${selected.email} · ${draft.building || selected.property} · ${draft.roomSize || "size TBD"}. Clears if they pick another option.`,
        relatedApplicationId: selected.id,
        source: "cpmc",
        isHold: true,
        location: draft.building || selected.property,
      };
      holdIds.push(hold.id);
      await saveEvent(hold);
    }

    await saveApp({
      ...selected,
      ...draft,
      smStatus: "tour_offered",
      tourPromptSentAt: new Date().toISOString(),
      tourHoldEventIds: holdIds,
      tourEventId: holdIds[0],
      communicated: true,
      lastContactAt: new Date().toISOString(),
      lastContactMethod: "email",
      status: "In review",
    });
    setMsg(
      "Tour prompt ready. All 3 options are translucent holds on your calendar."
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-3">
        {error && <p className="text-sm text-red-700">{error}</p>}
        {loading && <p className="text-sm opacity-60">Loading applications…</p>}
        {applications.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/50 px-4 py-10 text-center text-sm opacity-60">
            No tenant applications yet. New portal submissions appear here.
          </p>
        ) : (
          applications.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => setSelectedId(app.id)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                selectedId === app.id
                  ? "border-[var(--harbor-mid)] bg-white shadow-sm"
                  : "border-[var(--harbor-deep)]/10 bg-white/80 hover:border-[var(--harbor-mid)]/40"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--harbor-ink)]">
                    {app.name}
                  </p>
                  <p className="text-sm opacity-70">
                    {app.building || app.property}
                    {app.roomSize ? ` · ${app.roomSize}` : ""}
                  </p>
                  <p className="text-xs opacity-55">{app.email}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {app.communicated && (
                    <span className="badge badge-info badge-sm">Reached out</span>
                  )}
                  {app.leasePacketStatus === "signed" && !app.movedInAt ? (
                    <span className="badge badge-warning badge-sm">
                      Pending lease
                    </span>
                  ) : null}
                  {app.status === "Completed" || app.movedInAt ? (
                    <span className="badge badge-success badge-sm">
                      Completed
                    </span>
                  ) : null}
                  <span className="badge badge-outline badge-sm capitalize">
                    {app.smStatus ?? "new"}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
        {!selected || !draft ? (
          <p className="text-sm opacity-60">
            Select an application to review, edit, and offer tour times.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold">{draft.name}</h2>
                <p className="text-sm opacity-70">{draft.email}</p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? "Cancel edit" : "Edit application"}
              </button>
            </div>

            {editing ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="input input-bordered input-sm bg-white"
                  placeholder="Full name"
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, name: e.target.value } : d))
                  }
                />
                <input
                  className="input input-bordered input-sm bg-white"
                  placeholder="Email"
                  value={draft.email}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, email: e.target.value } : d))
                  }
                />
                <input
                  className="input input-bordered input-sm bg-white"
                  placeholder="Building"
                  value={draft.building ?? ""}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, building: e.target.value } : d
                    )
                  }
                />
                <input
                  className="input input-bordered input-sm bg-white"
                  placeholder="Room / suite size"
                  value={draft.roomSize ?? ""}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, roomSize: e.target.value } : d
                    )
                  }
                />
                <textarea
                  className="textarea textarea-bordered textarea-sm bg-white sm:col-span-2"
                  placeholder="Notes"
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, notes: e.target.value } : d))
                  }
                />
                <button
                  type="button"
                  className="btn btn-neutral btn-sm"
                  onClick={() => void saveEdits()}
                >
                  Save changes
                </button>
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                <p>
                  <span className="opacity-60">Building:</span>{" "}
                  {draft.building || draft.property || "—"}
                </p>
                <p>
                  <span className="opacity-60">Room / size:</span>{" "}
                  {draft.roomSize || "—"}
                </p>
                {draft.proposedRent ? (
                  <p>
                    <span className="opacity-60">Lease rent:</span>{" "}
                    {money(draft.proposedRent)}/mo
                  </p>
                ) : null}
                {draft.movedInAt ? (
                  <p className="text-emerald-800">
                    Moved in {new Date(draft.movedInAt).toLocaleString()}
                  </p>
                ) : null}
                {draft.notes ? (
                  <p className="mt-2 whitespace-pre-wrap">{draft.notes}</p>
                ) : null}
              </div>
            )}

            <div className="space-y-2 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 p-3">
              <p className="text-sm font-medium">
                Send vacant options &amp; assign lease unit
              </p>
              <p className="text-xs opacity-65">
                Check 1–5 vacant units to send. The applicant picks exactly one,
                completes payment/agreement info, signs the lease, then it
                appears here as <strong>Pending lease</strong>. Approve with
                Confirm signed lease to complete the application and make them a
                current tenant.
              </p>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-55">
                  Vacant options to send ({offerUnitIds.length}/5)
                </p>
                {vacantUnits.length === 0 ? (
                  <p className="text-xs opacity-60">
                    No vacant priced units found for this property filter. Ask
                    Management to run FMR and publish rents on the owner
                    application.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[var(--harbor-deep)]/15 bg-white p-2">
                    {vacantUnits.map((u) => {
                      const rent = Number(u.askingRent || u.monthlyRent || 0);
                      const checked = offerUnitIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-base-200/70 ${
                            checked ? "bg-[var(--harbor-mist)]/60" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm mt-0.5"
                            checked={checked}
                            disabled={
                              moveInBusy ||
                              Boolean(draft.movedInAt) ||
                              (!checked && offerUnitIds.length >= 5)
                            }
                            onChange={() => toggleOfferUnit(u.id)}
                          />
                          <span>
                            <span className="font-medium">{u.unit}</span>
                            <span className="opacity-70">
                              {u.floorPlan ? ` · ${u.floorPlan}` : ""} · {u.sqft}{" "}
                              SF · {money(rent)}/mo
                              <span className="opacity-50">
                                {" "}
                                · {u.propertyName}
                              </span>
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <select
                className="select select-bordered select-sm w-full bg-white"
                value={draft.unitId ?? ""}
                onChange={(e) => assignUnit(e.target.value)}
                disabled={Boolean(draft.movedInAt)}
              >
                <option value="">
                  Lease unit (after applicant picks, or assign manually)…
                </option>
                {properties.map((p) => {
                  const units = vacantUnits.filter((u) => u.propertyId === p.id);
                  if (units.length === 0) return null;
                  return (
                    <optgroup key={p.id} label={p.propertyName}>
                      {units.map((u) => {
                        const rent = Number(u.askingRent || u.monthlyRent || 0);
                        return (
                          <option key={u.id} value={u.id}>
                            {u.unit}
                            {u.floorPlan ? ` · ${u.floorPlan}` : ""} · {u.sqft}{" "}
                            SF · {money(rent)}/mo
                          </option>
                        );
                      })}
                    </optgroup>
                  );
                })}
              </select>
              {draft.unitSelectedFromAvailabilityAt && draft.unitLabel ? (
                <p className="text-xs text-[var(--harbor-deep)]">
                  Applicant selected <strong>{draft.unitLabel}</strong>
                  {draft.preLeaseFormStatus === "submitted"
                    ? " · pre-lease form submitted"
                    : " · waiting on pre-lease form"}
                  {draft.preLeasePaymentMethod
                    ? ` · payment: ${draft.preLeasePaymentMethod}`
                    : ""}
                  .
                </p>
              ) : null}
              {draft.leasePacketStatus === "signed" && !draft.movedInAt ? (
                <div className="rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  <p className="font-medium">Pending lease agreement</p>
                  <p className="text-xs opacity-80">
                    {draft.leaseSignedName || draft.name} signed
                    {draft.leaseSignedAt
                      ? ` on ${new Date(draft.leaseSignedAt).toLocaleString()}`
                      : ""}
                    . Approve below to complete this application and activate
                    them as a current tenant.
                  </p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={
                    moveInBusy ||
                    offerUnitIds.length < 1 ||
                    Boolean(draft.movedInAt)
                  }
                  onClick={() => void handleSendAvailability()}
                >
                  Send availability ({offerUnitIds.length || 0})
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={moveInBusy || Boolean(draft.movedInAt)}
                  onClick={() => void handleRequestAdditionalForms()}
                >
                  Request additional forms
                </button>
                {draft.leasePacketStatus === "signed" && !draft.movedInAt ? (
                  <button
                    type="button"
                    className="btn btn-sm border-0 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                    disabled={moveInBusy}
                    onClick={() => void handleConfirmSignedLease()}
                  >
                    Approve lease &amp; complete as current tenant
                  </button>
                ) : null}
                {draft.leasePacketStatus === "sent" ? (
                  <span className="badge badge-info badge-sm self-center">
                    Lease ready — awaiting tenant signature
                  </span>
                ) : null}
                {draft.status === "Completed" || draft.movedInAt ? (
                  <span className="badge badge-success badge-sm self-center">
                    Completed · current tenant
                  </span>
                ) : null}
              </div>
            </div>

            <label className="form-control w-full">
              <span className="label-text mb-1">Review status</span>
              <select
                className="select select-bordered select-sm bg-white"
                value={draft.smStatus ?? "new"}
                disabled={moveInBusy || Boolean(draft.movedInAt)}
                onChange={(e) => {
                  const smStatus = e.target
                    .value as SmTenantApplication["smStatus"];
                  void handleStatusChange(smStatus);
                }}
              >
                {SM_APP_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <p className="mb-2 text-sm font-medium">Mark as communicated</p>
              <div className="flex flex-wrap gap-2">
                {(["call", "text", "email"] as ContactMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="btn btn-outline btn-sm capitalize"
                    onClick={() => void markCommunicated(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t border-base-200 pt-4">
              <div>
                <p className="text-sm font-medium">Offer 3 tour times</p>
                <p className="text-xs opacity-65">
                  You choose each day/time. Conflicts with booked (non-hold)
                  events are flagged. Sending places translucent holds on your
                  calendar.
                </p>
              </div>

              {tourOptions.map((opt, index) => {
                const conflicts = optionConflicts[index];
                return (
                  <div
                    key={index}
                    className={`rounded-xl border p-3 ${
                      conflicts.length
                        ? "border-red-300 bg-red-50"
                        : "border-base-300 bg-base-100"
                    }`}
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">
                      Option {index + 1}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="datetime-local"
                        className="input input-bordered input-sm bg-white"
                        value={opt.start}
                        onChange={(e) => {
                          const start = e.target.value;
                          const endDate = new Date(start);
                          endDate.setHours(endDate.getHours() + 1);
                          setTourOptions((prev) =>
                            prev.map((p, i) =>
                              i === index
                                ? {
                                    start,
                                    end: toLocalInput(endDate),
                                  }
                                : p
                            )
                          );
                        }}
                      />
                      <input
                        type="datetime-local"
                        className="input input-bordered input-sm bg-white"
                        value={opt.end}
                        onChange={(e) =>
                          setTourOptions((prev) =>
                            prev.map((p, i) =>
                              i === index
                                ? { ...p, end: e.target.value }
                                : p
                            )
                          )
                        }
                      />
                    </div>
                    {conflicts.length > 0 ? (
                      <p className="mt-2 text-xs text-red-700">
                        Conflict with:{" "}
                        {conflicts.map((c) => c.title).join(", ")}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-emerald-700">
                        No hard conflicts
                      </p>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                className="btn btn-neutral btn-sm"
                onClick={() => void sendTourPrompt()}
              >
                Send 3 options + hold on calendar
              </button>
            </div>

            {relatedPortalMessages.length > 0 ? (
              <div className="space-y-2 rounded-xl border border-base-300 bg-base-100 p-3">
                <p className="text-xs font-medium uppercase tracking-wide opacity-55">
                  Portal thread
                </p>
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {relatedPortalMessages.map((m) => (
                    <li key={m.id} className="text-sm">
                      <p className="font-medium">
                        {m.subject}{" "}
                        <span className="text-xs font-normal opacity-55">
                          · {m.fromRole} ·{" "}
                          {new Date(m.createdAt).toLocaleString()}
                        </span>
                      </p>
                      <p className="whitespace-pre-wrap opacity-80">{m.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {msg && <p className="text-sm text-emerald-800">{msg}</p>}

            {prompt && (
              <div className="rounded-xl border border-base-300 bg-base-100 p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide opacity-55">
                  Message to send
                </p>
                <pre className="whitespace-pre-wrap text-sm font-sans">
                  {prompt}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
