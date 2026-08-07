"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  replyToSalesMarketing,
  selectUnitFromAvailability,
  signLeasePacketAction,
  submitAdditionalApplicantForms,
  submitPreLeaseIntakeAction,
} from "@/app/portal/tenant-account-actions";
import { PORTAL_APPLY_PATH } from "@/lib/portal/auth";

function downloadTextFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type AppRow = {
  id: string;
  property: string;
  building?: string;
  unitId?: string;
  unitLabel?: string;
  proposedRent?: number;
  smStatus?: string;
  status: string;
  leasePacketStatus?: string;
  unitSelectedFromAvailabilityAt?: string;
  preLeaseFormStatus?: string;
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

function isAdditionalFormsPayload(json: string) {
  try {
    const parsed = JSON.parse(json) as { type?: string };
    return parsed?.type === "additional_forms";
  } catch {
    return false;
  }
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
  const [msgTone, setMsgTone] = useState<"ok" | "error">("ok");
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [leaseError, setLeaseError] = useState<string | null>(null);
  const [legalName, setLegalName] = useState(account.fullName);
  const [ack, setAck] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [pendingUnitId, setPendingUnitId] = useState<string | null>(null);
  const [intake, setIntake] = useState({
    fullName: account.fullName,
    phone: "",
    email: account.email,
    emergencyContact: "",
    paymentMethod: "ach" as "ach" | "check" | "debit_card",
    achLast4: "",
    rentDueAck: false,
    lateFeeAck: false,
    autoPayAck: false,
  });

  function flash(message: string, tone: "ok" | "error" = "ok") {
    setMsgTone(tone);
    setMsg(message);
  }

  function validateIntakeLocally() {
    if (!intake.fullName.trim() || !intake.phone.trim() || !intake.email.trim()) {
      return "Name, phone, and email are required.";
    }
    if (!intake.rentDueAck || !intake.lateFeeAck || !intake.autoPayAck) {
      return "Check all three agreement boxes before continuing.";
    }
    if (
      (intake.paymentMethod === "ach" ||
        intake.paymentMethod === "debit_card") &&
      intake.achLast4.trim().length !== 4
    ) {
      return "Enter the last 4 digits for ACH or debit card (or pick check).";
    }
    return null;
  }
  const [followUp, setFollowUp] = useState({
    preferredMoveIn: "",
    householdSize: "",
    employmentUpdate: "",
    references: "",
    tourNotes: "",
  });

  const leaseApp = applications.find(
    (a) => a.leasePacketStatus === "sent" || a.leasePacketStatus === "signed"
  );

  const preLeaseApp = applications.find(
    (a) =>
      a.unitSelectedFromAvailabilityAt &&
      a.unitId &&
      a.preLeaseFormStatus !== "submitted" &&
      a.leasePacketStatus !== "signed" &&
      a.leasePacketStatus !== "approved"
  );

  const formsRequest = useMemo(
    () =>
      messages.find(
        (m) =>
          m.fromRole === "sales_marketing" &&
          isAdditionalFormsPayload(m.availabilityJson)
      ),
    [messages]
  );

  const latestAvailability = useMemo(() => {
    for (const m of messages) {
      if (!m.availabilityJson || isAdditionalFormsPayload(m.availabilityJson)) {
        continue;
      }
      try {
        const parsed = JSON.parse(m.availabilityJson) as AvailabilityUnit[];
        if (Array.isArray(parsed) && parsed.length) {
          return { message: m, units: parsed.slice(0, 5) };
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  }, [messages]);

  const availabilityApp = useMemo(() => {
    if (!latestAvailability) return null;
    const id =
      latestAvailability.message.relatedApplicationId || applications[0]?.id;
    return applications.find((a) => a.id === id) ?? null;
  }, [latestAvailability, applications]);

  const alreadyPickedUnitId =
    availabilityApp?.unitSelectedFromAvailabilityAt && availabilityApp.unitId
      ? availabilityApp.unitId
      : "";

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
          options, tours, and lease signing. Status:{" "}
          <span className="font-medium text-[var(--harbor-ink)]">
            {account.status.replaceAll("_", " ")}
          </span>
          {account.lookingFor ? ` · Looking for: ${account.lookingFor}` : ""}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={PORTAL_APPLY_PATH} className="btn btn-sm btn-outline">
            Start another application
          </Link>
          <Link href="/portal/start" className="btn btn-sm btn-ghost">
            Browse properties to apply
          </Link>
        </div>
      </header>

      {msg ? (
        <div
          role="status"
          className={
            msgTone === "error"
              ? "rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950"
              : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          }
        >
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

      {formsRequest ? (
        <section className="space-y-3 rounded-2xl border border-amber-300/50 bg-amber-50/80 p-5">
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            Additional information requested
          </h2>
          <p className="text-sm text-[var(--harbor-muted)]">
            {formsRequest.body}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="form-control">
              <span className="label-text text-sm">Preferred move-in</span>
              <input
                type="date"
                className="input input-bordered bg-white"
                value={followUp.preferredMoveIn}
                onChange={(e) =>
                  setFollowUp((f) => ({
                    ...f,
                    preferredMoveIn: e.target.value,
                  }))
                }
              />
            </label>
            <label className="form-control">
              <span className="label-text text-sm">Household size</span>
              <input
                className="input input-bordered bg-white"
                value={followUp.householdSize}
                onChange={(e) =>
                  setFollowUp((f) => ({
                    ...f,
                    householdSize: e.target.value,
                  }))
                }
                placeholder="e.g. 2 adults"
              />
            </label>
            <label className="form-control sm:col-span-2">
              <span className="label-text text-sm">Employment update</span>
              <textarea
                className="textarea textarea-bordered min-h-16 bg-white"
                value={followUp.employmentUpdate}
                onChange={(e) =>
                  setFollowUp((f) => ({
                    ...f,
                    employmentUpdate: e.target.value,
                  }))
                }
                placeholder="Employer, title, income verification notes"
              />
            </label>
            <label className="form-control sm:col-span-2">
              <span className="label-text text-sm">References</span>
              <textarea
                className="textarea textarea-bordered min-h-16 bg-white"
                value={followUp.references}
                onChange={(e) =>
                  setFollowUp((f) => ({ ...f, references: e.target.value }))
                }
                placeholder="Landlord or professional references"
              />
            </label>
            <label className="form-control sm:col-span-2">
              <span className="label-text text-sm">Tour / scheduling notes</span>
              <textarea
                className="textarea textarea-bordered min-h-16 bg-white"
                value={followUp.tourNotes}
                onChange={(e) =>
                  setFollowUp((f) => ({ ...f, tourNotes: e.target.value }))
                }
                placeholder="Preferred tour times, questions for S&M…"
              />
            </label>
          </div>
          <button
            type="button"
            className="btn btn-neutral btn-sm"
            disabled={pending}
            onClick={() => {
              const appId =
                formsRequest.relatedApplicationId || applications[0]?.id;
              if (!appId) {
                flash("No application to attach this form to.", "error");
                return;
              }
              startTransition(async () => {
                const result = await submitAdditionalApplicantForms({
                  applicationId: appId,
                  ...followUp,
                });
                if (result.error) {
                  flash(result.error, "error");
                  return;
                }
                flash("Follow-up form submitted to Sales & Marketing.");
                router.refresh();
              });
            }}
          >
            Submit follow-up form
          </button>
        </section>
      ) : null}

      {latestAvailability ? (
        <section className="space-y-3 rounded-2xl border border-[var(--harbor-mid)]/30 bg-[var(--harbor-sand)]/40 p-5">
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            Available units from Sales &amp; Marketing
          </h2>
          <p className="text-sm text-[var(--harbor-muted)]">
            {latestAvailability.message.body}
          </p>
          <p className="text-xs font-medium text-[var(--harbor-ink)]/70">
            {alreadyPickedUnitId
              ? "You already selected one unit from this offer."
              : `Choose exactly one of these ${latestAvailability.units.length} option${latestAvailability.units.length === 1 ? "" : "s"}, then submit.`}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {latestAvailability.units.map((u) => {
              const isSelected = alreadyPickedUnitId
                ? alreadyPickedUnitId === u.unitId
                : pendingUnitId === u.unitId;
              const locked = Boolean(alreadyPickedUnitId);
              return (
                <button
                  key={u.unitId}
                  type="button"
                  disabled={pending || locked}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-[var(--harbor-mid)] bg-[var(--harbor-mist)]/70 ring-1 ring-[var(--harbor-mid)]"
                      : locked
                        ? "border-[var(--harbor-deep)]/10 bg-white/60 opacity-55"
                        : "border-[var(--harbor-deep)]/15 bg-white hover:border-[var(--harbor-mid)]"
                  }`}
                  onClick={() => {
                    if (locked) return;
                    setPendingUnitId(u.unitId);
                  }}
                >
                  <p className="font-semibold">{u.unit}</p>
                  <p className="text-sm opacity-70">
                    {u.propertyName}
                    {u.floorPlan ? ` · ${u.floorPlan}` : ""}
                    {u.sqft ? ` · ${u.sqft} SF` : ""}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--harbor-deep)]">
                    {money(u.askingRent)}/mo
                    {isSelected ? " · Selected" : ""}
                  </p>
                </button>
              );
            })}
          </div>
          {!alreadyPickedUnitId ? (
            <button
              type="button"
              className="btn btn-neutral"
              disabled={pending || !pendingUnitId}
              onClick={() => {
                const unit = latestAvailability.units.find(
                  (u) => u.unitId === pendingUnitId
                );
                const appId =
                  latestAvailability.message.relatedApplicationId ||
                  applications[0]?.id;
                if (!unit || !appId) {
                  flash("Select a unit before submitting.", "error");
                  return;
                }
                startTransition(async () => {
                  const result = await selectUnitFromAvailability({
                    applicationId: appId,
                    unitId: unit.unitId,
                    propertyId: unit.propertyId,
                    propertyName: unit.propertyName,
                    unitLabel: unit.unit,
                    askingRent: unit.askingRent,
                  });
                  if (result.error) {
                    flash(result.error, "error");
                    return;
                  }
                  flash(
                    `Submitted ${unit.propertyName} · ${unit.unit}. Complete the information form next.`
                  );
                  router.refresh();
                });
              }}
            >
              Submit selected unit
            </button>
          ) : null}
        </section>
      ) : null}

      {preLeaseApp ? (
        <section className="space-y-4 rounded-2xl border border-[var(--harbor-deep)]/15 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
              Pre-lease information &amp; payment
            </h2>
            <p className="mt-1 text-sm text-[var(--harbor-muted)]">
              You selected{" "}
              <strong>
                {preLeaseApp.building || preLeaseApp.property}
                {preLeaseApp.unitLabel ? ` · ${preLeaseApp.unitLabel}` : ""}
              </strong>
              {preLeaseApp.proposedRent != null
                ? ` at ${money(preLeaseApp.proposedRent)}/mo`
                : ""}
              . Confirm your details, payment method, and rent agreements, then
              sign the lease.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                downloadTextFile(
                  "cpmc-rent-due-policy.txt",
                  [
                    "CPMC — Rent Due Policy",
                    "",
                    `Property: ${preLeaseApp.building || preLeaseApp.property}`,
                    `Unit: ${preLeaseApp.unitLabel || "—"}`,
                    `Monthly rent: ${preLeaseApp.proposedRent != null ? money(preLeaseApp.proposedRent) : "—"}`,
                    "",
                    "Rent is due on the 1st of each month.",
                    "A grace period applies through the 5th.",
                    "Payments after the grace period may incur late fees as stated in the lease.",
                    "",
                    "Keep this file for your records.",
                  ].join("\n")
                )
              }
            >
              Download rent due policy
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                downloadTextFile(
                  "cpmc-late-fee-policy.txt",
                  [
                    "CPMC — Late Fee & Collections Summary",
                    "",
                    "Late fees may apply after the grace period ends.",
                    "Repeated delinquency may result in notices and collections review.",
                    "Contact Sales & Marketing or Collections if you need a payment plan.",
                    "",
                    "This summary is for applicant records; the signed lease controls.",
                  ].join("\n")
                )
              }
            >
              Download late fee summary
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() =>
                downloadTextFile(
                  "cpmc-payment-authorization.txt",
                  [
                    "CPMC — Payment Authorization Acknowledgment",
                    "",
                    "By selecting a payment method you authorize CPMC to apply that method to rent and approved charges for the selected unit.",
                    "ACH autopay, if enrolled, drafts on or after the rent due date.",
                    "You may update payment preferences later through the tenant portal once activated.",
                    "",
                    "Download and keep for your records before signing the lease.",
                  ].join("\n")
                )
              }
            >
              Download payment authorization
            </button>
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--harbor-text)]">
                Full legal name
              </span>
              <input
                className="input input-bordered w-full bg-white"
                value={intake.fullName}
                onChange={(e) =>
                  setIntake((f) => ({ ...f, fullName: e.target.value }))
                }
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--harbor-text)]">
                Phone
              </span>
              <input
                className="input input-bordered w-full bg-white"
                value={intake.phone}
                onChange={(e) =>
                  setIntake((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--harbor-text)]">
                Email
              </span>
              <input
                type="email"
                className="input input-bordered w-full bg-white"
                value={intake.email}
                onChange={(e) =>
                  setIntake((f) => ({ ...f, email: e.target.value }))
                }
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--harbor-text)]">
                Emergency contact
              </span>
              <input
                className="input input-bordered w-full bg-white"
                value={intake.emergencyContact}
                onChange={(e) =>
                  setIntake((f) => ({
                    ...f,
                    emergencyContact: e.target.value,
                  }))
                }
                placeholder="Name and phone"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--harbor-text)]">
                Payment method
              </span>
              <select
                className="select select-bordered w-full bg-white"
                value={intake.paymentMethod}
                onChange={(e) =>
                  setIntake((f) => ({
                    ...f,
                    paymentMethod: e.target.value as typeof f.paymentMethod,
                  }))
                }
              >
                <option value="ach">ACH</option>
                <option value="check">Check</option>
                <option value="debit_card">Debit card</option>
              </select>
            </label>
            {intake.paymentMethod === "ach" ||
            intake.paymentMethod === "debit_card" ? (
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-medium text-[var(--harbor-text)]">
                  {intake.paymentMethod === "ach"
                    ? "ACH account last 4"
                    : "Debit card last 4"}
                </span>
                <input
                  className="input input-bordered w-full bg-white"
                  value={intake.achLast4}
                  maxLength={4}
                  onChange={(e) =>
                    setIntake((f) => ({
                      ...f,
                      achLast4: e.target.value.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                  placeholder="1234"
                />
              </label>
            ) : null}
          </div>

          <div className="space-y-2 text-sm">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm mt-0.5"
                checked={intake.rentDueAck}
                onChange={(e) =>
                  setIntake((f) => ({ ...f, rentDueAck: e.target.checked }))
                }
              />
              <span>
                I understand rent is due on the 1st of each month (grace through
                the 5th). I can download the rent due policy above.
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm mt-0.5"
                checked={intake.lateFeeAck}
                onChange={(e) =>
                  setIntake((f) => ({ ...f, lateFeeAck: e.target.checked }))
                }
              />
              <span>
                I acknowledge late fees and collections policies may apply after
                the grace period.
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-sm mt-0.5"
                checked={intake.autoPayAck}
                onChange={(e) =>
                  setIntake((f) => ({ ...f, autoPayAck: e.target.checked }))
                }
              />
              <span>
                I authorize the selected payment method for rent and approved
                charges on this unit.
              </span>
            </label>
          </div>

          {intakeError ? (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950"
            >
              {intakeError}
            </p>
          ) : (
            <p className="text-xs text-[var(--harbor-muted)]">
              Required: phone, all three checkboxes
              {intake.paymentMethod === "ach" ||
              intake.paymentMethod === "debit_card"
                ? ", and last 4 digits"
                : ""}
              . After submit, the lease signing section appears below.
            </p>
          )}

          <button
            type="button"
            className="btn btn-neutral"
            disabled={pending}
            onClick={() => {
              const localError = validateIntakeLocally();
              if (localError) {
                setIntakeError(localError);
                flash(localError, "error");
                return;
              }
              setIntakeError(null);
              startTransition(async () => {
                const result = await submitPreLeaseIntakeAction({
                  applicationId: preLeaseApp.id,
                  ...intake,
                });
                if (result.error) {
                  setIntakeError(result.error);
                  flash(result.error, "error");
                  return;
                }
                setLegalName(intake.fullName);
                flash(
                  "Information submitted. Sign the lease agreement below — it will go to Sales & Marketing for approval."
                );
                router.refresh();
                // Scroll to lease block after refresh paints
                requestAnimationFrame(() => {
                  document
                    .getElementById("lease-sign-section")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
              });
            }}
          >
            {pending
              ? "Submitting…"
              : "Submit information & continue to lease"}
          </button>
        </section>
      ) : null}

      {leaseApp &&
      leaseApp.leasePacketStatus === "sent" &&
      leaseApp.preLeaseFormStatus === "submitted" ? (
        <section
          id="lease-sign-section"
          className="space-y-3 rounded-2xl border border-[var(--harbor-ink)]/15 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold">Sign lease agreement</h2>
          <p className="text-sm text-[var(--harbor-muted)]">
            Review and sign for{" "}
            {leaseApp.building || leaseApp.property}
            {leaseApp.unitLabel ? ` · ${leaseApp.unitLabel}` : ""}
            {leaseApp.proposedRent != null
              ? ` at ${money(leaseApp.proposedRent)}/mo`
              : ""}
            . After you sign, Sales &amp; Marketing receives a pending lease
            for approval. Final move-in happens when they approve.
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() =>
              downloadTextFile(
                "cpmc-lease-draft.txt",
                [
                  "CPMC — Lease Agreement Draft (for your records)",
                  "",
                  `Applicant: ${legalName || account.fullName}`,
                  `Property: ${leaseApp.building || leaseApp.property}`,
                  `Unit: ${leaseApp.unitLabel || "—"}`,
                  `Monthly rent: ${leaseApp.proposedRent != null ? money(leaseApp.proposedRent) : "—"}`,
                  "Rent due: 1st of each month (grace through the 5th).",
                  "",
                  "This download is a summary for your records. Your electronic signature below submits the lease for Sales & Marketing approval.",
                ].join("\n")
              )
            }
          >
            Download lease summary
          </button>
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
              I sign this lease agreement electronically and confirm the unit,
              rent, and payment information above are correct.
            </span>
          </label>
          {leaseError ? (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950"
            >
              {leaseError}
            </p>
          ) : null}
          <button
            type="button"
            className="btn border-0 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
            disabled={pending}
            onClick={() => {
              if (!ack || !legalName.trim()) {
                const err =
                  "Enter your full legal name and check the acknowledgment box.";
                setLeaseError(err);
                flash(err, "error");
                return;
              }
              setLeaseError(null);
              startTransition(async () => {
                const result = await signLeasePacketAction({
                  applicationId: leaseApp.id,
                  fullLegalName: legalName,
                  acknowledge: ack,
                });
                if (result.error) {
                  setLeaseError(result.error);
                  flash(result.error, "error");
                  return;
                }
                flash(
                  "Lease signed and sent to Sales & Marketing for pending approval."
                );
                router.refresh();
              });
            }}
          >
            {pending
              ? "Signing…"
              : "Sign lease & send to Sales & Marketing"}
          </button>
        </section>
      ) : null}

      {leaseApp?.leasePacketStatus === "signed" ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          Lease signed — pending Sales &amp; Marketing approval. When they
          approve, your application is completed and you become a current
          tenant.
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

        <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-4">
          <p className="text-sm font-medium">Message Sales &amp; Marketing</p>
          <textarea
            className="textarea textarea-bordered mt-2 min-h-20 w-full bg-white"
            placeholder="Ask about tours, availability, or confirm details…"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-outline btn-sm mt-2"
            disabled={pending || !replyBody.trim()}
            onClick={() => {
              startTransition(async () => {
                const result = await replyToSalesMarketing({
                  applicationId: applications[0]?.id,
                  subject: "Applicant message",
                  body: replyBody,
                });
                if (result.error) {
                  flash(result.error, "error");
                  return;
                }
                setReplyBody("");
                flash("Message sent to Sales & Marketing.");
                router.refresh();
              });
            }}
          >
            Send message
          </button>
        </div>
      </section>
    </div>
  );
}
