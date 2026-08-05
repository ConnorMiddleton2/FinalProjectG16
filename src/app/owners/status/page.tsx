"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, Building2 } from "lucide-react";
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
    <main className="min-h-screen bg-[linear-gradient(165deg,#f3efe6_0%,#d7eef2_55%,#e8f4f6_100%)]">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <Link
          href="/owners"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Owner access
        </Link>

        <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-7 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--harbor-ink)] p-2 text-[var(--harbor-sand)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-2xl leading-tight text-[var(--harbor-ink)]">
                Application status
              </p>
              <p className="text-sm opacity-60">
                Look up your Harborline owner access request
              </p>
            </div>
          </div>

          <form action={action} className="space-y-3">
            <label className="form-control">
              <span className="mb-1 text-xs opacity-70">Email used on application</span>
              <input
                name="email"
                type="email"
                className="input input-bordered"
                required
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-xs opacity-70">
                Application ID (optional)
              </span>
              <input
                name="applicationId"
                className="input input-bordered"
                placeholder="Paste if you saved it after submitting"
              />
            </label>
            <button
              type="submit"
              className="btn btn-neutral w-full"
              disabled={pending}
            >
              {pending ? "Looking up…" : "Check status"}
            </button>
          </form>

          {state.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          {state.applications?.map((app) => (
            <article
              key={app.id}
              className="rounded-xl border border-base-300 bg-base-100 p-4 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{app.fullName}</p>
                <span className={`badge ${statusBadge(app.status)}`}>
                  {app.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm opacity-70">{statusLabel(app.status)}</p>
              <p className="text-xs opacity-55">
                Submitted {new Date(app.createdAt).toLocaleString()} ·{" "}
                {app.propertyCount} propert
                {app.propertyCount === 1 ? "y" : "ies"}
                {app.companyName ? ` · ${app.companyName}` : ""}
              </p>
              <p className="text-xs font-mono opacity-50">ID: {app.id}</p>
              {app.reviewNotes ? (
                <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
                  <span className="font-medium">Harborline note: </span>
                  {app.reviewNotes}
                </p>
              ) : null}
              {app.status === "approved" ? (
                <Link href="/owners" className="btn btn-sm btn-neutral mt-1">
                  Go to owner login
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
