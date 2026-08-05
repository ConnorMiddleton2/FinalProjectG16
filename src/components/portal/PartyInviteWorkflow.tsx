"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Shield } from "lucide-react";
import {
  emptyPrivateSection,
  getPartyRoleMeta,
  readPartyInvite,
  upsertPartyInvite,
  validatePrivateSection,
  type PartyInviteRecord,
  type PartyPrivateSection,
} from "@/lib/application-parties";
import {
  getMaximumDateOfBirth,
  MINIMUM_RENTAL_AGE,
  readRentalApplicationDraft,
  writeRentalApplicationDraft,
} from "@/lib/rental-application";

type Props = {
  token: string;
};

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
      {children}
      {required ? <span className="text-error"> *</span> : null}
    </span>
  );
}

/**
 * Invitee-only workflow. Loads the invite record and never exposes the primary
 * applicant's sensitive draft fields (income, documents, full contact, etc.).
 */
export function PartyInviteWorkflow({ token }: Props) {
  const [invite, setInvite] = useState<PartyInviteRecord | null>(null);
  const [section, setSection] = useState<PartyPrivateSection>(
    emptyPrivateSection()
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      const found = readPartyInvite(token);
      setInvite(found);
      if (found?.privateSection) {
        setSection(found.privateSection);
        setDone(found.status === "completed");
      } else if (found) {
        setSection(emptyPrivateSection(found.partyBasics));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load this invitation."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  function patch(partial: Partial<PartyPrivateSection>) {
    setSection((current) => ({ ...current, ...partial }));
    setError(null);
  }

  function syncPrimaryDraftStatus(record: PartyInviteRecord) {
    const draft = readRentalApplicationDraft();
    if (!draft || draft.id !== record.applicationId) return;
    writeRentalApplicationDraft({
      ...draft,
      parties: draft.parties.map((party) =>
        party.id === record.partyId
          ? {
              ...party,
              invitationStatus: "completed",
              completedAt: record.privateSection?.completedAt ?? "",
              // Contact basics may be refined by invitee; still non-sensitive.
              email: record.partyBasics.email || party.email,
              phone: record.partyBasics.phone || party.phone,
              fullName: record.partyBasics.fullName || party.fullName,
            }
          : party
      ),
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!invite) return;
    const message = validatePrivateSection(invite.role, section);
    if (message) {
      setError(message);
      return;
    }

    const completedAt = new Date().toISOString();
    const privateSection: PartyPrivateSection = {
      ...section,
      completedAt,
    };
    const updated: PartyInviteRecord = {
      ...invite,
      status: "completed",
      partyBasics: {
        ...invite.partyBasics,
        fullName: invite.partyBasics.fullName || section.signatureName,
        email: section.email,
        phone: section.phone,
      },
      privateSection,
      updatedAt: completedAt,
    };
    upsertPartyInvite(updated);
    syncPrimaryDraftStatus(updated);
    setInvite(updated);
    setDone(true);
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading invitation">
        <div className="skeleton h-28 w-full rounded-3xl" />
        <div className="skeleton h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-error" />
        <h1 className="mt-4 font-display text-3xl">Invitation not found</h1>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
          This link is invalid or expired. Ask the primary applicant to resend
          an invitation from their application.
        </p>
        <Link href="/portal" className="btn btn-neutral mt-6">
          Back to portal
        </Link>
      </div>
    );
  }

  const meta = getPartyRoleMeta(invite.role);
  const ctx = invite.sharedContext;

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--harbor-mid)]" />
        <h1 className="mt-4 font-display text-3xl">Section submitted</h1>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/65">
          Thank you. Your {meta.label.toLowerCase()} information was saved
          privately. The primary applicant can see that you finished, but not
          your sensitive answers.
        </p>
        <Link href="/portal" className="btn btn-neutral mt-6">
          Back to portal
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
          Harborline application invitation
        </p>
        <h1 className="mt-2 font-display text-4xl">{meta.label} section</h1>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/65">
          {ctx.primaryApplicantFirstName} invited you to complete your part of
          a Harborline rental application. Only information needed for your role
          is shown here.
        </p>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["Property", ctx.property || "—"],
            ["Floor plan", ctx.floorPlan || "—"],
            ["Desired move-in", ctx.desiredMoveInDate || "—"],
            ["Lease term", ctx.leaseTerm || "—"],
            ["Your role", meta.label],
            ["Relationship", invite.partyBasics.relationshipToPrimary || "—"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl bg-[var(--harbor-sand)]/55 p-3"
            >
              <dt className="text-[10px] uppercase tracking-wide opacity-50">
                {label}
              </dt>
              <dd className="mt-1 text-sm font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[var(--harbor-mid)]/25 bg-[var(--harbor-sand)]/40 p-3 text-sm text-[var(--harbor-ink)]/70">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
          <p>
            Your income, screening authorization, and identity confirmation stay
            private. The primary applicant will not see those answers in their
            application view.
          </p>
        </div>

        <ul className="mt-4 list-inside list-disc text-sm text-[var(--harbor-ink)]/60">
          {meta.responsibilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/70 p-6 sm:p-8"
      >
        <h2 className="font-display text-2xl">Your information</h2>
        <p className="text-sm text-[var(--harbor-ink)]/55">
          Full SSN, bank numbers, and unmasked ID numbers are never collected
          here.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <FieldLabel>Name on file</FieldLabel>
            <input
              className="input input-bordered w-full"
              value={invite.partyBasics.fullName}
              readOnly
            />
          </label>
          <label className="block">
            <FieldLabel required>Date of birth</FieldLabel>
            <input
              type="date"
              className="input input-bordered w-full"
              value={section.dateOfBirth}
              max={getMaximumDateOfBirth()}
              onChange={(event) => patch({ dateOfBirth: event.target.value })}
            />
            <span className="mt-1 block text-xs opacity-55">
              Must be at least {MINIMUM_RENTAL_AGE} years old to rent.
            </span>
          </label>
          <label className="block">
            <FieldLabel required>Government ID type</FieldLabel>
            <select
              className="select select-bordered w-full"
              value={section.governmentIdType}
              onChange={(event) =>
                patch({ governmentIdType: event.target.value })
              }
            >
              <option value="">Select</option>
              <option value="Drivers license">Driver&apos;s license</option>
              <option value="State ID">State ID</option>
              <option value="Passport">Passport</option>
              <option value="Military ID">Military ID</option>
            </select>
          </label>
          <label className="flex items-center gap-3 sm:col-span-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={section.governmentIdProvidedOffline}
              onChange={(event) =>
                patch({ governmentIdProvidedOffline: event.target.checked })
              }
            />
            I will provide photo ID for screening (number not entered here)
          </label>
          <label className="block">
            <FieldLabel required>Email</FieldLabel>
            <input
              type="email"
              className="input input-bordered w-full"
              value={section.email}
              onChange={(event) => patch({ email: event.target.value })}
            />
          </label>
          <label className="block">
            <FieldLabel required>Phone</FieldLabel>
            <input
              className="input input-bordered w-full"
              value={section.phone}
              onChange={(event) => patch({ phone: event.target.value })}
            />
          </label>
          <label className="block">
            <FieldLabel required>Employment status</FieldLabel>
            <select
              className="select select-bordered w-full"
              value={section.employmentStatus}
              onChange={(event) =>
                patch({ employmentStatus: event.target.value })
              }
            >
              <option value="">Select</option>
              <option value="Employed">Employed</option>
              <option value="Self-employed">Self-employed</option>
              <option value="Student">Student</option>
              <option value="Retired">Retired</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label className="block">
            <FieldLabel required>Monthly income</FieldLabel>
            <input
              className="input input-bordered w-full"
              value={section.monthlyIncome}
              onChange={(event) => patch({ monthlyIncome: event.target.value })}
            />
          </label>
          {section.employmentStatus === "Employed" ? (
            <>
              <label className="block">
                <FieldLabel required>Employer</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  value={section.employerName}
                  onChange={(event) =>
                    patch({ employerName: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <FieldLabel>Job title</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  value={section.jobTitle}
                  onChange={(event) => patch({ jobTitle: event.target.value })}
                />
              </label>
            </>
          ) : null}
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm mt-0.5"
            checked={section.authorizeScreening}
            onChange={(event) =>
              patch({ authorizeScreening: event.target.checked })
            }
          />
          <span>
            I authorize screening related to my role as {meta.label.toLowerCase()}
            .
          </span>
        </label>

        {invite.role === "guarantor" ? (
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm mt-0.5"
              checked={section.guaranteeAcknowledgment}
              onChange={(event) =>
                patch({ guaranteeAcknowledgment: event.target.checked })
              }
            />
            <span>
              I understand I may be financially responsible for lease
              obligations as guarantor.
            </span>
          </label>
        ) : null}

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm mt-0.5"
            checked={section.certifyAccuracy}
            onChange={(event) =>
              patch({ certifyAccuracy: event.target.checked })
            }
          />
          <span>I certify the information I provided is true and complete.</span>
        </label>

        <label className="block max-w-md">
          <FieldLabel required>Type your full name to sign</FieldLabel>
          <input
            className="input input-bordered w-full"
            value={section.signatureName}
            onChange={(event) => patch({ signatureName: event.target.value })}
          />
        </label>

        {error ? (
          <div className="flex items-start gap-2 rounded-2xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <button type="submit" className="btn btn-neutral">
          Submit my section
        </button>
      </form>
    </div>
  );
}
