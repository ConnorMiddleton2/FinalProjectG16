"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, ShieldCheck } from "lucide-react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  prospectStartAdditionalApplication,
  prospectStartApplication,
  type ProspectApplyState,
} from "@/app/portal/prospect-actions";
import { ageFromDob } from "@/lib/tenant-age";
import { PortalField } from "@/components/portal/PortalField";
import { PORTAL_HOME_PATH } from "@/lib/portal/auth";

const initial: ProspectApplyState = {};

export function ProspectApplyForm({
  signedInAccount,
}: {
  signedInAccount?: {
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
  } | null;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const propertyIdParam = search.get("property") || "";
  const propertyNameParam = search.get("name") || "";
  const { items: properties } = useSharedCollection<ManagementContractDraft>(
    COLLECTIONS.managedProperties
  );
  const signedIn = Boolean(signedInAccount?.email);
  const [state, action, pending] = useActionState(
    signedIn ? prospectStartAdditionalApplication : prospectStartApplication,
    initial
  );
  const [dob, setDob] = useState(signedInAccount?.dateOfBirth || "");
  const age = useMemo(() => ageFromDob(dob), [dob]);
  const under21 = age != null && age < 21;
  const over21 = age != null && age >= 21;

  useEffect(() => {
    if (!state.ok) return;
    router.replace(`${PORTAL_HOME_PATH}?welcome=application`);
    router.refresh();
  }, [state.ok, router]);

  const lockedProperty =
    propertyNameParam ||
    properties.find((p) => p.id === propertyIdParam)?.propertyName ||
    "";
  const propertyLocked = Boolean(propertyIdParam && lockedProperty);

  return (
    <main className="min-h-screen bg-[var(--harbor-sand)]">
      <div className="mx-auto max-w-xl px-5 py-8 sm:px-6 sm:py-10">
        <Link
          href={signedIn ? PORTAL_HOME_PATH : "/portal/start"}
          className="inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/65 transition hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {signedIn ? "Back to portal" : "Back to properties"}
        </Link>

        <header className="mt-5">
          <h1 className="font-display text-3xl tracking-tight text-[var(--harbor-ink)] sm:text-4xl">
            {signedIn ? "Start another application" : "Start an application"}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--harbor-ink)]/65">
            {signedIn
              ? "You can submit more than one application — including multiple for the same property. Each one is tracked separately with Sales & Marketing."
              : "Create your account and send an inquiry to Sales & Marketing. You can submit additional applications later from your portal."}
          </p>
        </header>

        <form
          action={action}
          className="mt-7 space-y-6 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/95 p-5 shadow-sm sm:p-6"
        >
          <input type="hidden" name="propertyId" value={propertyIdParam} />
          {propertyLocked ? (
            <input type="hidden" name="propertyInterest" value={lockedProperty} />
          ) : null}

          {signedIn ? (
            <section className="space-y-2 rounded-xl border border-[var(--harbor-mid)]/20 bg-[var(--harbor-mist)]/40 px-3.5 py-3 text-sm">
              <p className="font-medium text-[var(--harbor-ink)]">
                Signed in as {signedInAccount?.fullName || signedInAccount?.email}
              </p>
              <p className="text-[var(--harbor-ink)]/65">
                {signedInAccount?.email} — this application will be added to your
                existing account.
              </p>
              <input type="hidden" name="email" value={signedInAccount?.email || ""} />
              <input
                type="hidden"
                name="fullName"
                value={signedInAccount?.fullName || ""}
              />
            </section>
          ) : (
            <section className="space-y-3">
              <h2 className="portal-section-title text-base">Your account</h2>
              <PortalField
                name="fullName"
                label="Full name"
                autoComplete="name"
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <PortalField
                  name="email"
                  type="email"
                  label="Email"
                  autoComplete="email"
                  required
                />
                <PortalField
                  name="password"
                  type="password"
                  label="Password"
                  autoComplete="new-password"
                  minLength={8}
                  hint="At least 8 characters"
                  required
                />
              </div>
            </section>
          )}

          <section className="space-y-3 border-t border-[var(--harbor-deep)]/8 pt-5">
            <h2 className="portal-section-title text-base">
              {signedIn ? "New application details" : "Interest"}
            </h2>

            {propertyLocked ? (
              <div className="flex items-start gap-3 rounded-xl border border-[var(--harbor-mid)]/25 bg-[var(--harbor-mist)]/50 px-3.5 py-3">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--harbor-deep)]" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--harbor-ink)]/50">
                    Applying for
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-[var(--harbor-ink)]">
                    {lockedProperty}
                  </p>
                </div>
              </div>
            ) : (
              <PortalField
                as="select"
                name="propertyInterest"
                label="Property"
                defaultValue=""
              >
                <option value="">General / not sure yet</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.propertyName}>
                    {p.propertyName}
                  </option>
                ))}
              </PortalField>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <PortalField
                name="phone"
                type="tel"
                label="Phone"
                autoComplete="tel"
                defaultValue={signedInAccount?.phone || ""}
              />
              <PortalField
                name="dateOfBirth"
                type="date"
                label="Date of birth"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />
            </div>

            <PortalField
              as="textarea"
              name="lookingFor"
              label="What are you looking for?"
              rows={3}
              placeholder="Unit size, budget, pets, timing…"
              required
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <PortalField
                name="moveInTiming"
                label="Preferred move-in"
                placeholder="Next 30–60 days"
              />
              <PortalField
                name="householdSize"
                label="Household / company"
                placeholder="2 adults, or 8 employees"
              />
            </div>
          </section>

          {over21 ? (
            <section className="space-y-3 rounded-xl border border-[var(--harbor-deep)]/12 bg-[var(--harbor-sand)]/40 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[var(--harbor-deep)]" />
                <h2 className="text-sm font-semibold text-[var(--harbor-ink)]">
                  Verification (21+)
                </h2>
              </div>
              <PortalField
                name="idDocument"
                label="Government ID reference"
                placeholder="DL number or passport #"
                required
              />
              <PortalField
                as="textarea"
                name="employment"
                label="Proof of employment"
                rows={2}
                placeholder="Employer, title, income, paystub ref"
                required
              />
            </section>
          ) : null}

          {under21 ? (
            <section className="space-y-3 rounded-xl border border-amber-400/35 bg-amber-50/90 p-4">
              <h2 className="text-sm font-semibold text-amber-950">
                Guarantor required (under 21)
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <PortalField
                  name="guarantorName"
                  label="Guarantor name"
                  required
                />
                <PortalField
                  name="guarantorPhone"
                  type="tel"
                  label="Guarantor phone"
                  required
                />
              </div>
            </section>
          ) : null}

          {state.error ? (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              {state.error}
            </p>
          ) : null}

          {state.ok ? (
            <p className="rounded-lg border border-[var(--harbor-mid)]/30 bg-[var(--harbor-mist)]/60 px-3 py-2 text-sm text-[var(--harbor-ink)]">
              Application submitted — opening your portal…
            </p>
          ) : null}

          <button
            type="submit"
            className="btn btn-neutral w-full"
            disabled={pending || Boolean(state.ok)}
          >
            {pending
              ? "Submitting…"
              : state.ok
                ? "Opening portal…"
                : signedIn
                  ? "Submit another application"
                  : "Create account & submit"}
          </button>

          {!signedIn ? (
            <p className="text-center text-xs text-[var(--harbor-ink)]/50">
              Already have an account?{" "}
              <Link
                href="/portal/login?next=/portal"
                className="font-medium text-[var(--harbor-deep)] underline-offset-2 hover:underline"
              >
                Sign in
              </Link>
              , then start another application from your portal.
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
