"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  prospectStartApplication,
  type ProspectApplyState,
} from "@/app/portal/prospect-actions";
import { ageFromDob } from "@/lib/tenant-age";

const initial: ProspectApplyState = {};

export function ProspectApplyForm() {
  const search = useSearchParams();
  const propertyIdParam = search.get("property") || "";
  const propertyNameParam = search.get("name") || "";
  const { items: properties } = useSharedCollection<ManagementContractDraft>(
    COLLECTIONS.managedProperties
  );
  const [state, action, pending] = useActionState(
    prospectStartApplication,
    initial
  );
  const [dob, setDob] = useState("");
  const age = useMemo(() => ageFromDob(dob), [dob]);
  const under21 = age != null && age < 21;
  const over21 = age != null && age >= 21;

  const defaultProperty =
    propertyNameParam ||
    properties.find((p) => p.id === propertyIdParam)?.propertyName ||
    "";

  return (
    <main className="min-h-screen bg-[linear-gradient(165deg,#f7f3ea_0%,#dceef1_55%,#e8f4f6_100%)]">
      <div className="mx-auto max-w-xl px-6 py-10">
        <Link
          href="/portal/start"
          className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to properties
        </Link>

        <h1 className="mt-6 font-display text-4xl text-[var(--harbor-ink)]">
          Start an application
        </h1>
        <p className="mt-2 text-sm text-[var(--harbor-ink)]/70">
          Create your Harborline tenant account and send an inquiry to Sales
          &amp; Marketing. You can sign in anytime to track status and messages.
        </p>

        <form action={action} className="mt-8 space-y-4 rounded-2xl border border-[var(--harbor-deep)]/12 bg-white/90 p-6 shadow-sm">
          <input type="hidden" name="propertyId" value={propertyIdParam} />
          <label className="form-control">
            <span className="label-text mb-1">Full name</span>
            <input name="fullName" className="input input-bordered" required />
          </label>
          <label className="form-control">
            <span className="label-text mb-1">Email</span>
            <input
              name="email"
              type="email"
              className="input input-bordered"
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1">Create password</span>
            <input
              name="password"
              type="password"
              className="input input-bordered"
              minLength={8}
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1">Phone</span>
            <input name="phone" className="input input-bordered" />
          </label>
          <label className="form-control">
            <span className="label-text mb-1">Date of birth</span>
            <input
              name="dateOfBirth"
              type="date"
              className="input input-bordered"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1">Property interest</span>
            <select
              name="propertyInterest"
              className="select select-bordered"
              defaultValue={defaultProperty}
            >
              <option value="">General / not sure yet</option>
              {properties.map((p) => (
                <option key={p.id} value={p.propertyName}>
                  {p.propertyName}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control">
            <span className="label-text mb-1">What are you looking for?</span>
            <textarea
              name="lookingFor"
              className="textarea textarea-bordered min-h-20"
              placeholder="Unit size, move-in timing, budget, pets…"
              required
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1">Additional notes</span>
            <textarea name="notes" className="textarea textarea-bordered min-h-16" />
          </label>

          {over21 ? (
            <div className="space-y-3 rounded-xl border border-base-300 bg-base-100/60 p-3">
              <p className="text-sm font-semibold">Required for ages 21+</p>
              <label className="form-control">
                <span className="label-text mb-1">
                  Valid ID (driver license / passport # or upload ref)
                </span>
                <input
                  name="idDocument"
                  className="input input-bordered"
                  placeholder="DL-TN-•••• or id-scan.pdf"
                  required
                />
              </label>
              <label className="form-control">
                <span className="label-text mb-1">Proof of employment</span>
                <textarea
                  name="employment"
                  className="textarea textarea-bordered min-h-16"
                  placeholder="Employer, title, income, paystub / offer letter ref"
                  required
                />
              </label>
            </div>
          ) : null}

          {under21 ? (
            <div className="space-y-3 rounded-xl border border-amber-300/50 bg-amber-50/80 p-3">
              <p className="text-sm font-semibold">Guarantor required (under 21)</p>
              <label className="form-control">
                <span className="label-text mb-1">Guarantor full name</span>
                <input
                  name="guarantorName"
                  className="input input-bordered"
                  required
                />
              </label>
              <label className="form-control">
                <span className="label-text mb-1">Guarantor phone</span>
                <input
                  name="guarantorPhone"
                  className="input input-bordered"
                  required
                />
              </label>
            </div>
          ) : null}

          {state.error ? (
            <p className="text-sm text-red-700">{state.error}</p>
          ) : null}

          <button
            type="submit"
            className="btn btn-neutral w-full"
            disabled={pending}
          >
            {pending ? "Submitting…" : "Create account & submit application"}
          </button>
        </form>
      </div>
    </main>
  );
}
