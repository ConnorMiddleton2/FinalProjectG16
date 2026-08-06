"use client";

import { FormEvent, useEffect, useState } from "react";
import { RequireFutureApplicant } from "@/components/portal/future/RequireFutureApplicant";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalField } from "@/components/portal/PortalField";
import type { PortalTenantSession } from "@/lib/portal/auth";
import {
  FUTURE_APPLY,
  FUTURE_SAVED,
  FUTURE_STATUS,
  FUTURE_TOURS,
} from "@/lib/portal/future/paths";
import Link from "next/link";

const PROFILE_STORAGE_KEY = "harborline.portal.futureApplicantProfile.v1";

type ProfileDraft = {
  preferredName: string;
  phone: string;
  preferredContact: string;
  desiredMoveIn: string;
  notes: string;
};

function loadLocal(userId: string): ProfileDraft {
  try {
    if (typeof window === "undefined") {
      return {
        preferredName: "",
        phone: "",
        preferredContact: "email",
        desiredMoveIn: "",
        notes: "",
      };
    }
    const raw = window.sessionStorage.getItem(`${PROFILE_STORAGE_KEY}:${userId}`);
    if (!raw) {
      return {
        preferredName: "",
        phone: "",
        preferredContact: "email",
        desiredMoveIn: "",
        notes: "",
      };
    }
    return JSON.parse(raw) as ProfileDraft;
  } catch {
    return {
      preferredName: "",
      phone: "",
      preferredContact: "email",
      desiredMoveIn: "",
      notes: "",
    };
  }
}

function emptyProfile(): ProfileDraft {
  return {
    preferredName: "",
    phone: "",
    preferredContact: "email",
    desiredMoveIn: "",
    notes: "",
  };
}

function ProfileInner({ session }: { session: PortalTenantSession }) {
  const [draft, setDraft] = useState<ProfileDraft>(emptyProfile);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(loadLocal(session.userId));
  }, [session.userId]);

  function onSave(event: FormEvent) {
    event.preventDefault();
    window.sessionStorage.setItem(
      `${PROFILE_STORAGE_KEY}:${session.userId}`,
      JSON.stringify(draft)
    );
    setMessage("Profile preferences saved on this device.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <PortalCard as="form" onSubmit={onSave} className="space-y-3">
        <h2 className="portal-section-title">Applicant profile</h2>
        <p className="text-sm text-[var(--harbor-muted)]">
          Signed in as {session.email}
        </p>
        <PortalField
          label="Display name"
          value={session.displayName}
          readOnly
        />
        <PortalField
          label="Preferred name"
          value={draft.preferredName}
          onChange={(e) => setDraft({ ...draft, preferredName: e.target.value })}
        />
        <PortalField
          label="Phone"
          type="tel"
          value={draft.phone}
          onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
        />
        <PortalField
          label="Preferred contact"
          as="select"
          value={draft.preferredContact}
          onChange={(e) =>
            setDraft({ ...draft, preferredContact: e.target.value })
          }
        >
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="text">Text</option>
          <option value="portal-message">Portal message</option>
        </PortalField>
        <PortalField
          label="Desired move-in date"
          type="date"
          value={draft.desiredMoveIn}
          onChange={(e) => setDraft({ ...draft, desiredMoveIn: e.target.value })}
        />
        <PortalField
          label="Leasing notes"
          as="textarea"
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
        {message ? (
          <p className="text-sm text-[var(--harbor-mid)]" role="status">
            {message}
          </p>
        ) : null}
        <button type="submit" className="portal-btn portal-btn-primary portal-focus">
          Save preferences
        </button>
      </PortalCard>

      <PortalCard className="space-y-3 self-start">
        <h2 className="portal-section-title">Related activity</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href={FUTURE_APPLY} className="font-semibold text-[var(--harbor-mid)] underline-offset-2 hover:underline">
              Continue application
            </Link>
          </li>
          <li>
            <Link href={FUTURE_STATUS} className="font-semibold text-[var(--harbor-mid)] underline-offset-2 hover:underline">
              Application status
            </Link>
          </li>
          <li>
            <Link href={FUTURE_TOURS} className="font-semibold text-[var(--harbor-mid)] underline-offset-2 hover:underline">
              Tours
            </Link>
          </li>
          <li>
            <Link href={FUTURE_SAVED} className="font-semibold text-[var(--harbor-mid)] underline-offset-2 hover:underline">
              Saved units
            </Link>
          </li>
        </ul>
      </PortalCard>
    </div>
  );
}

export function FutureProfilePage() {
  return (
    <RequireFutureApplicant>
      {(session) => <ProfileInner session={session} />}
    </RequireFutureApplicant>
  );
}
