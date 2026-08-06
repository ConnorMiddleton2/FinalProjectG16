"use client";

import { FormEvent, useEffect, useState } from "react";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalField } from "@/components/portal/PortalField";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import {
  readFutureApplicantSessionSync,
} from "@/lib/portal/auth-client";
import type { PropertySummary } from "@/lib/portal/future/models";
import {
  cancelWaitlistEntry,
  joinWaitlist,
  listProperties,
  listWaitlistEntries,
} from "@/lib/portal/future/services";
import type {
  WaitlistEntry,
  WaitlistOccupancyClass,
} from "@/lib/portal/future/waitlist-types";

export function FutureWaitlistPage() {
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState("");
  const [occupancyClass, setOccupancyClass] =
    useState<WaitlistOccupancyClass>("personal");
  const [unitPreference, setUnitPreference] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredMoveIn, setPreferredMoveIn] = useState("");
  const [notes, setNotes] = useState("");

  async function reload(userId: string | null) {
    setStatus("loading");
    setError(null);
    const [propsResult, listResult] = await Promise.all([
      listProperties(),
      listWaitlistEntries(userId),
    ]);
    if (!propsResult.ok) {
      setError(propsResult.error.message);
      setStatus("error");
      return;
    }
    if (!listResult.ok) {
      setError(listResult.error.message);
      setStatus("error");
      return;
    }
    setProperties(propsResult.data);
    setEntries(listResult.data);
    if (!propertyId && propsResult.data[0]) {
      setPropertyId(propsResult.data[0].id);
      setOccupancyClass(propsResult.data[0].occupancyClass);
    }
    setStatus("ready");
  }

  useEffect(() => {
    const session = readFutureApplicantSessionSync();
    const userId = session?.userId ?? null;
    setOwnerUserId(userId);
    if (session?.displayName) setFullName(session.displayName);
    if (session?.email) setEmail(session.email);
    void reload(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  async function onJoin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    const result = await joinWaitlist({
      ownerUserId,
      propertyId,
      occupancyClass,
      unitPreference,
      fullName,
      email,
      phone,
      preferredMoveIn,
      notes,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMessage(
      `Joined ${result.data.propertyName} waitlist at position #${result.data.position}.`
    );
    setUnitPreference("");
    setNotes("");
    await reload(ownerUserId);
  }

  async function onCancel(entryId: string) {
    setCancellingId(entryId);
    setError(null);
    setMessage(null);
    const result = await cancelWaitlistEntry(entryId, ownerUserId);
    setCancellingId(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMessage(`Removed from the ${result.data.propertyName} waitlist.`);
    await reload(ownerUserId);
  }

  return (
    <div className="space-y-6">
      <PortalCard className="space-y-3">
        <h2 className="portal-section-title">Interest list &amp; waitlist</h2>
        <p className="text-sm text-[var(--harbor-muted)]">
          Join a waitlist when a personal home or commercial suite is not ready
          yet. Harborline leasing will contact you when inventory opens.
        </p>
        {!ownerUserId ? (
          <p className="text-sm text-[var(--harbor-muted)]">
            You can join without signing in. Sign in later to manage your
            entries in this browser session.
          </p>
        ) : null}
      </PortalCard>

      <PortalCard as="form" onSubmit={onJoin} className="space-y-4">
        <h2 className="portal-section-title">Join a waitlist</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <PortalField
            label="Property"
            as="select"
            required
            value={propertyId}
            onChange={(e) => {
              const id = e.target.value;
              setPropertyId(id);
              const prop = properties.find((p) => p.id === id);
              if (prop) setOccupancyClass(prop.occupancyClass);
            }}
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.occupancyClass})
              </option>
            ))}
          </PortalField>
          <PortalField
            label="Occupancy class"
            as="select"
            value={occupancyClass}
            onChange={(e) =>
              setOccupancyClass(e.target.value as WaitlistOccupancyClass)
            }
          >
            <option value="personal">Personal</option>
            <option value="commercial">Commercial</option>
          </PortalField>
          <PortalField
            label="Full name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <PortalField
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PortalField
            label="Phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <PortalField
            label="Preferred move-in"
            type="date"
            value={preferredMoveIn}
            onChange={(e) => setPreferredMoveIn(e.target.value)}
          />
          <PortalField
            label="Unit preference"
            value={unitPreference}
            onChange={(e) => setUnitPreference(e.target.value)}
            placeholder="2 bed, Suite 200+, any floor"
            className="sm:col-span-2"
          />
          <PortalField
            as="textarea"
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="sm:col-span-2"
          />
        </div>
        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-[var(--harbor-ink)]" role="status">
            {message}
          </p>
        ) : null}
        <button
          type="submit"
          className="portal-btn portal-btn-primary portal-focus"
          disabled={busy || status === "loading"}
        >
          {busy ? "Joining..." : "Join waitlist"}
        </button>
      </PortalCard>

      <PortalCard className="space-y-3">
        <h2 className="portal-section-title">Your waitlist entries</h2>
        {status === "loading" ? (
          <p className="text-sm text-[var(--harbor-muted)]" role="status">
            Loading waitlist...
          </p>
        ) : null}
        {status === "ready" && entries.length === 0 ? (
          <p className="portal-empty">No waitlist entries yet.</p>
        ) : null}
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl border border-[var(--harbor-deep)]/10 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--harbor-ink)]">
                    {entry.propertyName}
                  </p>
                  <p className="mt-1 text-sm text-[var(--harbor-muted)]">
                    {entry.occupancyClass} · {entry.unitPreference}
                    {entry.status === "active"
                      ? ` · Position #${entry.position}`
                      : null}
                  </p>
                  <p className="mt-1 text-sm text-[var(--harbor-muted)]">
                    {entry.fullName} · {entry.email}
                  </p>
                </div>
                <PortalStatusBadge
                  tone={
                    entry.status === "active"
                      ? "info"
                      : entry.status === "cancelled"
                        ? "neutral"
                        : "success"
                  }
                >
                  {entry.status}
                </PortalStatusBadge>
              </div>
              {entry.status === "active" ? (
                <button
                  type="button"
                  className="mt-3 portal-btn portal-btn-secondary portal-focus"
                  disabled={cancellingId === entry.id}
                  onClick={() => void onCancel(entry.id)}
                >
                  {cancellingId === entry.id ? "Cancelling..." : "Leave waitlist"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </PortalCard>
    </div>
  );
}
