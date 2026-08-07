"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import {
  emptyCalendarEvent,
  EVENT_TYPES,
  eventTypeLabel,
  findCalendarConflicts,
  mockGoogleCalendarEvents,
  seedCalendarEvents,
  toLocalInput,
  type CalendarConflict,
  type CalendarEventType,
  type SmCalendarEvent,
} from "@/lib/sales-marketing";

type ViewMode = "day" | "week" | "month" | "year";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })} → ${e.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function CalendarDashboard() {
  const {
    items: events,
    saveOne,
    loading,
    error,
  } = useSharedCollection<SmCalendarEvent>(
    COLLECTIONS.smCalendarEvents,
    seedCalendarEvents
  );
  const [view, setView] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [form, setForm] = useState(emptyCalendarEvent);
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<CalendarEventType | "all">(
    "all"
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<CalendarConflict[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [reschedule, setReschedule] = useState<{
    eventId: string;
    start: string;
    end: string;
  } | null>(null);

  const filtered = useMemo(() => {
    return events.filter((e) =>
      typeFilter === "all" ? true : e.type === typeFilter
    );
  }, [events, typeFilter]);

  const expanded = events.find((e) => e.id === expandedId) ?? null;

  const rangeLabel = useMemo(() => {
    if (view === "day") {
      return cursor.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    if (view === "week") {
      const end = addDays(cursor, 6);
      return `${cursor.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    if (view === "month") {
      return cursor.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    }
    return String(cursor.getFullYear());
  }, [cursor, view]);

  const visibleDays = useMemo(() => {
    if (view === "day") return [cursor];
    if (view === "week") {
      return Array.from({ length: 7 }, (_, i) => addDays(cursor, i));
    }
    if (view === "month") {
      const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const start = addDays(first, -((first.getDay() + 6) % 7));
      return Array.from({ length: 42 }, (_, i) => addDays(start, i));
    }
    return Array.from(
      { length: 12 },
      (_, i) => new Date(cursor.getFullYear(), i, 1)
    );
  }, [cursor, view]);

  function shift(dir: -1 | 1) {
    const next = new Date(cursor);
    if (view === "day") next.setDate(next.getDate() + dir);
    else if (view === "week") next.setDate(next.getDate() + dir * 7);
    else if (view === "month") next.setMonth(next.getMonth() + dir);
    else next.setFullYear(next.getFullYear() + dir);
    setCursor(startOfDay(next));
  }

  function eventsOn(day: Date) {
    return filtered.filter((e) => sameDay(new Date(e.start), day));
  }

  function eventsInMonth(monthStart: Date) {
    return filtered.filter((e) => {
      const d = new Date(e.start);
      return (
        d.getFullYear() === monthStart.getFullYear() &&
        d.getMonth() === monthStart.getMonth()
      );
    });
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const title =
      form.type === "other"
        ? form.title.trim()
        : form.title.trim() || eventTypeLabel(form.type);
    if (!title) return;
    await saveOne({
      ...form,
      id: crypto.randomUUID(),
      title,
      source: "cpmc",
    });
    setForm(emptyCalendarEvent());
    setShowForm(false);
  }

  async function syncGoogle() {
    setSyncMsg("Syncing with Google Calendar…");
    const incoming = mockGoogleCalendarEvents(events);
    for (const ev of incoming) {
      await saveOne(ev);
    }
    const next = [...events];
    for (const ev of incoming) {
      const without = next.filter((n) => n.id !== ev.id);
      next.splice(0, next.length, ev, ...without);
    }
    // Recompute conflicts after merge using local merge view
    const mergedMap = new Map<string, SmCalendarEvent>();
    for (const e of events) mergedMap.set(e.id, e);
    for (const e of incoming) mergedMap.set(e.id, e);
    const merged = Array.from(mergedMap.values());
    const found = findCalendarConflicts(merged);
    setConflicts(found);
    setShowConflicts(found.length > 0);
    setSyncMsg(
      found.length
        ? `Synced ${incoming.length} Google events — ${found.length} conflict${found.length === 1 ? "" : "s"} need attention.`
        : `Synced ${incoming.length} Google events — no conflicts.`
    );
  }

  async function keepHarborMoveGoogle(conflict: CalendarConflict) {
    const movedStart = new Date(conflict.google.start);
    movedStart.setHours(movedStart.getHours() + 2);
    const movedEnd = new Date(conflict.google.end);
    movedEnd.setHours(movedEnd.getHours() + 2);
    await saveOne({
      ...conflict.google,
      start: toLocalInput(movedStart),
      end: toLocalInput(movedEnd),
      notes: `${conflict.google.notes} (rescheduled after Google sync conflict)`,
    });
    setConflicts((prev) => prev.filter((c) => c.id !== conflict.id));
  }

  async function keepGoogleMoveHarbor(conflict: CalendarConflict) {
    const movedStart = new Date(conflict.harbor.start);
    movedStart.setHours(movedStart.getHours() + 2);
    const movedEnd = new Date(conflict.harbor.end);
    movedEnd.setHours(movedEnd.getHours() + 2);
    await saveOne({
      ...conflict.harbor,
      start: toLocalInput(movedStart),
      end: toLocalInput(movedEnd),
      notes: `${conflict.harbor.notes} (rescheduled after Google sync conflict)`,
    });
    setConflicts((prev) => prev.filter((c) => c.id !== conflict.id));
  }

  async function applyReschedule() {
    if (!reschedule) return;
    const current = events.find((e) => e.id === reschedule.eventId);
    if (!current) return;
    await saveOne({
      ...current,
      start: reschedule.start,
      end: reschedule.end,
    });
    setConflicts((prev) =>
      prev.filter(
        (c) =>
          c.harbor.id !== reschedule.eventId &&
          c.google.id !== reschedule.eventId
      )
    );
    setReschedule(null);
    setExpandedId(reschedule.eventId);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month", "year"] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              className={`btn btn-sm capitalize ${view === v ? "btn-neutral" : "btn-outline"}`}
              onClick={() => {
                setView(v);
                setCursor(startOfDay(new Date()));
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="select select-bordered select-sm bg-white"
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as CalendarEventType | "all")
            }
          >
            <option value="all">All types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => void syncGoogle()}
          >
            Sync with Google Calendar
          </button>
          <button
            type="button"
            className="btn btn-neutral btn-sm"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Hide" : "Add event"}
          </button>
        </div>
      </div>

      {syncMsg && <p className="text-sm text-emerald-800">{syncMsg}</p>}

      {showConflicts && conflicts.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold text-amber-950">
                Calendar conflicts ({conflicts.length})
              </h2>
              <p className="text-sm text-amber-900/80">
                Google and CPMC events overlap. Keep one and move the
                other, or pick a custom time.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setShowConflicts(false)}
            >
              Hide
            </button>
          </div>
          <ul className="mt-3 space-y-3">
            {conflicts.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-amber-200 bg-white/90 p-3"
              >
                <p className="text-sm font-medium">Overlap</p>
                <p className="mt-1 text-sm">
                  <span className="font-semibold">CPMC:</span>{" "}
                  {c.harbor.title} · {formatRange(c.harbor.start, c.harbor.end)}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Google:</span> {c.google.title}{" "}
                  · {formatRange(c.google.start, c.google.end)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={() => void keepHarborMoveGoogle(c)}
                  >
                    Keep CPMC · move Google +2h
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={() => void keepGoogleMoveHarbor(c)}
                  >
                    Keep Google · move CPMC +2h
                  </button>
                  <button
                    type="button"
                    className="btn btn-neutral btn-xs"
                    onClick={() =>
                      setReschedule({
                        eventId: c.harbor.id,
                        start: c.harbor.start,
                        end: c.harbor.end,
                      })
                    }
                  >
                    Reschedule CPMC…
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() =>
                      setReschedule({
                        eventId: c.google.id,
                        start: c.google.start,
                        end: c.google.end,
                      })
                    }
                  >
                    Reschedule Google…
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {reschedule && (
        <section className="rounded-2xl border border-[var(--harbor-deep)]/15 bg-white p-4 shadow-sm">
          <h3 className="font-semibold">Reschedule event</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              type="datetime-local"
              className="input input-bordered input-sm bg-white"
              value={reschedule.start}
              onChange={(e) =>
                setReschedule((r) =>
                  r ? { ...r, start: e.target.value } : r
                )
              }
            />
            <input
              type="datetime-local"
              className="input input-bordered input-sm bg-white"
              value={reschedule.end}
              onChange={(e) =>
                setReschedule((r) => (r ? { ...r, end: e.target.value } : r))
              }
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn btn-neutral btn-sm"
              onClick={() => void applyReschedule()}
            >
              Save new time
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setReschedule(null)}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 px-4 py-3 shadow-sm">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => shift(-1)}
        >
          Previous
        </button>
        <p className="font-semibold text-[var(--harbor-ink)]">{rangeLabel}</p>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => shift(1)}
        >
          Next
        </button>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm opacity-60">Loading calendar…</p>}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="grid gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
        >
          <select
            className="select select-bordered select-sm bg-white"
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                type: e.target.value as CalendarEventType,
                title:
                  e.target.value === "other"
                    ? f.title
                    : eventTypeLabel(e.target.value as CalendarEventType),
              }))
            }
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            className="input input-bordered input-sm bg-white sm:col-span-2"
            placeholder={
              form.type === "other"
                ? "Enter a custom title"
                : "Title (optional — defaults to type)"
            }
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required={form.type === "other"}
          />
          <input
            type="datetime-local"
            className="input input-bordered input-sm bg-white"
            value={form.start}
            onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
            required
          />
          <input
            type="datetime-local"
            className="input input-bordered input-sm bg-white"
            value={form.end}
            onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
            required
          />
          <input
            className="input input-bordered input-sm bg-white"
            placeholder="Location"
            value={form.location ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, location: e.target.value }))
            }
          />
          <input
            className="input input-bordered input-sm bg-white"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <button type="submit" className="btn btn-neutral btn-sm">
            Save to shared calendar
          </button>
        </form>
      )}

      {expanded && (
        <section className="rounded-2xl border border-[var(--harbor-mid)]/40 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide opacity-55">
                {expanded.source === "google" ? "Google Calendar" : "CPMC"}{" "}
                · {eventTypeLabel(expanded.type)}
              </p>
              <h2 className="text-xl font-semibold text-[var(--harbor-ink)]">
                {expanded.title}
              </h2>
              <p className="mt-1 text-sm opacity-75">
                {formatRange(expanded.start, expanded.end)}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setExpandedId(null)}
            >
              Close
            </button>
          </div>
          {expanded.location ? (
            <p className="mt-3 text-sm">
              <span className="font-medium">Location:</span> {expanded.location}
            </p>
          ) : null}
          {expanded.notes ? (
            <p className="mt-2 text-sm whitespace-pre-wrap">{expanded.notes}</p>
          ) : (
            <p className="mt-2 text-sm opacity-55">No notes on this event.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                setReschedule({
                  eventId: expanded.id,
                  start: expanded.start,
                  end: expanded.end,
                })
              }
            >
              Reschedule
            </button>
          </div>
        </section>
      )}

      {view === "year" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleDays.map((monthStart) => {
            const monthEvents = eventsInMonth(monthStart);
            return (
              <button
                key={monthStart.toISOString()}
                type="button"
                className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4 text-left shadow-sm"
                onClick={() => {
                  setCursor(startOfDay(monthStart));
                  setView("month");
                }}
              >
                <p className="font-semibold">
                  {monthStart.toLocaleDateString(undefined, { month: "long" })}
                </p>
                <p className="mt-1 text-sm opacity-65">
                  {monthEvents.length} event
                  {monthEvents.length === 1 ? "" : "s"}
                </p>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          className={`grid gap-2 ${
            view === "day"
              ? "grid-cols-1"
              : view === "week"
                ? "grid-cols-1 sm:grid-cols-7"
                : "grid-cols-7"
          }`}
        >
          {view !== "day" &&
            ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                className="hidden text-center text-xs font-medium opacity-55 sm:block"
              >
                {view === "week" || view === "month" ? d : null}
              </div>
            ))}
          {visibleDays.map((day) => {
            const dayEvents = eventsOn(day);
            const inMonth =
              view !== "month" || day.getMonth() === cursor.getMonth();
            return (
              <div
                key={day.toISOString()}
                className={`min-h-28 rounded-xl border border-[var(--harbor-deep)]/10 bg-white/90 p-2 ${
                  inMonth ? "" : "opacity-40"
                }`}
              >
                <p className="text-xs font-semibold opacity-70">
                  {day.getDate()}
                  {view === "day" || view === "week"
                    ? ` · ${day.toLocaleDateString(undefined, { weekday: "short" })}`
                    : ""}
                </p>
                <ul className="mt-1 space-y-1">
                  {dayEvents.map((ev) => (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId((id) => (id === ev.id ? null : ev.id))
                        }
                        className={`w-full rounded-md px-1.5 py-1 text-left text-[11px] leading-snug transition ${
                          expandedId === ev.id
                            ? "bg-[#6d8799] text-white"
                            : ev.isHold
                              ? "bg-[#b7c9d6]/30 text-[#2f4556]/70 ring-1 ring-dashed ring-[#8aa3b5]/70"
                              : ev.source === "google"
                              ? "bg-[#dce8f0] text-[#2f4556] ring-1 ring-[#8aa3b5]/50"
                              : "bg-[#b7c9d6]/55 text-[#2f4556]"
                        }`}
                      >
                        <span className="font-medium">
                          {new Date(ev.start).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>{" "}
                        {ev.title}
                        <span className="block opacity-70">
                          {eventTypeLabel(ev.type)}
                          {ev.isHold
                            ? " · Hold"
                            : ev.source === "google"
                              ? " · Google"
                              : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
