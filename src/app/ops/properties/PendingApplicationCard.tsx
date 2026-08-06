"use client";

import { useActionState, useState } from "react";
import { Mail, Phone } from "lucide-react";
import type { OwnerApplication } from "@/lib/owner-auth";
import {
  declineApplicationAction,
  requestMoreInfoAction,
  sendContractForSignatureAction,
  type StaffApplicationState,
} from "./actions";
import { OwnerApplicationPropertySummary } from "@/components/OwnerApplicationPropertySummary";

const initialState: StaffApplicationState = {};

export function PendingApplicationCard({
  application,
}: {
  application: OwnerApplication;
}) {
  const [reviewNotes, setReviewNotes] = useState(application.reviewNotes ?? "");
  const [sendState, sendAction, sendPending] = useActionState(
    sendContractForSignatureAction,
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
    sendState.success ||
    sendState.error ||
    declineState.success ||
    declineState.error ||
    infoState.success ||
    infoState.error;
  const feedbackOk = Boolean(
    sendState.success || declineState.success || infoState.success
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
            <li key={`${application.id}-${index}`}>
              <OwnerApplicationPropertySummary property={property} />
            </li>
          ))}
        </ul>
      </div>

      {(application.entityType ||
        application.mailingAddress ||
        application.communicationPreference) && (
        <div className="rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-55">
            Ownership / engagement
          </p>
          <p className="opacity-80">
            {[
              application.entityType,
              application.mailingAddress,
              application.preferredContactMethod
                ? `Contact: ${application.preferredContactMethod}`
                : null,
              application.communicationPreference
                ? `Comm: ${application.communicationPreference.replaceAll("_", " ")}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-1 text-xs opacity-65">
            Docs ready:{" "}
            {[
              application.ownershipProofAvailable ? "deed" : null,
              application.rentRollAvailable ? "rent roll" : null,
              application.leasesAvailable ? "leases" : null,
              application.insuranceDocsAvailable ? "insurance" : null,
              application.bankingReady ? "banking" : null,
            ]
              .filter(Boolean)
              .join(", ") || "none marked"}
          </p>
        </div>
      )}

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
          Sending provisions draft management agreements and moves the
          application to awaiting signature. The owner views and signs on Check
          Application Status, then receives a temporary password there — no
          email required.
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

        <form action={sendAction} className="space-y-3">
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="reviewNotes" value={reviewNotes} />

          <p className="text-xs font-medium opacity-70">
            Optional contract terms (applied to each property)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="form-control">
              <span className="mb-1 text-xs opacity-70">Start date</span>
              <input
                name="contractStartDate"
                type="date"
                className="input input-bordered input-sm"
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-xs opacity-70">End date</span>
              <input
                name="contractEndDate"
                type="date"
                className="input input-bordered input-sm"
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-xs opacity-70">Fee structure</span>
              <select
                name="feeStructure"
                className="select select-bordered select-sm"
                defaultValue="percent_collections"
              >
                <option value="percent_collections">% of collections</option>
                <option value="percent_gpr">% of GPR</option>
                <option value="flat_monthly">Flat monthly</option>
                <option value="flat_annual">Flat annual</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>
            <label className="form-control">
              <span className="mb-1 text-xs opacity-70">Fee %</span>
              <input
                name="feePercent"
                className="input input-bordered input-sm"
                placeholder="4"
                defaultValue="4"
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-xs opacity-70">Flat fee amount</span>
              <input
                name="feeFlatAmount"
                className="input input-bordered input-sm"
                placeholder="If flat fee"
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-xs opacity-70">
                Owner approval threshold ($)
              </span>
              <input
                name="ownerApprovalThreshold"
                className="input input-bordered input-sm"
                defaultValue="2500"
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-xs opacity-70">
                Termination notice (days)
              </span>
              <input
                name="terminationNoticeDays"
                className="input input-bordered input-sm"
                defaultValue="30"
              />
            </label>
            <label className="form-control">
              <span className="mb-1 text-xs opacity-70">Assigned manager</span>
              <input
                name="assignedManager"
                className="input input-bordered input-sm"
                placeholder="Staff name"
              />
            </label>
            <label className="form-control sm:col-span-2">
              <span className="mb-1 text-xs opacity-70">Renewal options</span>
              <input
                name="renewalOptions"
                className="input input-bordered input-sm"
                placeholder="e.g. One 2-year renewal"
              />
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-neutral btn-sm"
            disabled={sendPending}
          >
            {sendPending ? "Sending…" : "Send contract for owner signature"}
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
        </div>
      ) : null}
    </article>
  );
}

export function AwaitingSignatureCard({
  application,
}: {
  application: OwnerApplication;
}) {
  return (
    <article className="space-y-3 rounded-2xl border border-[var(--harbor-mid)]/25 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--harbor-ink)]">
            {application.fullName}
          </h2>
          <p className="text-sm opacity-65">
            {application.companyName || "No company listed"} · {application.email}
          </p>
        </div>
        <span className="badge badge-info">Awaiting signature</span>
      </div>
      <p className="text-sm text-[var(--harbor-ink)]/70">
        Contract sent for owner review. The applicant signs on{" "}
        <span className="font-medium">Check Application Status</span>; login
        credentials are issued there after they sign.
      </p>
      <p className="text-xs opacity-55">
        Sent {application.reviewedAt
          ? new Date(application.reviewedAt).toLocaleString()
          : "—"}
        {application.contractPropertyIds?.length
          ? ` · ${application.contractPropertyIds.length} agreement${application.contractPropertyIds.length === 1 ? "" : "s"}`
          : ""}
        {" · "}
        App ID: <span className="font-mono">{application.id}</span>
      </p>
      {application.loginRevealPassword ? (
        <p className="break-all rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-xs text-emerald-900">
          Status-page temporary password (until owner changes it):{" "}
          {application.loginRevealPassword}
        </p>
      ) : null}
    </article>
  );
}
