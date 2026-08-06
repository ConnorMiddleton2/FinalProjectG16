"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  selectUnitFromAvailability,
  signLeasePacketAction,
} from "@/app/portal/tenant-account-actions";

type AppRow = {
  id: string;
  property: string;
  building?: string;
  unitLabel?: string;
  proposedRent?: number;
  smStatus?: string;
  status: string;
  leasePacketStatus?: string;
  createdAt: string;
};

type MsgRow = {
  id: string;
  subject: string;
  body: string;
  fromRole: string;
  createdAt: string;
  availabilityJson: string;
  relatedApplicationId: string;
};

type AvailabilityUnit = {
  unitId: string;
  propertyId: string;
  propertyName: string;
  unit: string;
  floorPlan?: string;
  sqft?: number;
  askingRent: number;
};

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function ProspectPortalClient({
  account,
  applications,
  messages,
}: {
  account: {
    fullName: string;
    email: string;
    status: string;
    propertyName: string;
    unit: string;
    lookingFor: string;
  };
  applications: AppRow[];
  messages: MsgRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [legalName, setLegalName] = useState(account.fullName);
  const [ack, setAck] = useState(false);

  const leaseApp = applications.find(
    (a) => a.leasePacketStatus === "sent" || a.leasePacketStatus === "signed"
  );

  const latestAvailability = useMemo(() => {
    for (const m of messages) {
      if (!m.availabilityJson) continue;
      try {
        const parsed = JSON.parse(m.availabilityJson) as AvailabilityUnit[];
        if (Array.isArray(parsed) && parsed.length) {
          return { message: m, units: parsed };
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  }, [messages]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--harbor-mid)]">
          Applicant portal
        </p>
        <h1 className="font-display text-3xl tracking-tight text-[var(--harbor-ink)] sm:text-4xl">
          Welcome, {account.fullName}
        </h1>
        <p className="max-w-2xl text-sm text-[var(--harbor-muted)]">
          Track your application, messages from Sales &amp; Marketing, unit
          options, and lease signing. Status:{" "}
          <span className="font-medium text-[var(--harbor-ink)]">
            {account.status.replaceAll("_", " ")}
          </span>
          {account.lookingFor ? ` · Looking for: ${account.lookingFor}` : ""}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href="/portal/start" className="btn btn-sm btn-ghost">
            Browse properties
          </Link>
          <Link href="/portal/apply" className="btn btn-sm btn-outline">
            Start another application
          </Link>
        </div>
      </header>

      {msg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {msg}
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
          Your applications
        </h2>
        {applications.length === 0 ? (
          <p className="text-sm opacity-60">No applications on file yet.</p>
        ) : (
          <ul className="space-y-2">
            {applications.map((a) => (
              <li
                key={a.id}
                className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 px-4 py-3"
              >
                <p className="font-medium">{a.building || a.property}</p>
                <p className="text-sm opacity-70">
                  {a.unitLabel ? `Unit ${a.unitLabel}` : "Unit TBD"}
                  {a.proposedRent != null
                    ? ` · ${money(a.proposedRent)}/mo`
                    : ""}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide opacity-55">
                  {(a.smStatus || a.status).replaceAll("_", " ")}
                  {a.leasePacketStatus
                    ? ` · lease ${a.leasePacketStatus}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {latestAvailability ? (
        <section className="space-y-3 rounded-2xl border border-[var(--harbor-mid)]/30 bg-[var(--harbor-sand)]/40 p-5">
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            Available units from Sales &amp; Marketing
          </h2>
          <p className="text-sm text-[var(--harbor-muted)]">
            {latestAvailability.message.body}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {latestAvailability.units.map((u) => (
              <button
                key={u.unitId}
                type="button"
                disabled={pending}
                className="rounded-xl border border-[var(--harbor-deep)]/15 bg-white px-4 py-3 text-left transition hover:border-[var(--harbor-mid)]"
                onClick={() => {
                  const appId =
                    latestAvailability.message.relatedApplicationId ||
                    applications[0]?.id;
                  if (!appId) {
                    setMsg("No application to attach this unit to.");
                    return;
                  }
                  startTransition(async () => {
                    const result = await selectUnitFromAvailability({
                      applicationId: appId,
                      unitId: u.unitId,
                      propertyId: u.propertyId,
                      propertyName: u.propertyName,
                      unitLabel: u.unit,
                      askingRent: u.askingRent,
                    });
                    if (result.error) {
                      setMsg(result.error);
                      return;
                    }
                    setMsg(`Selected ${u.propertyName} · ${u.unit}.`);
                    router.refresh();
                  });
                }}
              >
                <p className="font-semibold">{u.unit}</p>
                <p className="text-sm opacity-70">
                  {u.propertyName}
                  {u.floorPlan ? ` · ${u.floorPlan}` : ""}
                  {u.sqft ? ` · ${u.sqft} SF` : ""}
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--harbor-deep)]">
                  {money(u.askingRent)}/mo · Select
                </p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {leaseApp && leaseApp.leasePacketStatus === "sent" ? (
        <section className="space-y-3 rounded-2xl border border-[var(--harbor-ink)]/15 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Sign lease packet</h2>
          <p className="text-sm text-[var(--harbor-muted)]">
            Sales &amp; Marketing confirmed{" "}
            {leaseApp.building || leaseApp.property}
            {leaseApp.unitLabel ? ` · ${leaseApp.unitLabel}` : ""}
            {leaseApp.proposedRent != null
              ? ` at ${money(leaseApp.proposedRent)}/mo`
              : ""}
            . Sign below to submit the legal acknowledgment. Final move-in
            requires S&amp;M approval of your signed packet.
          </p>
          <label className="form-control max-w-md">
            <span className="label-text text-sm">Full legal name</span>
            <input
              className="input input-bordered"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm mt-0.5"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            <span>
              I acknowledge this is a binding lease acknowledgment for demo
              purposes and the information above is correct.
            </span>
          </label>
          <button
            type="button"
            className="btn border-0 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await signLeasePacketAction({
                  applicationId: leaseApp.id,
                  fullLegalName: legalName,
                  acknowledge: ack,
                });
                if (result.error) {
                  setMsg(result.error);
                  return;
                }
                setMsg(
                  "Lease signed. Waiting for Sales & Marketing confirmation."
                );
                router.refresh();
              });
            }}
          >
            Submit signed lease
          </button>
        </section>
      ) : null}

      {leaseApp?.leasePacketStatus === "signed" ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          Lease signed — waiting for Sales &amp; Marketing to approve and
          activate your tenancy.
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
          Messages
        </h2>
        {messages.length === 0 ? (
          <p className="text-sm opacity-60">
            No messages yet. Sales &amp; Marketing will reach you here for
            tours, availability, and next steps.
          </p>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{m.subject}</p>
                  <p className="text-xs opacity-50">
                    {new Date(m.createdAt).toLocaleString()} · {m.fromRole}
                  </p>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm opacity-80">
                  {m.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
