"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Mail,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import {
  APPLICATION_PARTY_ROLES,
  buildInvitePath,
  createInviteToken,
  emptyParty,
  getPartyRoleMeta,
  invitationStatusLabel,
  primaryApplicantFirstName,
  upsertPartyInvite,
  type ApplicationParty,
  type ApplicationPartyRole,
  type PartyInviteRecord,
} from "@/lib/application-parties";
import { getMaximumDateOfBirth } from "@/lib/rental-application";

type Props = {
  applicationId: string;
  property: string;
  floorPlan: string;
  desiredMoveInDate: string;
  leaseTerm: string;
  primaryApplicantFullName: string;
  parties: ApplicationParty[];
  onChange: (parties: ApplicationParty[]) => void;
  disabled?: boolean;
};

function RequiredMark() {
  return (
    <span className="text-error" aria-hidden="true">
      *
    </span>
  );
}

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
      {required ? (
        <>
          {" "}
          <RequiredMark />
        </>
      ) : null}
    </span>
  );
}

export function ApplicationPartiesStep({
  applicationId,
  property,
  floorPlan,
  desiredMoveInDate,
  leaseTerm,
  primaryApplicantFullName,
  parties,
  onChange,
  disabled = false,
}: Props) {
  const [roleToAdd, setRoleToAdd] =
    useState<ApplicationPartyRole>("co-applicant");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const roleGuide = useMemo(() => APPLICATION_PARTY_ROLES, []);

  function updateParty(index: number, partial: Partial<ApplicationParty>) {
    const next = [...parties];
    next[index] = { ...next[index], ...partial };
    onChange(next);
  }

  function addParty() {
    onChange([...parties, emptyParty(roleToAdd)]);
  }

  function removeParty(id: string) {
    onChange(parties.filter((party) => party.id !== id));
  }

  function sendInvitation(index: number) {
    const party = parties[index];
    const meta = getPartyRoleMeta(party.role);
    if (!meta.invitesSupported) {
      setInviteMessage("Invitations are not available for minor occupants.");
      return;
    }
    if (!party.fullName.trim() || !party.email.trim() || !party.email.includes("@")) {
      setInviteMessage(
        "Enter a full name and valid email before sending an invitation."
      );
      return;
    }

    const token = party.inviteToken || createInviteToken();
    const now = new Date().toISOString();
    const invite: PartyInviteRecord = {
      token,
      applicationId,
      partyId: party.id,
      role: party.role,
      status: "pending",
      sharedContext: {
        property,
        floorPlan,
        desiredMoveInDate,
        leaseTerm,
        primaryApplicantFirstName: primaryApplicantFirstName(
          primaryApplicantFullName
        ),
      },
      partyBasics: {
        fullName: party.fullName.trim(),
        email: party.email.trim(),
        phone: party.phone.trim(),
        relationshipToPrimary: party.relationshipToPrimary.trim(),
      },
      // Private section stays empty until the invitee submits — primary never sees it.
      privateSection: null,
      createdAt: party.invitedAt || now,
      updatedAt: now,
    };

    upsertPartyInvite(invite);
    updateParty(index, {
      inviteToken: token,
      invitationStatus: "pending",
      invitedAt: party.invitedAt || now,
    });

    const path = buildInvitePath(token);
    const absolute =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : path;

    void navigator.clipboard?.writeText(absolute).then(
      () => {
        setCopiedToken(token);
        setInviteMessage(
          `Invitation ready for ${party.email}. Link copied — share it so they can complete their private section.`
        );
      },
      () => {
        setInviteMessage(
          `Invitation ready for ${party.email}. Share this link: ${absolute}`
        );
      }
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl">Household and parties</h2>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/60">
          You are the primary applicant. Add co-applicants, guarantors, and
          occupants below. Invitees complete their own sensitive details —
          those answers stay private to them and leasing review.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/45 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[var(--harbor-ink)] p-2 text-[var(--harbor-sand)]">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold">Primary applicant</p>
            <p className="text-sm text-[var(--harbor-ink)]/65">
              {primaryApplicantFullName.trim() || "You (complete earlier steps)"}
            </p>
            <p className="mt-1 text-xs text-[var(--harbor-ink)]/50">
              Signs the lease as the main applicant, pays the application fee,
              and manages who is added to this application.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {roleGuide.map((role) => (
          <div
            key={role.id}
            className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/50 p-4"
          >
            <p className="font-semibold">{role.label}</p>
            <p className="mt-1 text-sm text-[var(--harbor-ink)]/60">
              {role.description}
            </p>
            <ul className="mt-2 list-inside list-disc text-xs text-[var(--harbor-ink)]/55">
              {role.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs font-medium text-[var(--harbor-ink)]/70">
              {role.invitesSupported
                ? "Invitation supported — they complete their private section."
                : "No invitation — you enter permitted basic information only."}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-[var(--harbor-mid)]/25 bg-white/60 p-3 text-sm text-[var(--harbor-ink)]/70">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-mid)]" />
        <p>
          Privacy: you never see another person&apos;s income, screening
          answers, ID confirmation, or signature. You only see names, roles,
          contact basics you entered, and invitation status.
        </p>
      </div>

      {inviteMessage ? (
        <div className="rounded-2xl border border-[var(--harbor-mid)]/30 bg-white/70 px-4 py-3 text-sm">
          {inviteMessage}
        </div>
      ) : null}

      {parties.map((party, index) => {
        const meta = getPartyRoleMeta(party.role);
        return (
          <div
            key={party.id}
            className="space-y-4 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/55 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{meta.label}</p>
                <p className="text-xs text-[var(--harbor-ink)]/50">
                  {invitationStatusLabel(party.invitationStatus)}
                  {party.invitationStatus === "completed"
                    ? " · sensitive fields hidden from you"
                    : null}
                </p>
              </div>
              {!disabled ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeParty(party.id)}
                >
                  Remove
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <FieldLabel required>Role</FieldLabel>
                <select
                  className="select select-bordered w-full"
                  value={party.role}
                  disabled={disabled}
                  onChange={(event) => {
                    const role = event.target.value as ApplicationPartyRole;
                    const nextMeta = getPartyRoleMeta(role);
                    updateParty(index, {
                      role,
                      invitationStatus: nextMeta.invitesSupported
                        ? party.invitationStatus
                        : "not-sent",
                      inviteToken: nextMeta.invitesSupported
                        ? party.inviteToken
                        : "",
                      dateOfBirth:
                        role === "adult-occupant" || role === "minor-occupant"
                          ? party.dateOfBirth
                          : "",
                    });
                  }}
                >
                  {APPLICATION_PARTY_ROLES.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel required>Full name</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  value={party.fullName}
                  disabled={disabled}
                  onChange={(event) =>
                    updateParty(index, { fullName: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <FieldLabel required>Relationship to you</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  placeholder="Spouse, parent, roommate…"
                  value={party.relationshipToPrimary}
                  disabled={disabled}
                  onChange={(event) =>
                    updateParty(index, {
                      relationshipToPrimary: event.target.value,
                    })
                  }
                />
              </label>
              {meta.invitesSupported ||
              party.role === "co-applicant" ||
              party.role === "guarantor" ? (
                <>
                  <label className="block">
                    <FieldLabel
                      required={
                        party.role === "co-applicant" ||
                        party.role === "guarantor"
                      }
                    >
                      Email
                    </FieldLabel>
                    <input
                      type="email"
                      className="input input-bordered w-full"
                      value={party.email}
                      disabled={disabled}
                      onChange={(event) =>
                        updateParty(index, { email: event.target.value })
                      }
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>Phone</FieldLabel>
                    <input
                      className="input input-bordered w-full"
                      value={party.phone}
                      disabled={disabled}
                      onChange={(event) =>
                        updateParty(index, { phone: event.target.value })
                      }
                    />
                  </label>
                </>
              ) : null}
              {party.role === "adult-occupant" ||
              party.role === "minor-occupant" ? (
                <label className="block">
                  <FieldLabel required>Date of birth</FieldLabel>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={party.dateOfBirth}
                    max={
                      party.role === "adult-occupant"
                        ? getMaximumDateOfBirth()
                        : undefined
                    }
                    disabled={disabled}
                    onChange={(event) =>
                      updateParty(index, { dateOfBirth: event.target.value })
                    }
                  />
                  <span className="mt-1 block text-xs text-[var(--harbor-ink)]/55">
                    {party.role === "minor-occupant"
                      ? "Must be under the legal renting age."
                      : "Must be at least the legal renting age."}
                  </span>
                </label>
              ) : null}
            </div>

            <p className="text-xs text-[var(--harbor-ink)]/50">
              You may enter: {meta.primaryPermittedFields.join(", ")}.
              {meta.invitesSupported
                ? " All other screening and financial details are collected privately from them."
                : ""}
            </p>

            {meta.invitesSupported && !disabled ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-neutral btn-sm gap-2"
                  onClick={() => sendInvitation(index)}
                >
                  <Mail className="h-4 w-4" />
                  {party.invitationStatus === "not-sent"
                    ? "Send invitation"
                    : "Resend invitation"}
                </button>
                {party.inviteToken ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm gap-2"
                    onClick={() => {
                      const absolute = `${window.location.origin}${buildInvitePath(party.inviteToken)}`;
                      void navigator.clipboard?.writeText(absolute);
                      setCopiedToken(party.inviteToken);
                      setInviteMessage("Invitation link copied.");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    {copiedToken === party.inviteToken
                      ? "Copied"
                      : "Copy invite link"}
                  </button>
                ) : null}
                {party.invitationStatus === "completed" ? (
                  <span className="inline-flex items-center gap-1 text-sm text-[var(--harbor-mid)]">
                    <CheckCircle2 className="h-4 w-4" />
                    Their private section is complete
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}

      {!disabled ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[12rem] flex-1">
            <FieldLabel>Add person as</FieldLabel>
            <select
              className="select select-bordered w-full"
              value={roleToAdd}
              onChange={(event) =>
                setRoleToAdd(event.target.value as ApplicationPartyRole)
              }
            >
              {APPLICATION_PARTY_ROLES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-outline gap-2"
            onClick={addParty}
          >
            <UserPlus className="h-4 w-4" />
            Add person
          </button>
        </div>
      ) : null}

      {parties.length === 0 ? (
        <p className="text-sm text-[var(--harbor-ink)]/55">
          No additional parties yet. You can continue alone, or add people who
          will apply, guarantee, or occupy the home.
        </p>
      ) : null}
    </div>
  );
}
