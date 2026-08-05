"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Building2 } from "lucide-react";
import { OwnerAlert } from "@/components/OwnerAlert";
import { OwnerShell } from "@/components/OwnerShell";
import type { ApplicationStatusSummary } from "@/lib/owner-auth";
import {
  lookupApplicationStatus,
  signApplicationContractAction,
  type SignContractState,
  type StatusLookupState,
} from "./actions";

const initialLookup: StatusLookupState = {};
const initialSign: SignContractState = {};

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return "badge-warning";
    case "needs_info":
      return "badge-info";
    case "awaiting_signature":
      return "badge-info";
    case "approved":
      return "badge-success";
    case "declined":
      return "badge-error";
    default:
      return "badge-ghost";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pending review";
    case "needs_info":
      return "Additional info needed";
    case "awaiting_signature":
      return "Contract ready — review and sign below";
    case "approved":
      return "Approved — use your temporary password to sign in";
    case "declined":
      return "Declined";
    default:
      return status;
  }
}

function ContractAgreementBlocks({
  app,
}: {
  app: ApplicationStatusSummary;
}) {
  if (!app.contracts?.length) {
    return (
      <OwnerAlert variant="info">
        Harborline has marked this application for signature, but no agreement
        text is available yet. Contact Harborline staff if this persists.
      </OwnerAlert>
    );
  }

  return (
    <div className="space-y-4">
      {app.contracts.map((contract) => (
        <div
          key={contract.propertyId}
          className="space-y-3 rounded-xl border border-[var(--harbor-deep)]/10 bg-white/80 p-4"
        >
          <h3 className="font-semibold text-[var(--harbor-ink)]">
            {contract.propertyName}
          </h3>
          {contract.sections.map((section) => (
            <article key={section.title} className="space-y-1.5">
              <h4 className="text-sm font-semibold text-[var(--harbor-ink)]">
                {section.title}
              </h4>
              {section.paragraphs.map((p, i) => (
                <p
                  key={`${section.title}-${i}`}
                  className="text-xs leading-relaxed text-[var(--harbor-ink)]/75"
                >
                  {p}
                </p>
              ))}
            </article>
          ))}
        </div>
      ))}
    </div>
  );
}

function SignContractForm({
  email,
  applicationId,
  onSigned,
}: {
  email: string;
  applicationId: string;
  onSigned: (app: ApplicationStatusSummary) => void;
}) {
  const [state, action, pending] = useActionState(
    signApplicationContractAction,
    initialSign
  );

  useEffect(() => {
    if (state.application) {
      onSigned(state.application);
    }
  }, [state.application, onSigned]);

  return (
    <form action={action} className="space-y-3 rounded-xl border border-[var(--harbor-mid)]/20 bg-white/90 p-4">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <p className="text-sm font-medium text-[var(--harbor-ink)]">
        Sign management agreement
      </p>
      <label className="block w-full">
        <span className="owner-label">Full legal name</span>
        <input
          name="signatureName"
          className="owner-input"
          required
          minLength={2}
          placeholder="Type your name to sign"
        />
      </label>
      <label className="flex items-start gap-2 text-sm text-[var(--harbor-ink)]/80">
        <input
          type="checkbox"
          name="acknowledged"
          className="checkbox checkbox-sm mt-0.5"
          required
        />
        <span>
          I have read the agreement above and agree to the management terms for
          the listed properties.
        </span>
      </label>
      <button
        type="submit"
        className="owner-btn-primary w-full"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Signing…" : "Sign agreement"}
      </button>
      {state.error ? (
        <OwnerAlert variant="error">{state.error}</OwnerAlert>
      ) : null}
      {state.success ? (
        <OwnerAlert variant="success">{state.success}</OwnerAlert>
      ) : null}
    </form>
  );
}

function ApplicationResultCard({
  app,
  lookupEmail,
  onSigned,
}: {
  app: ApplicationStatusSummary;
  lookupEmail: string;
  onSigned: (app: ApplicationStatusSummary) => void;
}) {
  const password = app.temporaryPassword;

  return (
    <article className="space-y-3 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-[var(--harbor-ink)]">{app.fullName}</p>
        <span className={`badge ${statusBadge(app.status)}`}>
          {app.status.replace(/_/g, " ")}
        </span>
      </div>
      <p className="owner-muted text-sm">{statusLabel(app.status)}</p>
      <p className="text-xs opacity-55">
        Submitted {new Date(app.createdAt).toLocaleString()} · {app.propertyCount}{" "}
        propert
        {app.propertyCount === 1 ? "y" : "ies"}
        {app.companyName ? ` · ${app.companyName}` : ""}
      </p>
      <p className="text-xs font-mono opacity-50">ID: {app.id}</p>
      {app.reviewNotes ? (
        <OwnerAlert variant="info" title="Harborline note">
          {app.reviewNotes}
        </OwnerAlert>
      ) : null}

      {app.status === "awaiting_signature" ? (
        <div className="space-y-3">
          <ContractAgreementBlocks app={app} />
          <SignContractForm
            email={lookupEmail || app.ownerEmail || ""}
            applicationId={app.id}
            onSigned={onSigned}
          />
        </div>
      ) : null}

      {app.status === "approved" ? (
        <div className="space-y-3">
          {app.signedAt ? (
            <p className="text-xs opacity-60">
              Signed {new Date(app.signedAt).toLocaleString()}
            </p>
          ) : null}
          {password ? (
            <OwnerAlert variant="success" title="Temporary password">
              <p className="mb-2 text-sm">
                Sign in with your application email and this password. You will
                be asked to change it after login.
              </p>
              <p className="break-all rounded-lg border border-emerald-200 bg-white/90 px-3 py-2 font-mono text-sm text-[var(--harbor-ink)]">
                {password}
              </p>
              {app.ownerEmail ? (
                <p className="mt-2 text-xs opacity-70">Email: {app.ownerEmail}</p>
              ) : null}
            </OwnerAlert>
          ) : (
            <OwnerAlert variant="info">
              Your account is approved. If you already changed your temporary
              password, use that to sign in. Otherwise contact Harborline staff.
            </OwnerAlert>
          )}
          <Link
            href="/owners"
            className="owner-btn-primary owner-btn-primary-sm mt-1 inline-flex"
          >
            Go to owner login
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export default function OwnerApplicationStatusPage() {
  const [lookupState, lookupAction, lookupPending] = useActionState(
    lookupApplicationStatus,
    initialLookup
  );
  const [applications, setApplications] = useState<
    ApplicationStatusSummary[] | undefined
  >(undefined);

  useEffect(() => {
    if (lookupState.applications) {
      setApplications(lookupState.applications);
    }
  }, [lookupState.applications]);

  const handleSigned = useCallback((updated: ApplicationStatusSummary) => {
    setApplications((prev) => {
      const list = prev ?? [];
      if (list.length === 0) return [updated];
      return list.map((a) => (a.id === updated.id ? updated : a));
    });
  }, []);

  const displayed = applications ?? lookupState.applications;

  return (
    <OwnerShell variant="auth">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
        <Link
          href="/owners"
          className="owner-muted mb-8 inline-flex items-center gap-2 text-sm transition hover:text-[var(--harbor-ink)] welcome-rise"
        >
          <ArrowLeft className="h-4 w-4" />
          Owner access
        </Link>

        <div className="owner-card welcome-rise-delay space-y-5 p-7 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--harbor-ink)] p-2.5 text-[var(--harbor-sand)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-2xl leading-tight text-[var(--harbor-ink)]">
                Application status
              </p>
              <p className="owner-muted text-sm">
                Check review status, sign your contract, and view your temporary
                password — no email required
              </p>
            </div>
          </div>

          <form action={lookupAction} className="space-y-3">
            <label className="block w-full">
              <span className="owner-label">Email used on application</span>
              <input name="email" type="email" className="owner-input" required />
            </label>
            <label className="block w-full">
              <span className="owner-label">Application ID (optional)</span>
              <input
                name="applicationId"
                className="owner-input"
                placeholder="Paste if you saved it after submitting"
              />
            </label>
            <button
              type="submit"
              className="owner-btn-primary w-full"
              disabled={lookupPending}
              aria-busy={lookupPending}
            >
              {lookupPending ? "Looking up…" : "Check status"}
            </button>
          </form>

          {lookupState.error ? (
            <OwnerAlert variant="error">{lookupState.error}</OwnerAlert>
          ) : null}

          {displayed?.map((app) => (
            <ApplicationResultCard
              key={app.id}
              app={app}
              lookupEmail={lookupState.lookupEmail || app.ownerEmail || ""}
              onSigned={handleSigned}
            />
          ))}
        </div>
      </div>
    </OwnerShell>
  );
}
