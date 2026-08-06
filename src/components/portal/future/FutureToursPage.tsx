"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalField } from "@/components/portal/PortalField";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import { useClientSearchParams } from "@/hooks/useClientSearchParams";
import { getAnyPortalSessionClient } from "@/lib/portal/auth-client";
import type {
  PropertySummary,
  TourRequest,
  TourType,
} from "@/lib/portal/future/models";
import { occupancyClassLabel } from "@/lib/portal/occupancy";
import {
  createTour,
  getAvailability,
  listProperties,
  listTours,
  listUnits,
  TOUR_TIME_SLOTS,
} from "@/lib/portal/future/services";
import {
  formatTourTime12h,
  formatTourTimeSelected,
  formatTourTimeWithZone,
  TOUR_TIME_ZONE_LABEL,
} from "@/lib/portal/future/tour-time";

function todayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const DEFAULT_SLOTS = TOUR_TIME_SLOTS.map((time) => ({
  time,
  available: true,
}));

export function FutureToursPage() {
  const searchParams = useClientSearchParams();
  const searchKey = searchParams.toString();
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [propertyId, setPropertyId] = useState("prop-pier12");
  const [unitId, setUnitId] = useState("");
  const [unitOptions, setUnitOptions] = useState<
    Array<{ id: string; label: string; propertyId: string }>
  >([]);
  const [tourType, setTourType] = useState<TourType>("in_person");
  const [date, setDate] = useState("");
  const [minDate, setMinDate] = useState("");
  const [timeSlot, setTimeSlot] = useState<string>("");
  const [slots, setSlots] =
    useState<Array<{ time: string; available: boolean }>>(DEFAULT_SLOTS);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState("1");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [accessibilityRequests, setAccessibilityRequests] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<TourRequest | null>(null);
  const [myTours, setMyTours] = useState<TourRequest[]>([]);
  const [toursStatus, setToursStatus] = useState<
    "idle" | "loading" | "ready" | "empty" | "error"
  >("idle");
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  useEffect(() => {
    if (!clientReady) return;
    const today = todayIso();
    setMinDate(today);
    setDate((current) => current || today);
  }, [clientReady]);

  useEffect(() => {
    const params = new URLSearchParams(searchKey);
    const nextProperty = params.get("propertyId");
    const nextUnit = params.get("unitId") ?? "";
    if (nextProperty) setPropertyId(nextProperty);
    setUnitId(nextUnit);
  }, [searchKey]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [propsResult, unitsResult, session] = await Promise.all([
        listProperties(),
        listUnits({}, "newest"),
        getAnyPortalSessionClient(),
      ]);
      if (cancelled) return;

      if (propsResult.ok && propsResult.data.length) {
        setProperties(propsResult.data);
        setPropertyId((current) =>
          propsResult.data.some((p) => p.id === current)
            ? current
            : propsResult.data[0]!.id
        );
      }

      if (unitsResult.ok) {
        setUnitOptions(
          unitsResult.data.map((unit) => ({
            id: unit.id,
            label: `${unit.unitLabel} · ${unit.floorPlan}`,
            propertyId: unit.propertyId,
          }))
        );
      }

      if (!session) {
        setToursStatus("idle");
        return;
      }
      setOwnerUserId(session.userId);
      setContactName((prev) => prev || session.displayName);
      setContactEmail((prev) => prev || session.email);
      setToursStatus("loading");
      const toursResult = await listTours(session.userId);
      if (cancelled) return;
      if (!toursResult.ok) {
        setToursStatus("error");
        return;
      }
      setMyTours(toursResult.data);
      setToursStatus(toursResult.data.length ? "ready" : "empty");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!propertyId || !date) return;
      setSlotsLoading(true);
      setSlotsError(null);
      setTimeSlot("");
      const result = await getAvailability(propertyId, date);
      if (cancelled) return;
      setSlotsLoading(false);
      if (!result.ok) {
        setSlotsError(result.error.message);
        setSlots(DEFAULT_SLOTS);
        return;
      }
      setSlots(result.data.slots.length ? result.data.slots : DEFAULT_SLOTS);
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId, date]);

  const filteredUnits = useMemo(
    () => unitOptions.filter((u) => u.propertyId === propertyId),
    [unitOptions, propertyId]
  );

  useEffect(() => {
    if (unitId && !filteredUnits.some((u) => u.id === unitId)) {
      setUnitId("");
    }
  }, [filteredUnits, unitId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (!propertyId) {
      setFormError("Select a property.");
      return;
    }
    if (!date) {
      setFormError("Select a tour date.");
      return;
    }
    if (!timeSlot) {
      setFormError("Select an available time slot.");
      return;
    }
    if (!contactName.trim()) {
      setFormError("Enter a contact name.");
      return;
    }
    if (!isValidEmail(contactEmail)) {
      setFormError("Enter a valid contact email.");
      return;
    }
    if (contactPhone.trim().replace(/\D/g, "").length < 7) {
      setFormError("Enter a contact phone number so leasing can confirm.");
      return;
    }

    setSubmitting(true);
    const owner =
      ownerUserId ??
      `guest-${(contactEmail || "visitor").replace(/[^a-z0-9]/gi, "").slice(0, 12)}`;
    const selectedUnit = filteredUnits.find((u) => u.id === unitId);
    const result = await createTour({
      ownerUserId: owner,
      propertyId,
      unitId: unitId || null,
      unitLabel: selectedUnit?.label ?? null,
      tourType,
      date,
      timeSlot,
      guestCount: Number(guestCount) || 1,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      accessibilityRequests,
      notes,
    });
    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.error.message);
      return;
    }
    setSuccess(result.data);
    setOwnerUserId(owner);
    const tours = await listTours(owner);
    if (tours.ok) {
      setMyTours(tours.data);
      setToursStatus(tours.data.length ? "ready" : "empty");
    }
  }

  const propertyChoices = properties.length
    ? properties
    : [
        {
          id: "prop-pier12",
          name: "Pier 12 Residences",
          occupancyClass: "personal" as const,
          propertyType: "multifamily" as const,
          city: "",
          neighborhood: "",
          addressLine: "",
        },
      ];

  if (!clientReady) {
    return (
      <p className="text-sm text-[var(--harbor-muted)]" role="status">
        Loading tour scheduling…
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <PortalCard as="form" onSubmit={onSubmit} className="space-y-4">
        <h2 className="portal-section-title">Request a tour</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <PortalField
            label="Property"
            as="select"
            required
            value={propertyId}
            onChange={(e) => {
              setPropertyId(e.target.value);
              setUnitId("");
            }}
          >
            {propertyChoices.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name} ({occupancyClassLabel(property.occupancyClass)})
              </option>
            ))}
          </PortalField>

          <PortalField
            label="Unit / suite (optional)"
            as="select"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
          >
            <option value="">Any available space</option>
            {filteredUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </PortalField>

          <PortalField
            label="Tour type"
            as="select"
            value={tourType}
            onChange={(e) => setTourType(e.target.value as TourType)}
          >
            <option value="in_person">In person</option>
            <option value="virtual">Virtual</option>
            <option value="self_guided">Self-guided</option>
          </PortalField>

          <PortalField
            label="Date"
            type="date"
            required
            min={minDate || undefined}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <fieldset className="rounded-xl border border-[var(--harbor-deep)]/20 bg-white p-3 shadow-sm">
          <legend className="px-1 text-sm font-semibold text-[var(--harbor-ink)]">
            Available times ({TOUR_TIME_ZONE_LABEL})
            {slotsLoading ? " · updating…" : ""}
          </legend>
          <p className="mb-2 text-xs text-[var(--harbor-muted)]">
            All tour times are shown in {TOUR_TIME_ZONE_LABEL}. Harborline
            properties use this zone for leasing appointments.
          </p>
          {slotsError ? (
            <p className="mb-2 text-sm text-error" role="alert">
              {slotsError} Showing default slots so you can still book.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                aria-pressed={timeSlot === slot.time}
                aria-label={`${formatTourTimeWithZone(slot.time)}${
                  slot.available ? "" : " unavailable"
                }`}
                className={`min-h-11 rounded-xl border px-2 text-sm font-semibold portal-focus disabled:cursor-not-allowed disabled:opacity-40 ${
                  timeSlot === slot.time
                    ? "border-[var(--harbor-ink)] bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                    : "border-[var(--harbor-deep)]/25 bg-[var(--harbor-sand)] text-[var(--harbor-ink)] hover:border-[var(--harbor-mid)]"
                }`}
                onClick={() => setTimeSlot(slot.time)}
              >
                {formatTourTime12h(slot.time)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--harbor-muted)]">
            {timeSlot
              ? `Selected: ${formatTourTimeSelected(timeSlot)}`
              : "Pick a time to enable scheduling."}
          </p>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <PortalField
            label="Guest count"
            type="number"
            min={1}
            max={8}
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
          />
          <PortalField
            label="Contact phone"
            type="tel"
            required
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            autoComplete="tel"
          />
          <PortalField
            label="Contact name"
            required
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            autoComplete="name"
          />
          <PortalField
            label="Contact email"
            type="email"
            required
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <details className="rounded-xl border border-[var(--harbor-deep)]/15 bg-[var(--harbor-sand)]/30 p-3">
          <summary className="cursor-pointer text-sm font-medium text-[var(--harbor-ink)] portal-focus rounded">
            Accessibility requests &amp; notes (optional)
          </summary>
          <div className="mt-3 space-y-3">
            <PortalField
              label="Accessibility requests"
              as="textarea"
              value={accessibilityRequests}
              onChange={(e) => setAccessibilityRequests(e.target.value)}
            />
            <PortalField
              label="Notes"
              as="textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </details>

        {formError ? (
          <p className="text-sm text-error" role="alert">
            {formError}
          </p>
        ) : null}
        {success ? (
          <p
            className="rounded-xl bg-[var(--harbor-mist)]/60 p-3 text-sm text-[var(--harbor-ink)]"
            role="status"
          >
            Tour requested for {success.date} at{" "}
            {formatTourTimeSelected(success.timeSlot)}. Status: {success.status}
            .
          </p>
        ) : null}

        <button
          type="submit"
          className="portal-btn portal-btn-primary w-full portal-focus"
          disabled={submitting}
        >
          {submitting ? "Scheduling…" : "Schedule tour"}
        </button>
      </PortalCard>

      <PortalCard className="space-y-3 self-start">
        <h2 className="portal-section-title">Your tours</h2>
        {toursStatus === "idle" ? (
          <p className="text-sm text-[var(--harbor-muted)]">
            Schedule below as a guest, or sign in to keep tour history.
          </p>
        ) : null}
        {toursStatus === "loading" ? (
          <p className="text-sm text-[var(--harbor-muted)]" role="status">
            Loading tours…
          </p>
        ) : null}
        {toursStatus === "error" ? (
          <p className="text-sm text-error" role="alert">
            Could not load your tours.
          </p>
        ) : null}
        {toursStatus === "empty" ? (
          <p className="portal-empty">No tours scheduled yet.</p>
        ) : null}
        {toursStatus === "ready" ? (
          <ul className="space-y-3">
            {myTours.map((tour) => (
              <li
                key={tour.id}
                className="rounded-xl border border-[var(--harbor-deep)]/10 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[var(--harbor-ink)]">
                    {tour.propertyName}
                  </p>
                  <PortalStatusBadge
                    tone={
                      tour.status === "cancelled"
                        ? "danger"
                        : tour.status === "completed"
                          ? "success"
                          : "info"
                    }
                  >
                    {tour.status}
                  </PortalStatusBadge>
                </div>
                <p className="mt-1 text-sm text-[var(--harbor-muted)]">
                  {tour.date} · {formatTourTimeWithZone(tour.timeSlot)} ·{" "}
                  {tour.tourType.replace("_", " ")}
                </p>
                {tour.unitLabel ? (
                  <p className="mt-1 text-xs text-[var(--harbor-muted)]">
                    {tour.unitLabel}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </PortalCard>
    </div>
  );
}
