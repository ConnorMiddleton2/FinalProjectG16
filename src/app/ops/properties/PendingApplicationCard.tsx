"use client";

import { useActionState, useState } from "react";
import { Mail, Phone } from "lucide-react";
import type { OwnerApplication } from "@/lib/owner-auth";
import {
  createAccountFromApplication,
  declineApplicationAction,
  requestMoreInfoAction,
  type StaffApplicationState,
} from "./actions";

const initialState: StaffApplicationState = {};

export function PendingApplicationCard({
  application,
}: {
  application: OwnerApplication;
}) {
  const [reviewNotes, setReviewNotes] = useState(application.reviewNotes ?? "");
  const [createState, createAction, createPending] = useActionState(
    createAccountFromApplication,
    initialState
  );
  const [declineState, declineAction, declinePending] = useActionState(
    declineApplicationAction,
    initialState
  );
  const [infoState, infoAction, infoPending] = useActionState(
    requestMoreInfoAction,
    initialState
  );

  const feedback =
    createState.success ||
    createState.error ||
    declineState.success ||
    declineState.error ||
    infoState.success ||
    infoState.error;
  const feedbackOk = Boolean(
    createState.success || declineState.success || infoState.success
  );

  return (
    <article className="space-y-4 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 shadow-sm">
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
        <span
          className={`badge ${
            application.status === "needs_info" ? "badge-info" : "badge-warning"
          }`}
        >
          {application.status === "needs_info" ? "Needs info" : "Pending"}
        </span>
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
        <p className="mb-2 text-sm font-medium">Properties requested</p>
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

      {application.reviewedAt ? (
        <p className="text-xs opacity-55">
          Last review: {application.reviewedBy || "staff"} ·{" "}
          {new Date(application.reviewedAt).toLocaleString()}
          {application.reviewerDecision
            ? ` · ${application.reviewerDecision}`
            : ""}
        </p>
      ) : null}

      <div className="space-y-3 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/50 p-4">
        <p className="text-sm font-medium">Review decision</p>
        <p className="text-xs opacity-60">
          Approving creates a hashed login, provisions draft managed properties
          from the application, and records an audit trail. Leave password blank
          to auto-generate a one-time temporary password.
        </p>

        <label className="form-control w-full">
          <span className="mb-1 text-xs opacity-70">Review notes (audit)</span>
          <textarea
            className="textarea textarea-bordered textarea-sm"
            rows={2}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Shown on applicant status page when requesting more info"
          />
        </label>

        <form action={createAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="reviewNotes" value={reviewNotes} />
          <label className="form-control">
            <span className="mb-1 text-xs opacity-70">
              Temporary password (optional)
            </span>
            <input
              name="password"
              className="input input-bordered input-sm"
              placeholder="Auto-generate if blank"
            />
          </label>
          <button
            type="submit"
            className="btn btn-neutral btn-sm"
            disabled={createPending}
          >
            {createPending ? "Creating…" : "Approve & create account"}
          </button>
        </form>

        <form action={infoAction}>
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="reviewNotes" value={reviewNotes} />
          <button
            type="submit"
            className="btn btn-outline btn-sm"
            disabled={infoPending}
          >
            {infoPending ? "Updating…" : "Request more info"}
          </button>
        </form>

        <form action={declineAction}>
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="reviewNotes" value={reviewNotes} />
          <button
            type="submit"
            className="btn btn-ghost btn-sm text-error"
            disabled={declinePending}
          >
            {declinePending ? "Updating…" : "Decline application"}
          </button>
        </form>
      </div>

      {feedback ? (
        <div
          className={`space-y-2 rounded-lg px-3 py-2 text-sm ${
            feedbackOk
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          <p>{feedback}</p>
          {createState.temporaryPassword ? (
            <p className="break-all rounded border border-emerald-200 bg-white/80 px-2 py-1 font-mono text-xs">
              One-time temporary password: {createState.temporaryPassword}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
