"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Users,
  Video,
  Accessibility,
  Building2,
} from "lucide-react";
import { useTourBookings } from "@/hooks/useTourBookings";
import { AVAILABLE_UNIT_DETAILS } from "@/lib/available-unit-details";
import {
  emptyTourDraft,
  formatDateLabel,
  getMockAvailableSlots,
  isPastDate,
  supportedTourTypes,
  toDateKey,
  type TourBooking,
  type TourDraft,
  type TourType,
} from "@/lib/tour-scheduling";

type Step = "details" | "schedule" | "review" | "done";
type Mode = "book" | "manage" | "reschedule";

const PROPERTIES = Array.from(
  new Set(AVAILABLE_UNIT_DETAILS.map((unit) => unit.property))
).sort();

function TourTypeIcon({ type }: { type: TourType }) {
  if (type === "Virtual") return <Video className="h-4 w-4" />;
  if (type === "Self-Guided") return <Building2 className="h-4 w-4" />;
  return <Users className="h-4 w-4" />;
}

function CalendarMonth({
  month,
  selectedDate,
  onSelect,
  property,
  tourType,
  bookings,
}: {
  month: Date;
  selectedDate: string;
  onSelect: (dateKey: string) => void;
  property: string;
  tourType: TourType;
  bookings: TourBooking[];
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const startPad = firstDay.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const label = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(firstDay);

  const cells: Array<{ key: string; dateKey?: string; day?: number }> = [];
  for (let i = 0; i < startPad; i += 1) {
    cells.push({ key: `pad-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = toDateKey(new Date(year, monthIndex, day, 12));
    cells.push({ key: dateKey, dateKey, day });
  }

  return (
    <div>
      <p className="mb-3 text-center text-sm font-semibold">{label}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((weekday) => (
          <span key={weekday} className="py-1">
            {weekday}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          if (!cell.dateKey || cell.day == null) {
            return <span key={cell.key} className="min-h-10" />;
          }
          const slots = getMockAvailableSlots(
            property,
            tourType,
            cell.dateKey,
            bookings
          );
          const past = isPastDate(cell.dateKey);
          const disabled = past || slots.length === 0;
          const selected = selectedDate === cell.dateKey;
          return (
            <button
              key={cell.key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(cell.dateKey!)}
              className={`min-h-10 rounded-xl text-sm transition ${
                selected
                  ? "bg-[var(--harbor-ink)] font-semibold text-[var(--harbor-sand)]"
                  : disabled
                    ? "cursor-not-allowed text-[var(--harbor-ink)]/25"
                    : "bg-white/80 hover:bg-[var(--harbor-mist)]"
              }`}
              aria-label={`${formatDateLabel(cell.dateKey)}${
                disabled ? ", unavailable" : `, ${slots.length} slots`
              }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  onReschedule,
  onCancel,
}: {
  booking: TourBooking;
  onReschedule: () => void;
  onCancel: () => void;
}) {
  const cancelled = booking.status === "cancelled";
  return (
    <article
      className={`rounded-2xl border p-5 ${
        cancelled
          ? "border-[var(--harbor-deep)]/10 bg-white/50 opacity-70"
          : "border-[var(--harbor-deep)]/10 bg-white/90"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`badge badge-sm ${
                cancelled ? "badge-ghost" : "badge-success"
              }`}
            >
              {cancelled ? "Cancelled" : "Confirmed"}
            </span>
            <span className="badge badge-outline badge-sm gap-1">
              <TourTypeIcon type={booking.tourType} />
              {booking.tourType}
            </span>
          </div>
          <h3 className="mt-2 font-display text-xl">{booking.property}</h3>
          <p className="text-sm text-[var(--harbor-ink)]/60">{booking.floorPlan}</p>
        </div>
        <div className="text-right text-sm">
          <p className="inline-flex items-center gap-1.5 font-semibold">
            <CalendarDays className="h-4 w-4 text-[var(--harbor-mid)]" />
            {formatDateLabel(booking.date)}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-[var(--harbor-ink)]/60">
            <Clock3 className="h-4 w-4" />
            {booking.time}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm text-[var(--harbor-ink)]/65">
        {booking.name} · {booking.email} · {booking.guests}{" "}
        {booking.guests === 1 ? "guest" : "guests"}
      </p>
      {!cancelled ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReschedule}
            className="btn btn-outline btn-sm"
          >
            Reschedule
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-ghost btn-sm text-error"
          >
            Cancel tour
          </button>
        </div>
      ) : null}
    </article>
  );
}

function TourSchedulingInner() {
  const searchParams = useSearchParams();
  const unitFromQuery = searchParams.get("unit") ?? "";
  const {
    bookings,
    loading,
    error,
    refresh,
    confirm,
    reschedule,
    cancel,
  } = useTourBookings();

  const [mode, setMode] = useState<Mode>("book");
  const [step, setStep] = useState<Step>("details");
  const [draft, setDraft] = useState<TourDraft>(() => {
    const base = emptyTourDraft(unitFromQuery);
    const unit = AVAILABLE_UNIT_DETAILS.find((item) => item.id === unitFromQuery);
    if (!unit) return base;
    return {
      ...base,
      unitId: unit.id,
      property: unit.property,
      floorPlan: unit.floorPlan,
    };
  });
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [confirmed, setConfirmed] = useState<TourBooking | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const unitsForProperty = useMemo(
    () =>
      AVAILABLE_UNIT_DETAILS.filter((unit) => unit.property === draft.property),
    [draft.property]
  );

  const tourTypes = useMemo(
    () => supportedTourTypes(draft.property),
    [draft.property]
  );

  const availableSlots = useMemo(() => {
    if (!draft.property || !draft.date) return [];
    return getMockAvailableSlots(
      draft.property,
      draft.tourType,
      draft.date,
      bookings.filter((booking) => booking.id !== rescheduleId)
    );
  }, [bookings, draft.date, draft.property, draft.tourType, rescheduleId]);

  const activeBookings = bookings.filter(
    (booking) => booking.status === "confirmed"
  );
  const pastBookings = bookings.filter(
    (booking) => booking.status === "cancelled"
  );

  function updateDraft<K extends keyof TourDraft>(key: K, value: TourDraft[K]) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === "property") {
        next.unitId = "";
        next.floorPlan = "";
        next.date = "";
        next.time = "";
        if (!supportedTourTypes(String(value)).includes(current.tourType)) {
          next.tourType = "In-Person";
        }
      }
      if (key === "tourType" || key === "date") {
        next.time = "";
      }
      return next;
    });
    setFormError(null);
  }

  function selectUnit(unitId: string) {
    const unit = AVAILABLE_UNIT_DETAILS.find((item) => item.id === unitId);
    setDraft((current) => ({
      ...current,
      unitId,
      floorPlan: unit?.floorPlan ?? "",
      property: unit?.property || current.property,
    }));
    setFormError(null);
  }

  function validateDetails(): string | null {
    if (!draft.property) return "Choose a property.";
    if (!draft.unitId) return "Choose a unit or floor plan.";
    if (!tourTypes.includes(draft.tourType)) {
      return "That tour type is not available for this property.";
    }
    if (!draft.name.trim()) return "Enter a contact name.";
    if (!draft.email.trim() || !draft.email.includes("@")) {
      return "Enter a valid email.";
    }
    if (!draft.phone.trim()) return "Enter a phone number.";
    if (draft.guests < 1 || draft.guests > 8) {
      return "Guests must be between 1 and 8.";
    }
    return null;
  }

  function goToSchedule(event: FormEvent) {
    event.preventDefault();
    const message = validateDetails();
    if (message) {
      setFormError(message);
      return;
    }
    setStep("schedule");
  }

  function goToReview() {
    if (!draft.date) {
      setFormError("Select a date on the calendar.");
      return;
    }
    if (!draft.time || !availableSlots.includes(draft.time)) {
      setFormError("Select an available time slot.");
      return;
    }
    setFormError(null);
    setStep("review");
  }

  function submitBooking() {
    try {
      if (mode === "reschedule" && rescheduleId) {
        reschedule(rescheduleId, draft.date, draft.time);
        const updated = {
          ...draft,
          id: rescheduleId,
          status: "confirmed" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setConfirmed(updated);
      } else {
        const booking = confirm(draft);
        setConfirmed(booking);
      }
      setStep("done");
      setMode("book");
      setRescheduleId(null);
    } catch {
      setFormError("Could not save this tour booking.");
    }
  }

  function startFresh() {
    setDraft(emptyTourDraft());
    setConfirmed(null);
    setStep("details");
    setMode("book");
    setRescheduleId(null);
    setFormError(null);
  }

  function beginReschedule(booking: TourBooking) {
    setMode("reschedule");
    setRescheduleId(booking.id);
    setDraft({
      property: booking.property,
      unitId: booking.unitId,
      floorPlan: booking.floorPlan,
      tourType: booking.tourType,
      date: "",
      time: "",
      guests: booking.guests,
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      accessibility: booking.accessibility,
      notes: booking.notes,
    });
    setStep("schedule");
    setFormError(null);
    setConfirmed(null);
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading tour scheduling">
        <div className="skeleton h-40 w-full rounded-3xl" />
        <div className="skeleton h-64 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="rounded-3xl bg-[var(--harbor-ink)] px-6 py-8 text-[var(--harbor-sand)] sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-glow)]">
          Harborline leasing
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">
          Schedule a tour
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Choose a space, pick an available time, and confirm. Availability
          below is mock scheduling data for local demos.
        </p>
      </div>

      {error ? (
        <div className="alert border-error/20 bg-error/10 text-[var(--harbor-ink)]">
          <AlertCircle className="h-5 w-5 text-error" />
          <div className="flex-1">
            <p className="font-semibold">Could not load saved tours</p>
            <p className="text-sm opacity-70">{error}</p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="btn btn-sm btn-outline gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn btn-sm ${mode === "book" || mode === "reschedule" ? "btn-neutral" : "btn-outline"}`}
          onClick={startFresh}
        >
          Book a tour
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === "manage" ? "btn-neutral" : "btn-outline"}`}
          onClick={() => {
            setMode("manage");
            setFormError(null);
          }}
        >
          My tours ({activeBookings.length})
        </button>
      </div>

      {mode === "manage" ? (
        <section className="space-y-4">
          {activeBookings.length === 0 && pastBookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--harbor-deep)]/25 bg-white/65 px-6 py-14 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-[var(--harbor-mid)]" />
              <h2 className="mt-4 font-display text-3xl">No tours yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--harbor-ink)]/60">
                Book a tour to see it here. Confirmations are stored in this
                browser until a scheduling backend is connected.
              </p>
              <button
                type="button"
                className="btn btn-neutral mt-6"
                onClick={startFresh}
              >
                Schedule a tour
              </button>
            </div>
          ) : (
            <>
              {activeBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onReschedule={() => beginReschedule(booking)}
                  onCancel={() => cancel(booking.id)}
                />
              ))}
              {pastBookings.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/50">
                    Cancelled
                  </h2>
                  {pastBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      onReschedule={() => beginReschedule(booking)}
                      onCancel={() => cancel(booking.id)}
                    />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {mode !== "manage" ? (
        <>
          {mode === "reschedule" ? (
            <div className="rounded-2xl border border-[var(--harbor-mid)]/30 bg-[var(--harbor-mist)]/50 px-4 py-3 text-sm">
              Rescheduling {draft.property} · {draft.floorPlan}. Contact details
              stay the same — choose a new date and time.
            </div>
          ) : null}

          {step !== "done" ? (
            <ol className="flex flex-wrap gap-2 text-sm">
              {(
                [
                  ["details", "1. Details"],
                  ["schedule", "2. Date & time"],
                  ["review", "3. Review"],
                ] as const
              ).map(([id, label]) => (
                <li
                  key={id}
                  className={`rounded-full px-3 py-1 ${
                    step === id
                      ? "bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                      : "bg-white/70 text-[var(--harbor-ink)]/55"
                  }`}
                >
                  {label}
                </li>
              ))}
            </ol>
          ) : null}

          {formError ? (
            <div className="alert alert-warning text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{formError}</span>
            </div>
          ) : null}

          {step === "details" ? (
            <form
              onSubmit={goToSchedule}
              className="space-y-5 rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 sm:p-7"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                    Property
                  </span>
                  <select
                    className="select select-bordered w-full"
                    value={draft.property}
                    onChange={(event) =>
                      updateDraft("property", event.target.value)
                    }
                    required
                  >
                    <option value="">Select a property</option>
                    {PROPERTIES.map((property) => (
                      <option key={property}>{property}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                    Unit / floor plan
                  </span>
                  <select
                    className="select select-bordered w-full"
                    value={draft.unitId}
                    onChange={(event) => selectUnit(event.target.value)}
                    required
                    disabled={!draft.property}
                  >
                    <option value="">Select a unit</option>
                    {unitsForProperty.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.floorPlan}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <fieldset>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide">
                  Tour type
                </legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(["In-Person", "Virtual", "Self-Guided"] as TourType[]).map(
                    (type) => {
                      const supported = tourTypes.includes(type);
                      return (
                        <label
                          key={type}
                          className={`flex cursor-pointer items-center gap-2 rounded-2xl border p-3 text-sm ${
                            draft.tourType === type
                              ? "border-[var(--harbor-ink)] bg-[var(--harbor-mist)]/40"
                              : "border-[var(--harbor-deep)]/10"
                          } ${supported ? "" : "cursor-not-allowed opacity-40"}`}
                        >
                          <input
                            type="radio"
                            name="tourType"
                            className="radio radio-sm"
                            checked={draft.tourType === type}
                            disabled={!supported || !draft.property}
                            onChange={() => updateDraft("tourType", type)}
                          />
                          <TourTypeIcon type={type} />
                          <span>
                            {type}
                            {!supported && draft.property
                              ? " (not offered)"
                              : ""}
                          </span>
                        </label>
                      );
                    }
                  )}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                    Guests
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    className="input input-bordered w-full"
                    value={draft.guests}
                    onChange={(event) =>
                      updateDraft("guests", Number(event.target.value) || 1)
                    }
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                    Full name
                  </span>
                  <input
                    className="input input-bordered w-full"
                    value={draft.name}
                    onChange={(event) =>
                      updateDraft("name", event.target.value)
                    }
                    required
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                    Email
                  </span>
                  <input
                    type="email"
                    className="input input-bordered w-full"
                    value={draft.email}
                    onChange={(event) =>
                      updateDraft("email", event.target.value)
                    }
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                    Phone
                  </span>
                  <input
                    type="tel"
                    className="input input-bordered w-full"
                    value={draft.phone}
                    onChange={(event) =>
                      updateDraft("phone", event.target.value)
                    }
                    required
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                  <Accessibility className="h-3.5 w-3.5" />
                  Accessibility requests
                </span>
                <textarea
                  className="textarea textarea-bordered min-h-20 w-full"
                  value={draft.accessibility}
                  onChange={(event) =>
                    updateDraft("accessibility", event.target.value)
                  }
                  placeholder="Mobility needs, language preference, etc."
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
                  Notes
                </span>
                <textarea
                  className="textarea textarea-bordered min-h-20 w-full"
                  value={draft.notes}
                  onChange={(event) => updateDraft("notes", event.target.value)}
                  placeholder="Anything else the leasing team should know."
                />
              </label>

              <button type="submit" className="btn btn-neutral gap-2">
                Continue to calendar
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          ) : null}

          {step === "schedule" ? (
            <div className="grid gap-6 rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 sm:p-7 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-2xl">Pick a date</h2>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-circle"
                      onClick={() =>
                        setMonthCursor(
                          (current) =>
                            new Date(
                              current.getFullYear(),
                              current.getMonth() - 1,
                              1
                            )
                        )
                      }
                      aria-label="Previous month"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-circle"
                      onClick={() =>
                        setMonthCursor(
                          (current) =>
                            new Date(
                              current.getFullYear(),
                              current.getMonth() + 1,
                              1
                            )
                        )
                      }
                      aria-label="Next month"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <CalendarMonth
                  month={monthCursor}
                  selectedDate={draft.date}
                  property={draft.property}
                  tourType={draft.tourType}
                  bookings={bookings.filter(
                    (booking) => booking.id !== rescheduleId
                  )}
                  onSelect={(dateKey) => updateDraft("date", dateKey)}
                />
                <p className="mt-3 text-xs text-[var(--harbor-ink)]/55">
                  Past dates and fully booked or closed days are disabled.
                </p>
              </div>

              <div>
                <h2 className="font-display text-2xl">Available times</h2>
                {!draft.date ? (
                  <p className="mt-4 text-sm text-[var(--harbor-ink)]/60">
                    Select a highlighted date to see open slots.
                  </p>
                ) : availableSlots.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 p-6 text-sm text-[var(--harbor-ink)]/60">
                    No remaining times on {formatDateLabel(draft.date)}. Choose
                    another day.
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => updateDraft("time", slot)}
                        className={`btn btn-sm ${
                          draft.time === slot ? "btn-neutral" : "btn-outline"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  {mode !== "reschedule" ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setStep("details")}
                    >
                      Back
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-neutral gap-2"
                    onClick={goToReview}
                  >
                    Review booking
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {step === "review" ? (
            <section className="space-y-5 rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 sm:p-7">
              <h2 className="font-display text-3xl">Review your tour</h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Property", draft.property],
                  ["Unit / floor plan", draft.floorPlan],
                  ["Tour type", draft.tourType],
                  ["Date", formatDateLabel(draft.date)],
                  ["Time", draft.time],
                  ["Guests", String(draft.guests)],
                  ["Name", draft.name],
                  ["Email", draft.email],
                  ["Phone", draft.phone],
                  [
                    "Accessibility",
                    draft.accessibility.trim() || "None requested",
                  ],
                  ["Notes", draft.notes.trim() || "None"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-[var(--harbor-sand)]/60 p-4"
                  >
                    <dt className="text-xs uppercase tracking-wide text-[var(--harbor-ink)]/50">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStep("schedule")}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-neutral gap-2"
                  onClick={submitBooking}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {mode === "reschedule" ? "Confirm reschedule" : "Confirm tour"}
                </button>
              </div>
            </section>
          ) : null}

          {step === "done" && confirmed ? (
            <section className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90 p-6 text-center sm:p-10">
              <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--harbor-mid)]" />
              <h2 className="mt-4 font-display text-4xl">Tour confirmed</h2>
              <p className="mx-auto mt-3 max-w-xl text-[var(--harbor-ink)]/65">
                {confirmed.tourType} tour for {confirmed.floorPlan} at{" "}
                {confirmed.property} on {formatDateLabel(confirmed.date)} at{" "}
                {confirmed.time}.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="btn btn-neutral"
                  onClick={() => setMode("manage")}
                >
                  View my tours
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={startFresh}
                >
                  Book another tour
                </button>
                <Link href="/portal/units" className="btn btn-ghost">
                  Browse units
                </Link>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <p className="text-center text-xs text-[var(--harbor-ink)]/50">
        Scheduling uses isolated mock availability and browser storage
        (`harborline_tour_bookings`). Past and unavailable slots cannot be
        selected.
      </p>
    </div>
  );
}

export function TourSchedulingWorkflow() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" aria-label="Loading tour scheduling">
          <div className="skeleton h-40 w-full rounded-3xl" />
          <div className="skeleton h-64 w-full rounded-3xl" />
        </div>
      }
    >
      <TourSchedulingInner />
    </Suspense>
  );
}
