"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { COMPANY_NAME, COMPANY_SHORT } from "@/lib/brand";
import { DEMO_EMPLOYEE } from "@/lib/team-credentials";
import { teamLogin, type TeamLoginState } from "@/app/team/actions";

const initialState: TeamLoginState = {};

export function TeamLoginForm() {
  const [state, action, pending] = useActionState(teamLogin, initialState);

  return (
    <form action={action} className="mt-5 space-y-3">
      <label className="form-control w-full">
        <span className="label-text text-sm">Company ID / email</span>
        <input
          name="companyId"
          className="input input-bordered w-full bg-white"
          defaultValue={DEMO_EMPLOYEE.companyId}
          autoComplete="username"
          required
        />
      </label>
      <label className="form-control w-full">
        <span className="label-text text-sm">Password</span>
        <input
          name="password"
          type="password"
          className="input input-bordered w-full bg-white"
          defaultValue={DEMO_EMPLOYEE.password}
          autoComplete="current-password"
          required
        />
      </label>
      {state.error ? (
        <p className="text-sm text-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        className="btn btn-neutral w-full gap-2 border-0 bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
        disabled={pending}
      >
        <KeyRound className="h-4 w-4" />
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function TeamLoginPage() {
  return (
    <main className="min-h-screen bg-[var(--harbor-ink)]">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--harbor-on-dark)]/85 hover:text-[var(--harbor-on-dark)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to welcome
        </Link>

        <div className="rounded-2xl border border-[var(--harbor-border)] bg-[var(--harbor-card)] p-7 text-[var(--harbor-text)] shadow-xl">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <div>
              <p className="font-display text-2xl leading-tight text-[var(--harbor-ink)]">
                {COMPANY_SHORT}
              </p>
              <p className="text-sm text-[var(--harbor-muted)]">
                {COMPANY_NAME}
              </p>
              <p className="mt-0.5 text-xs text-[var(--harbor-muted-soft)]">
                Team member access
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[var(--harbor-border)] bg-[var(--harbor-sand)] px-4 py-3 text-sm text-[var(--harbor-text)]">
            <p className="font-semibold">{DEMO_EMPLOYEE.name}</p>
            <p className="mt-1 text-[var(--harbor-muted)]">
              Company ID: <strong>{DEMO_EMPLOYEE.companyId}</strong>
            </p>
            <p className="text-[var(--harbor-muted)]">
              Password: <strong>{DEMO_EMPLOYEE.password}</strong>
            </p>
          </div>

          <h1 className="mt-6 text-xl font-semibold text-[var(--harbor-text)]">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-[var(--harbor-muted)]">
            Use your company ID and password to open operations.
          </p>

          <TeamLoginForm />
        </div>
      </div>
    </main>
  );
}
