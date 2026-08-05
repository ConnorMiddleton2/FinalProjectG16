"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, Building2, Plus, Trash2 } from "lucide-react";
import { OwnerAlert } from "@/components/OwnerAlert";
import { OwnerShell } from "@/components/OwnerShell";
import { ownerApply, ownerLogin, type OwnerAuthState } from "./actions";

const initialState: OwnerAuthState = {};

type PropertyRow = {
  id: string;
  category: string;
  location: string;
  squareFeet: string;
};

function newPropertyRow(): PropertyRow {
  return {
    id: crypto.randomUUID(),
    category: "",
    location: "",
    squareFeet: "",
  };
}

export default function OwnerAuthPage() {
  const [mode, setMode] = useState<"login" | "apply">("login");
  const [properties, setProperties] = useState<PropertyRow[]>([newPropertyRow()]);
  const [loginState, loginAction, loginPending] = useActionState(
    ownerLogin,
    initialState
  );
  const [applyState, applyAction, applyPending] = useActionState(
    ownerApply,
    initialState
  );

  const pending = mode === "login" ? loginPending : applyPending;
  const error = mode === "login" ? loginState.error : applyState.error;
  const success = mode === "apply" ? applyState.success : undefined;

  function updateProperty(
    id: string,
    key: keyof Omit<PropertyRow, "id">,
    value: string
  ) {
    setProperties((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );
  }

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
              <p className="owner-muted text-sm">Property owner access</p>
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
              aria-selected={mode === "apply"}
              className={`min-h-11 rounded-xl text-sm font-semibold transition ${
                mode === "apply"
                  ? "bg-[var(--harbor-deep)] text-[var(--harbor-sand)] shadow-sm"
                  : "text-[var(--harbor-ink)]/70 hover:bg-white/50"
              }`}
              onClick={() => setMode("apply")}
            >
              Apply for access
            </button>
          </div>

          <p className="mt-3 text-center text-sm">
            <Link
              href="/owners/status"
              className="font-medium text-[var(--harbor-mid)] underline-offset-2 hover:underline"
            >
              Check application status
            </Link>
          </p>

          <h1 className="mt-5 text-xl font-semibold text-[var(--harbor-ink)]">
            {mode === "login" ? "Owner sign in" : "Owner access application"}
          </h1>
          <p className="owner-muted mt-2 text-sm leading-relaxed">
            {mode === "login"
              ? "Sign in with the account Harborline created for you."
              : "Owners cannot self-register. List one or more properties below. Harborline will review your application and create your account if approved."}
          </p>

          {mode === "login" ? (
            <form action={loginAction} className="mt-6 space-y-4">
              <label className="block w-full">
                <span className="owner-label">Email</span>
                <input
                  name="email"
                  type="email"
                  className="owner-input"
                  placeholder="BobOwner@Building.com"
                  defaultValue="BobOwner@Building.com"
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
                  defaultValue="12345"
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
            <form key="apply" action={applyAction} className="mt-6 space-y-4">
              <label className="block w-full">
                <span className="owner-label">Full name</span>
                <input
                  name="fullName"
                  className="owner-input"
                  placeholder="Alex Rivera"
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
                  required
                />
              </label>
              <label className="block w-full">
                <span className="owner-label">Phone</span>
                <input
                  name="phone"
                  className="owner-input"
                  placeholder="(662) 555-0100"
                />
              </label>
              <label className="block w-full">
                <span className="owner-label">Company / ownership entity</span>
                <input
                  name="companyName"
                  className="owner-input"
                  placeholder="Riverbend Holdings LLC"
                />
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--harbor-ink)]">
                    Properties
                  </p>
                  <button
                    type="button"
                    className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[var(--harbor-mid)] hover:bg-[var(--harbor-mist)]/50"
                    onClick={() =>
                      setProperties((rows) => [...rows, newPropertyRow()])
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add property
                  </button>
                </div>

                {properties.map((property, index) => (
                  <div
                    key={property.id}
                    className="space-y-3 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/50 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                        Property {index + 1}
                      </p>
                      {properties.length > 1 ? (
                        <button
                          type="button"
                          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                          onClick={() =>
                            setProperties((rows) =>
                              rows.filter((row) => row.id !== property.id)
                            )
                          }
                          aria-label={`Remove property ${index + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>

                    <label className="block w-full">
                      <span className="owner-label">
                        Category <span className="opacity-50">(optional)</span>
                      </span>
                      <select
                        className="owner-input"
                        value={property.category}
                        onChange={(e) =>
                          updateProperty(property.id, "category", e.target.value)
                        }
                      >
                        <option value="">No category</option>
                        <option value="office">Office</option>
                        <option value="retail">Retail</option>
                        <option value="industrial">Industrial</option>
                        <option value="mixed-use">Mixed-use</option>
                        <option value="multifamily">Multifamily</option>
                        <option value="other">Other</option>
                      </select>
                    </label>

                    <label className="block w-full">
                      <span className="owner-label">Location</span>
                      <input
                        className="owner-input"
                        value={property.location}
                        onChange={(e) =>
                          updateProperty(property.id, "location", e.target.value)
                        }
                        placeholder="1842 Harborline Drive, Oxford, MS"
                        required
                      />
                    </label>

                    <label className="block w-full">
                      <span className="owner-label">Square feet</span>
                      <input
                        className="owner-input"
                        value={property.squareFeet}
                        onChange={(e) =>
                          updateProperty(
                            property.id,
                            "squareFeet",
                            e.target.value
                          )
                        }
                        placeholder="e.g. 12500"
                      />
                    </label>
                  </div>
                ))}
              </div>

              <input
                type="hidden"
                name="propertiesJson"
                value={JSON.stringify(
                  properties.map(({ category, location, squareFeet }) => ({
                    category,
                    location,
                    squareFeet,
                  }))
                )}
              />

              <label className="block w-full">
                <span className="owner-label">
                  Additional notes <span className="opacity-50">(optional)</span>
                </span>
                <textarea
                  name="message"
                  className="owner-input min-h-24 py-3"
                  placeholder="Tell us anything else about your portfolio or needs."
                />
              </label>

              {error ? <OwnerAlert variant="error">{error}</OwnerAlert> : null}
              {success ? (
                <OwnerAlert variant="success" title="Application received">
                  {success}
                </OwnerAlert>
              ) : null}

              <button
                type="submit"
                className="owner-btn-primary w-full"
                disabled={pending}
                aria-busy={pending}
              >
                {pending ? "Submitting…" : "Submit application"}
              </button>
            </form>
          )}
        </div>
      </div>
    </OwnerShell>
  );
}
