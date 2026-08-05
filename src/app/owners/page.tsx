"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, Building2, Plus, Trash2 } from "lucide-react";
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
    <main className="min-h-screen bg-[linear-gradient(165deg,#f3efe6_0%,#d7eef2_55%,#e8f4f6_100%)]">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--harbor-ink)]/70 hover:text-[var(--harbor-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to welcome
        </Link>

        <div className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/90 p-7 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--harbor-ink)] p-2 text-[var(--harbor-sand)]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-2xl leading-tight text-[var(--harbor-ink)]">
                Harborline
              </p>
              <p className="text-sm opacity-60">Property owner access</p>
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              className={`btn btn-sm flex-1 ${mode === "login" ? "btn-neutral" : "btn-ghost"}`}
              onClick={() => setMode("login")}
            >
              Log in
            </button>
            <button
              type="button"
              className={`btn btn-sm flex-1 ${mode === "apply" ? "btn-neutral" : "btn-ghost"}`}
              onClick={() => setMode("apply")}
            >
              Apply for access
            </button>
          </div>

          <h1 className="mt-5 text-xl font-semibold text-[var(--harbor-ink)]">
            {mode === "login" ? "Owner sign in" : "Owner access application"}
          </h1>
          <p className="mt-2 text-sm text-[var(--harbor-ink)]/65">
            {mode === "login"
              ? "Sign in with the account Harborline created for you."
              : "Owners cannot self-register. List one or more properties below. Harborline will review your application and create your account if approved."}
          </p>

          {mode === "login" ? (
            <form action={loginAction} className="mt-6 space-y-4">
              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Email</span>
                <input
                  name="email"
                  type="email"
                  className="input input-bordered w-full"
                  placeholder="BobOwner@Building.com"
                  defaultValue="BobOwner@Building.com"
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Password</span>
                <input
                  name="password"
                  type="password"
                  className="input input-bordered w-full"
                  placeholder="••••••••"
                  defaultValue="12345"
                  required
                />
              </label>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-neutral w-full"
                disabled={pending}
              >
                {pending ? "Please wait…" : "Sign in"}
              </button>
            </form>
          ) : (
            <form key="apply" action={applyAction} className="mt-6 space-y-4">
              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Full name</span>
                <input
                  name="fullName"
                  className="input input-bordered w-full"
                  placeholder="Alex Rivera"
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Email</span>
                <input
                  name="email"
                  type="email"
                  className="input input-bordered w-full"
                  placeholder="owner@example.com"
                  required
                />
              </label>
              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">Phone</span>
                <input
                  name="phone"
                  className="input input-bordered w-full"
                  placeholder="(662) 555-0100"
                />
              </label>
              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Company / ownership entity
                </span>
                <input
                  name="companyName"
                  className="input input-bordered w-full"
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
                    className="btn btn-ghost btn-xs gap-1"
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
                    className="rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-60">
                        Property {index + 1}
                      </p>
                      {properties.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() =>
                            setProperties((rows) =>
                              rows.filter((row) => row.id !== property.id)
                            )
                          }
                          aria-label={`Remove property ${index + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <label className="form-control w-full">
                      <span className="mb-1 text-sm opacity-70">
                        Category{" "}
                        <span className="opacity-50">(optional)</span>
                      </span>
                      <select
                        className="select select-bordered w-full"
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

                    <label className="form-control w-full">
                      <span className="mb-1 text-sm opacity-70">Location</span>
                      <input
                        className="input input-bordered w-full"
                        value={property.location}
                        onChange={(e) =>
                          updateProperty(property.id, "location", e.target.value)
                        }
                        placeholder="1842 Harborline Drive, Oxford, MS"
                        required
                      />
                    </label>

                    <label className="form-control w-full">
                      <span className="mb-1 text-sm opacity-70">Square feet</span>
                      <input
                        className="input input-bordered w-full"
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

              <label className="form-control w-full">
                <span className="mb-1 text-sm opacity-70">
                  Additional notes{" "}
                  <span className="opacity-50">(optional)</span>
                </span>
                <textarea
                  name="message"
                  className="textarea textarea-bordered w-full min-h-24"
                  placeholder="Tell us anything else about your portfolio or needs."
                />
              </label>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
              {success && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {success}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-neutral w-full"
                disabled={pending}
              >
                {pending ? "Submitting…" : "Submit application"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
