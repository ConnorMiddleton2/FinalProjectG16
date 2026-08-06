"use client";

import { useState } from "react";
import { TenantForgotPasswordPanel } from "@/components/portal/auth/TenantForgotPasswordPanel";
import { TenantLoginPanel } from "@/components/portal/auth/TenantLoginPanel";
import { TenantSignupPanel } from "@/components/portal/auth/TenantSignupPanel";

export type TenantAuthMode = "login" | "signup" | "forgot";

type Props = {
  initialMode?: "login" | "signup";
};

export function TenantPortalAuth({ initialMode = "login" }: Props) {
  const [mode, setMode] = useState<TenantAuthMode>(initialMode);
  const loginSelected = mode === "login" || mode === "forgot";
  const signupSelected = mode === "signup";

  return (
    <div className="space-y-4">
      <div
        className="flex rounded-xl border border-[var(--harbor-deep)]/10 bg-white/70 p-1"
        role="tablist"
        aria-label="Tenant authentication"
      >
        <button
          type="button"
          role="tab"
          aria-selected={loginSelected}
          className={`btn min-h-11 flex-1 ${
            loginSelected ? "btn-neutral" : "btn-ghost"
          }`}
          onClick={() => setMode("login")}
        >
          Tenant login
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={signupSelected}
          className={`btn min-h-11 flex-1 ${
            signupSelected ? "btn-neutral" : "btn-ghost"
          }`}
          onClick={() => setMode("signup")}
        >
          Tenant signup
        </button>
      </div>

      {mode === "login" ? (
        <TenantLoginPanel onForgotPassword={() => setMode("forgot")} />
      ) : null}
      {mode === "forgot" ? (
        <TenantForgotPasswordPanel onBack={() => setMode("login")} />
      ) : null}
      {mode === "signup" ? <TenantSignupPanel /> : null}
    </div>
  );
}
