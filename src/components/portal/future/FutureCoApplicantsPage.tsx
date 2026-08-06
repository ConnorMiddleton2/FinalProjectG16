"use client";

import { FormEvent, useEffect, useState } from "react";
import { RequireFutureApplicant } from "@/components/portal/future/RequireFutureApplicant";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalField } from "@/components/portal/PortalField";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import type { PortalTenantSession } from "@/lib/portal/auth";
import type { CoApplicant, OccupantRole, RentalApplication } from "@/lib/portal/future/models";
import { getDraft, saveDraft } from "@/lib/portal/future/services";

function CoApplicantsInner({ session }: { session: PortalTenantSession }) {
  const [app, setApp] = useState<RentalApplication | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OccupantRole>("co_applicant");
  const [relationship, setRelationship] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getDraft(session.userId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error.message);
        setStatus("error");
        return;
      }
      setApp(result.data);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [session.userId]);

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    if (!app) return;
    setSaving(true);
    const next: CoApplicant = {
      id: `co-${crypto.randomUUID().slice(0, 8)}`,
      applicationId: app.id,
      role,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || null,
      phone: null,
      relationship: relationship.trim() || "Household",
      inviteStatus: "not_sent",
    };
    const result = await saveDraft({
      ownerUserId: session.userId,
      coApplicants: [...app.coApplicants, next],
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setApp(result.data);
    setFirstName("");
    setLastName("");
    setEmail("");
    setRelationship("");
  }

  if (status === "loading") {
    return <p className="text-sm text-[var(--harbor-muted)]" role="status">Loading…</p>;
  }
  if (status === "error" || !app) {
    return <p className="portal-empty text-error" role="alert">{error ?? "Unable to load."}</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <PortalCard className="space-y-3">
        <h2 className="portal-section-title">Household members</h2>
        {app.coApplicants.length === 0 ? (
          <p className="portal-empty">No co-applicants or occupants added yet.</p>
        ) : (
          <ul className="space-y-3">
            {app.coApplicants.map((person) => (
              <li
                key={person.id}
                className="rounded-xl border border-[var(--harbor-deep)]/10 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[var(--harbor-ink)]">
                    {person.firstName} {person.lastName}
                  </p>
                  <PortalStatusBadge tone="neutral">
                    {person.role.replace("_", " ")}
                  </PortalStatusBadge>
                </div>
                <p className="text-sm text-[var(--harbor-muted)]">
                  {person.relationship}
                  {person.email ? ` · ${person.email}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </PortalCard>

      <PortalCard as="form" onSubmit={onAdd} className="space-y-3">
        <h2 className="portal-section-title">Add person</h2>
        <PortalField label="First name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <PortalField label="Last name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <PortalField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <PortalField
          label="Role"
          as="select"
          value={role}
          onChange={(e) => setRole(e.target.value as OccupantRole)}
        >
          <option value="co_applicant">Co-applicant</option>
          <option value="guarantor">Guarantor</option>
          <option value="adult_occupant">Adult occupant</option>
          <option value="minor_occupant">Minor occupant</option>
        </PortalField>
        <PortalField
          label="Relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
        />
        <button type="submit" className="portal-btn portal-btn-primary portal-focus" disabled={saving}>
          {saving ? "Saving…" : "Add to application"}
        </button>
      </PortalCard>
    </div>
  );
}

export function FutureCoApplicantsPage() {
  return (
    <RequireFutureApplicant>
      {(session) => <CoApplicantsInner session={session} />}
    </RequireFutureApplicant>
  );
}
