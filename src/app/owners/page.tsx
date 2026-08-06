"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, Building2 } from "lucide-react";
import { OwnerAlert } from "@/components/OwnerAlert";
import { OwnerShell } from "@/components/OwnerShell";
import {
  ownerLogin,
  ownerRegister,
  type OwnerAuthState,
} from "./actions";

const initialState: OwnerAuthState = {};

export default function OwnerAuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginAction, loginPending] = useActionState(
    ownerLogin,
    initialState
  );
  const [registerState, registerAction, registerPending] = useActionState(
    ownerRegister,
    initialState
  );

  const pending = mode === "login" ? loginPending : registerPending;
  const error = mode === "login" ? loginState.error : registerState.error;

  return (
    <OwnerShell variant="auth">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <Link
          href="/"
          className="owner-muted mb-8 inline-flex items-center gap-2 text-sm transition hover:text-[var(--harbor-ink)] welcome-rise"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to welcome
        </Link>

        <div className="owner-card welcome-rise-delay p-7 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--harbor-ink)] p-2.5 text-[var(--harbor-sand)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-2xl leading-tight text-[var(--harbor-ink)]">
                Harborline
              </p>
              <p className="owner-muted text-sm">Property owner portal</p>
            </div>
          </div>

          <div
            className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-[var(--harbor-sand)]/80 p-1"
            role="tablist"
            aria-label="Access mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`min-h-11 rounded-xl text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-[var(--harbor-deep)] text-[var(--harbor-sand)] shadow-sm"
                  : "text-[var(--harbor-ink)]/70 hover:bg-white/50"
              }`}
              onClick={() => setMode("login")}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={`min-h-11 rounded-xl text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-[var(--harbor-deep)] text-[var(--harbor-sand)] shadow-sm"
                  : "text-[var(--harbor-ink)]/70 hover:bg-white/50"
              }`}
              onClick={() => setMode("register")}
            >
              Create account
            </button>
          </div>

          <h1 className="mt-5 text-xl font-semibold text-[var(--harbor-ink)]">
            {mode === "login" ? "Owner sign in" : "Create owner account"}
          </h1>
          <p className="owner-muted mt-2 text-sm leading-relaxed">
            {mode === "login"
              ? "Sign in with your email and password to open your owner dashboard."
              : "Create an account with your email and password. After signup you can submit properties for Harborline management and track applications from your dashboard."}
          </p>

          {mode === "login" ? (
            <form action={loginAction} className="mt-6 space-y-4">
              <label className="block w-full">
                <span className="owner-label">Email</span>
                <input
                  name="email"
                  type="email"
                  className="owner-input"
                  placeholder="owner@example.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="block w-full">
                <span className="owner-label">Password</span>
                <input
                  name="password"
                  type="password"
                  className="owner-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </label>

              {error ? <OwnerAlert variant="error">{error}</OwnerAlert> : null}

              <button
                type="submit"
                className="owner-btn-primary w-full"
                disabled={pending}
                aria-busy={pending}
              >
                {pending ? "Please wait…" : "Sign in"}
              </button>
            </form>
          ) : (
            <form key="register" action={registerAction} className="mt-6 space-y-4">
              <label className="block w-full">
                <span className="owner-label">Full name</span>
                <input
                  name="fullName"
                  className="owner-input"
                  placeholder="Alex Rivera"
                  autoComplete="name"
                  required
                />
              </label>
              <label className="block w-full">
                <span className="owner-label">Email</span>
                <input
                  name="email"
                  type="email"
                  className="owner-input"
                  placeholder="owner@example.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="block w-full">
                <span className="owner-label">Password</span>
                <input
                  name="password"
                  type="password"
                  className="owner-input"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label className="block w-full">
                <span className="owner-label">Confirm password</span>
                <input
                  name="confirmPassword"
                  type="password"
                  className="owner-input"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>

              {error ? <OwnerAlert variant="error">{error}</OwnerAlert> : null}

              <button
                type="submit"
                className="owner-btn-primary w-full"
                disabled={pending}
                aria-busy={pending}
              >
                {pending ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}

          <p className="owner-muted mt-5 text-center text-xs leading-relaxed">
            Already working with Harborline? Demo owners use password{" "}
            <span className="font-medium text-[var(--harbor-ink)]">OwnerDemo1!</span>
          </p>
        </div>
      </div>
    </OwnerShell>
  );
}
