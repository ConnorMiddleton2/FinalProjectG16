"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, Building2 } from "lucide-react";
import { OwnerAlert } from "@/components/OwnerAlert";
import { OwnerShell } from "@/components/OwnerShell";
import {
  lookupApplicationStatus,
  type StatusLookupState,
} from "./actions";

const initial: StatusLookupState = {};

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return "badge-warning";
    case "needs_info":
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
    case "approved":
      return "Approved — check your email / Harborline for login";
    case "declined":
      return "Declined";
    default:
      return status;
  }
}

export default function OwnerApplicationStatusPage() {
  const [state, action, pending] = useActionState(
    lookupApplicationStatus,
    initial
  );

  return (
    <OwnerShell variant="auth">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
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
                Look up your Harborline owner access request
              </p>
            </div>
          </div>

          <form action={action} className="space-y-3">
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
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Looking up…" : "Check status"}
            </button>
          </form>

          {state.error ? (
            <OwnerAlert variant="error">{state.error}</OwnerAlert>
          ) : null}

          {state.applications?.map((app) => (
            <Link
              key={app.id}
              href={`/owners/status/${app.id}?email=${encodeURIComponent(state.email || "")}`}
              className="owner-card-interactive block space-y-2 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 p-4 transition hover:border-[var(--harbor-mid)]/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-[var(--harbor-ink)]">
                  {app.fullName}
                </p>
                <span className={`badge ${statusBadge(app.status)}`}>
                  {app.status.replace("_", " ")}
                </span>
              </div>
              <p className="owner-muted text-sm">{statusLabel(app.status)}</p>
              <p className="text-xs opacity-55">
                Submitted {new Date(app.createdAt).toLocaleString()} ·{" "}
                {app.propertyCount} propert
                {app.propertyCount === 1 ? "y" : "ies"}
                {app.companyName ? ` · ${app.companyName}` : ""}
              </p>
              {app.contractSent ? (
                <p className="text-xs font-medium text-[var(--harbor-mid)]">
                  Contract available — open to review &amp; sign
                </p>
              ) : (
                <p className="text-xs font-medium text-[var(--harbor-ink)]/70">
                  Click to view the details you submitted
                </p>
              )}
              {app.reviewNotes ? (
                <OwnerAlert variant="info" title="Harborline note">
                  {app.reviewNotes}
                </OwnerAlert>
              ) : null}
              {app.status === "approved" ? (
                <span className="owner-btn-primary owner-btn-primary-sm mt-1 inline-flex">
                  Approved — open for login link
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </div>
    </OwnerShell>
  );
}
