"use client";

import { useActionState } from "react";
import { Mail, Phone } from "lucide-react";
import type { OwnerApplication } from "@/lib/owner-auth";
import {
  createAccountFromApplication,
  declineApplicationAction,
  type StaffApplicationState,
} from "./actions";

const initialState: StaffApplicationState = {};

export function PendingApplicationCard({
  application,
}: {
  application: OwnerApplication;
}) {
  const [createState, createAction, createPending] = useActionState(
    createAccountFromApplication,
    initialState
  );
  const [declineState, declineAction, declinePending] = useActionState(
    declineApplicationAction,
    initialState
  );

  const feedback = createState.success || createState.error || declineState.success || declineState.error;
  const feedbackOk = Boolean(createState.success || declineState.success);

  return (
    <article className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            {application.fullName}
          </h2>
          <p className="text-sm opacity-65">
            {application.companyName || "No company listed"} · Submitted{" "}
            {new Date(application.createdAt).toLocaleString()}
          </p>
        </div>
        <span className="badge badge-warning">Pending</span>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <a
          href={`mailto:${application.email}`}
          className="btn btn-outline btn-sm gap-1"
        >
          <Mail className="h-4 w-4" />
          {application.email}
        </a>
        {application.phone ? (
          <a
            href={`tel:${application.phone}`}
            className="btn btn-outline btn-sm gap-1"
          >
            <Phone className="h-4 w-4" />
            {application.phone}
          </a>
        ) : null}
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Properties requested</p>
        <ul className="space-y-2">
          {application.properties.map((property, index) => (
            <li
              key={`${application.id}-${index}`}
              className="rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm"
            >
              <p className="font-medium">{property.location}</p>
              <p className="opacity-65">
                {property.category
                  ? property.category.charAt(0).toUpperCase() +
                    property.category.slice(1)
                  : "No category"}
                {property.squareFeet ? ` · ${property.squareFeet} sq ft` : ""}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {application.message ? (
        <p className="text-sm opacity-75">
          <span className="font-medium">Notes: </span>
          {application.message}
        </p>
      ) : null}

      <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/50 p-4 space-y-3">
        <p className="text-sm font-medium">Create owner account</p>
        <p className="text-xs opacity-60">
          After you reach out and approve them, set a temporary password and
          create their login.
        </p>
        <form action={createAction} className="flex flex-wrap gap-2 items-end">
          <input type="hidden" name="applicationId" value={application.id} />
          <label className="form-control">
            <span className="mb-1 text-xs opacity-70">Temporary password</span>
            <input
              name="password"
              className="input input-bordered input-sm"
              placeholder="e.g. Harborline2026"
              required
            />
          </label>
          <button
            type="submit"
            className="btn btn-neutral btn-sm"
            disabled={createPending}
          >
            {createPending ? "Creating…" : "Create account"}
          </button>
        </form>

        <form action={declineAction}>
          <input type="hidden" name="applicationId" value={application.id} />
          <button
            type="submit"
            className="btn btn-ghost btn-sm text-error"
            disabled={declinePending}
          >
            {declinePending ? "Updating…" : "Decline application"}
          </button>
        </form>
      </div>

      {feedback && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            feedbackOk
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {feedback}
        </p>
      )}
    </article>
  );
}
