"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  buildTourPrompt,
  labelSlot,
  sillyTenantApplication,
  SILLY_TENANT_APP_ID,
  slotConflicts,
  SM_APP_STATUSES,
  toLocalInput,
  type ContactMethod,
  type SmCalendarEvent,
  type SmTenantApplication,
} from "@/lib/sales-marketing";

type TourOption = { start: string; end: string };

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SmTenantApplication | null>(null);
  const [tourOptions, setTourOptions] = useState<TourOption[]>([
    defaultTourOption(2),
    defaultTourOption(3),
    defaultTourOption(4),
  ]);

  useEffect(() => {
    if (loading || seeded) return;
    const existing = applications.find((a) => a.id === SILLY_TENANT_APP_ID);
    if (existing) {
      if (!existing.building || !existing.roomSize) {
        void saveApp({
          ...existing,
          ...sillyTenantApplication(),
          id: SILLY_TENANT_APP_ID,
        });
      }
      setSeeded(true);
      return;
    }
    void (async () => {
      await saveApp(sillyTenantApplication());
      setSeeded(true);
      setSelectedId(SILLY_TENANT_APP_ID);
    })();
  }, [loading, applications, saveApp, seeded]);

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
    } else {
      setDraft(null);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps -- reset draft when selection changes

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
        source: "harborline",
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
                {draft.notes ? (
                  <p className="mt-2 whitespace-pre-wrap">{draft.notes}</p>
                ) : null}
              </div>
            )}

            <label className="form-control w-full">
              <span className="label-text mb-1">Review status</span>
              <select
                className="select select-bordered select-sm bg-white"
                value={draft.smStatus ?? "new"}
                onChange={(e) => {
                  const smStatus = e.target
                    .value as SmTenantApplication["smStatus"];
                  setDraft((d) => (d ? { ...d, smStatus } : d));
                  void saveApp({ ...selected, ...draft, smStatus });
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
