"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cloud,
  Save,
} from "lucide-react";
import { useRentalApplicationDraft } from "@/hooks/useRentalApplicationDraft";
import { ApplicationPartiesStep } from "@/components/portal/ApplicationPartiesStep";
import { ApplicationDocumentsUpload } from "@/components/portal/ApplicationDocumentsUpload";
import { AVAILABLE_UNIT_DETAILS } from "@/lib/available-unit-details";
import {
  APPLICATION_STEPS,
  createApplicationId,
  getMaximumDateOfBirth,
  MINIMUM_RENTAL_AGE,
  requiredFieldsHint,
  validateApplicationStep,
  type Pet,
  type Reference,
  type RentalApplicationDraft,
  type Vehicle,
} from "@/lib/rental-application";
import { getPartyRoleMeta } from "@/lib/application-parties";

function RequiredMark() {
  return (
    <span className="text-error" aria-hidden="true">
      *
    </span>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide">
      {children}
      {required ? (
        <>
          {" "}
          <RequiredMark />
        </>
      ) : null}
    </span>
  );
}

function ProgressBar({
  stepIndex,
  submitted,
}: {
  stepIndex: number;
  submitted: boolean;
}) {
  const total = APPLICATION_STEPS.length;
  const current = submitted ? total : Math.min(stepIndex + 1, total - 1);
  const percent = Math.round((current / total) * 100);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-semibold">
          Step {Math.min(stepIndex + 1, total)} of {total}:{" "}
          {APPLICATION_STEPS[Math.min(stepIndex, total - 1)]?.title}
        </p>
        <p className="text-[var(--harbor-ink)]/55">{percent}% complete</p>
      </div>
      <progress
        className="progress progress-neutral mt-3 w-full"
        value={percent}
        max={100}
      />
      <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {APPLICATION_STEPS.map((step, index) => (
          <span
            key={step.id}
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              index < stepIndex || submitted
                ? "bg-[var(--harbor-mid)] text-white"
                : index === stepIndex
                  ? "bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                  : "bg-white/70 text-[var(--harbor-ink)]/40"
            }`}
          >
            {step.short}
          </span>
        ))}
      </div>
    </div>
  );
}

function AddressFields({
  value,
  onChange,
  prefix,
}: {
  value: { street: string; city: string; state: string; zip: string };
  onChange: (next: {
    street: string;
    city: string;
    state: string;
    zip: string;
  }) => void;
  prefix: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <FieldLabel required>{prefix} street</FieldLabel>
        <input
          className="input input-bordered w-full"
          value={value.street}
          onChange={(event) =>
            onChange({ ...value, street: event.target.value })
          }
        />
      </label>
      <label className="block">
        <FieldLabel required>City</FieldLabel>
        <input
          className="input input-bordered w-full"
          value={value.city}
          onChange={(event) => onChange({ ...value, city: event.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <FieldLabel required>State</FieldLabel>
          <input
            className="input input-bordered w-full"
            value={value.state}
            onChange={(event) =>
              onChange({ ...value, state: event.target.value })
            }
          />
        </label>
        <label className="block">
          <FieldLabel required>ZIP</FieldLabel>
          <input
            className="input input-bordered w-full"
            value={value.zip}
            onChange={(event) =>
              onChange({ ...value, zip: event.target.value })
            }
          />
        </label>
      </div>
    </div>
  );
}

function WizardInner() {
  const searchParams = useSearchParams();
  const unitFromQuery = searchParams.get("unit") ?? "";
  const {
    draft,
    loading,
    error,
    autosaveStatus,
    refresh,
    updateDraft,
    saveNow,
    submit,
    startNew,
  } = useRentalApplicationDraft(unitFromQuery);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const step = APPLICATION_STEPS[draft.stepIndex] ?? APPLICATION_STEPS[0];
  const isSubmitted = draft.status === "submitted";
  const hints = requiredFieldsHint(step.id);

  const properties = useMemo(
    () =>
      Array.from(
        new Set(AVAILABLE_UNIT_DETAILS.map((unit) => unit.property))
      ).sort(),
    []
  );

  const unitsForProperty = useMemo(
    () =>
      AVAILABLE_UNIT_DETAILS.filter((unit) =>
        draft.property ? unit.property === draft.property : true
      ),
    [draft.property]
  );

  function patch(partial: Partial<RentalApplicationDraft>) {
    updateDraft((current) => ({ ...current, ...partial }));
    setValidationError(null);
  }

  function goNext() {
    if (isSubmitted) return;
    const message = validateApplicationStep(draft, step.id);
    if (message) {
      setValidationError(message);
      return;
    }
    if (step.id === "review") {
      submit();
      return;
    }
    patch({
      stepIndex: Math.min(draft.stepIndex + 1, APPLICATION_STEPS.length - 1),
    });
  }

  function goBack() {
    if (draft.stepIndex === 0 || isSubmitted) return;
    patch({ stepIndex: draft.stepIndex - 1 });
  }

  function handleSaveLater() {
    if (saveNow()) {
      setSaveMessage(
        "Draft saved in this browser. You can return to Continue later anytime."
      );
      window.setTimeout(() => setSaveMessage(null), 3500);
    }
  }

  function addPet() {
    const pet: Pet = {
      id: createApplicationId(),
      type: "",
      breed: "",
      weight: "",
      name: "",
    };
    patch({ pets: [...draft.pets, pet], hasPets: true });
  }

  function addVehicle() {
    const vehicle: Vehicle = {
      id: createApplicationId(),
      make: "",
      model: "",
      color: "",
      year: "",
      plateState: "",
    };
    patch({ vehicles: [...draft.vehicles, vehicle], hasVehicles: true });
  }

  function addReference() {
    const reference: Reference = {
      id: createApplicationId(),
      fullName: "",
      relationship: "",
      phone: "",
      email: "",
    };
    patch({ references: [...draft.references, reference] });
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Loading rental application">
        <div className="skeleton h-36 w-full rounded-3xl" />
        <div className="skeleton h-80 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-[var(--harbor-ink)] px-6 py-8 text-[var(--harbor-sand)] sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--harbor-glow)]">
          Harborline leasing
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">
          Rental application
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          Complete each step at your pace. Your draft autosaves in this browser.
          Full Social Security numbers, bank account details, and unmasked ID
          numbers are never collected on this form.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 bg-white/80 px-4 py-3 text-sm">
        <span className="inline-flex items-center gap-2 text-[var(--harbor-ink)]/65">
          <Cloud className="h-4 w-4" />
          {autosaveStatus === "saving"
            ? "Saving draft…"
            : autosaveStatus === "saved"
              ? `Draft autosaved${draft.savedAt ? ` · ${new Date(draft.savedAt).toLocaleTimeString()}` : ""}`
              : autosaveStatus === "error"
                ? "Autosave failed — use Save & continue later"
                : "Autosave ready"}
        </span>
        {!isSubmitted ? (
          <button
            type="button"
            className="btn btn-outline btn-sm gap-1"
            onClick={handleSaveLater}
          >
            <Save className="h-3.5 w-3.5" />
            Save & continue later
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="alert border-error/20 bg-error/10">
          <AlertCircle className="h-5 w-5 text-error" />
          <div className="flex-1 text-sm">{error}</div>
          <button type="button" className="btn btn-sm btn-outline" onClick={refresh}>
            Retry
          </button>
        </div>
      ) : null}

      {saveMessage ? (
        <div className="alert alert-success text-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>{saveMessage}</span>
        </div>
      ) : null}

      <ProgressBar stepIndex={draft.stepIndex} submitted={isSubmitted} />

      {hints.length > 0 && !isSubmitted ? (
        <p className="text-xs text-[var(--harbor-ink)]/55">
          Required on this step: {hints.join(" · ")}{" "}
          <RequiredMark />
        </p>
      ) : null}

      {validationError ? (
        <div className="alert alert-warning text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{validationError}</span>
        </div>
      ) : null}

      <section className="rounded-3xl border border-[var(--harbor-deep)]/10 bg-white/90 p-5 sm:p-7">
        {step.id === "unit" ? (
          <div className="space-y-4">
            <h2 className="font-display text-3xl">Unit selection</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel required>Property</FieldLabel>
                <select
                  className="select select-bordered w-full"
                  value={draft.property}
                  onChange={(event) =>
                    patch({
                      property: event.target.value,
                      unitId: "",
                      floorPlan: "",
                    })
                  }
                >
                  <option value="">Select property</option>
                  {properties.map((property) => (
                    <option key={property}>{property}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel required>Unit / floor plan</FieldLabel>
                <select
                  className="select select-bordered w-full"
                  value={draft.unitId}
                  onChange={(event) => {
                    const unit = AVAILABLE_UNIT_DETAILS.find(
                      (item) => item.id === event.target.value
                    );
                    patch({
                      unitId: unit?.id ?? "",
                      property: unit?.property ?? draft.property,
                      floorPlan: unit?.floorPlan ?? "",
                      leaseTerm: unit?.leaseTerms[0] ?? draft.leaseTerm,
                    });
                  }}
                >
                  <option value="">Select unit</option>
                  {unitsForProperty.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.property} · {unit.floorPlan}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel required>Desired move-in date</FieldLabel>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={draft.desiredMoveInDate}
                  onChange={(event) =>
                    patch({ desiredMoveInDate: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <FieldLabel required>Lease term</FieldLabel>
                <select
                  className="select select-bordered w-full"
                  value={draft.leaseTerm}
                  onChange={(event) => patch({ leaseTerm: event.target.value })}
                >
                  {["12 months", "15 months", "18 months"].map((term) => (
                    <option key={term}>{term}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {step.id === "applicant" ? (
          <div className="space-y-4">
            <h2 className="font-display text-3xl">Applicant information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <FieldLabel required>Full legal name</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  value={draft.applicantFullName}
                  onChange={(event) =>
                    patch({ applicantFullName: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <FieldLabel required>Date of birth</FieldLabel>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={draft.dateOfBirth}
                  max={getMaximumDateOfBirth()}
                  onChange={(event) =>
                    patch({ dateOfBirth: event.target.value })
                  }
                />
                <span className="mt-1 block text-xs text-[var(--harbor-ink)]/55">
                  Must be at least {MINIMUM_RENTAL_AGE} years old to rent.
                </span>
              </label>
              <label className="block">
                <FieldLabel required>Government ID type</FieldLabel>
                <select
                  className="select select-bordered w-full"
                  value={draft.governmentIdType}
                  onChange={(event) =>
                    patch({ governmentIdType: event.target.value })
                  }
                >
                  <option value="">Select type</option>
                  <option>Driver license</option>
                  <option>State ID</option>
                  <option>Passport</option>
                  <option>Other government ID</option>
                </select>
              </label>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 p-4 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm mt-0.5"
                checked={draft.governmentIdProvidedOffline}
                onChange={(event) =>
                  patch({ governmentIdProvidedOffline: event.target.checked })
                }
              />
              <span>
                <RequiredMark /> I will provide photo ID for screening. Harborline
                does not collect full ID numbers in this form.
              </span>
            </label>
          </div>
        ) : null}

        {step.id === "contact" ? (
          <div className="space-y-4">
            <h2 className="font-display text-3xl">Contact information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel required>Email</FieldLabel>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  value={draft.email}
                  onChange={(event) => patch({ email: event.target.value })}
                />
              </label>
              <label className="block">
                <FieldLabel required>Phone</FieldLabel>
                <input
                  type="tel"
                  className="input input-bordered w-full"
                  value={draft.phone}
                  onChange={(event) => patch({ phone: event.target.value })}
                />
              </label>
              <label className="block">
                <FieldLabel>Alternate phone</FieldLabel>
                <input
                  type="tel"
                  className="input input-bordered w-full"
                  value={draft.alternatePhone}
                  onChange={(event) =>
                    patch({ alternatePhone: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <FieldLabel>Preferred contact</FieldLabel>
                <select
                  className="select select-bordered w-full"
                  value={draft.preferredContact}
                  onChange={(event) =>
                    patch({
                      preferredContact: event.target.value as
                        | "Email"
                        | "Phone"
                        | "Text",
                    })
                  }
                >
                  <option>Email</option>
                  <option>Phone</option>
                  <option>Text</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {step.id === "currentResidence" ? (
          <div className="space-y-4">
            <h2 className="font-display text-3xl">Current residence</h2>
            <AddressFields
              prefix="Current"
              value={draft.currentResidence}
              onChange={(address) =>
                patch({
                  currentResidence: { ...draft.currentResidence, ...address },
                })
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel required>Move-in date</FieldLabel>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={draft.currentResidence.moveInDate}
                  onChange={(event) =>
                    patch({
                      currentResidence: {
                        ...draft.currentResidence,
                        moveInDate: event.target.value,
                      },
                    })
                  }
                />
              </label>
              <label className="block">
                <FieldLabel>Monthly rent</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  value={draft.currentResidence.monthlyRent}
                  onChange={(event) =>
                    patch({
                      currentResidence: {
                        ...draft.currentResidence,
                        monthlyRent: event.target.value,
                      },
                    })
                  }
                  placeholder="$"
                />
              </label>
              <label className="block">
                <FieldLabel>Landlord / manager name</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  value={draft.currentResidence.landlordName}
                  onChange={(event) =>
                    patch({
                      currentResidence: {
                        ...draft.currentResidence,
                        landlordName: event.target.value,
                      },
                    })
                  }
                />
              </label>
              <label className="block">
                <FieldLabel>Landlord phone</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  value={draft.currentResidence.landlordPhone}
                  onChange={(event) =>
                    patch({
                      currentResidence: {
                        ...draft.currentResidence,
                        landlordPhone: event.target.value,
                      },
                    })
                  }
                />
              </label>
              <label className="block sm:col-span-2">
                <FieldLabel required>Reason for leaving</FieldLabel>
                <textarea
                  className="textarea textarea-bordered min-h-20 w-full"
                  value={draft.currentResidence.reasonForLeaving}
                  onChange={(event) =>
                    patch({
                      currentResidence: {
                        ...draft.currentResidence,
                        reasonForLeaving: event.target.value,
                      },
                    })
                  }
                />
              </label>
            </div>
          </div>
        ) : null}

        {step.id === "previousResidence" ? (
          <div className="space-y-4">
            <h2 className="font-display text-3xl">Previous residence</h2>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="toggle toggle-sm"
                checked={draft.hasPreviousResidence}
                onChange={(event) =>
                  patch({ hasPreviousResidence: event.target.checked })
                }
              />
              I have a previous residence to report
            </label>
            {draft.hasPreviousResidence ? (
              <>
                <AddressFields
                  prefix="Previous"
                  value={draft.previousResidence}
                  onChange={(address) =>
                    patch({
                      previousResidence: {
                        ...draft.previousResidence,
                        ...address,
                      },
                    })
                  }
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel required>Move-in date</FieldLabel>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={draft.previousResidence.moveInDate}
                      onChange={(event) =>
                        patch({
                          previousResidence: {
                            ...draft.previousResidence,
                            moveInDate: event.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label className="block">
                    <FieldLabel required>Move-out date</FieldLabel>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={draft.previousResidence.moveOutDate}
                      onChange={(event) =>
                        patch({
                          previousResidence: {
                            ...draft.previousResidence,
                            moveOutDate: event.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>Landlord name</FieldLabel>
                    <input
                      className="input input-bordered w-full"
                      value={draft.previousResidence.landlordName}
                      onChange={(event) =>
                        patch({
                          previousResidence: {
                            ...draft.previousResidence,
                            landlordName: event.target.value,
                          },
                        })
                      }
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>Landlord phone</FieldLabel>
                    <input
                      className="input input-bordered w-full"
                      value={draft.previousResidence.landlordPhone}
                      onChange={(event) =>
                        patch({
                          previousResidence: {
                            ...draft.previousResidence,
                            landlordPhone: event.target.value,
                          },
                        })
                      }
                    />
                  </label>
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--harbor-ink)]/60">
                You can continue without a previous residence.
              </p>
            )}
          </div>
        ) : null}

        {step.id === "employment" ? (
          <div className="space-y-4">
            <h2 className="font-display text-3xl">Employment and income</h2>
            <p className="text-sm text-[var(--harbor-ink)]/60">
              Enter income totals only. Do not enter bank account or routing
              numbers.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <FieldLabel required>Employment status</FieldLabel>
                <select
                  className="select select-bordered w-full"
                  value={draft.employmentStatus}
                  onChange={(event) =>
                    patch({ employmentStatus: event.target.value })
                  }
                >
                  <option value="">Select status</option>
                  <option>Employed</option>
                  <option>Self-employed</option>
                  <option>Student</option>
                  <option>Retired</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="block">
                <FieldLabel required>Monthly income</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  value={draft.monthlyIncome}
                  onChange={(event) =>
                    patch({ monthlyIncome: event.target.value })
                  }
                  placeholder="$"
                />
              </label>
              <label className="block">
                <FieldLabel>Employer name</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  value={draft.employerName}
                  onChange={(event) =>
                    patch({ employerName: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <FieldLabel>Job title</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  value={draft.jobTitle}
                  onChange={(event) => patch({ jobTitle: event.target.value })}
                />
              </label>
              <label className="block">
                <FieldLabel>Employer phone</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  value={draft.employerPhone}
                  onChange={(event) =>
                    patch({ employerPhone: event.target.value })
                  }
                />
              </label>
              <label className="block">
                <FieldLabel>Additional monthly income</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  value={draft.additionalIncome}
                  onChange={(event) =>
                    patch({ additionalIncome: event.target.value })
                  }
                />
              </label>
              <label className="block sm:col-span-2">
                <FieldLabel>Additional income source</FieldLabel>
                <input
                  className="input input-bordered w-full"
                  value={draft.additionalIncomeSource}
                  onChange={(event) =>
                    patch({ additionalIncomeSource: event.target.value })
                  }
                />
              </label>
            </div>
          </div>
        ) : null}

        {step.id === "occupants" ? (
          <ApplicationPartiesStep
            applicationId={draft.id}
            property={draft.property}
            floorPlan={draft.floorPlan}
            desiredMoveInDate={draft.desiredMoveInDate}
            leaseTerm={draft.leaseTerm}
            primaryApplicantFullName={draft.applicantFullName}
            parties={draft.parties}
            onChange={(parties) => patch({ parties })}
            disabled={isSubmitted}
          />
        ) : null}

        {step.id === "pets" ? (
          <div className="space-y-4">
            <h2 className="font-display text-3xl">Pets</h2>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="toggle toggle-sm"
                checked={draft.hasPets}
                onChange={(event) =>
                  patch({
                    hasPets: event.target.checked,
                    pets: event.target.checked ? draft.pets : [],
                  })
                }
              />
              I have pets
            </label>
            {draft.hasPets
              ? draft.pets.map((pet, index) => (
                  <div
                    key={pet.id}
                    className="grid gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 p-4 sm:grid-cols-2"
                  >
                    {(["name", "type", "breed", "weight"] as const).map(
                      (field) => (
                        <label key={field} className="block">
                          <FieldLabel required={field === "name" || field === "type"}>
                            {field.charAt(0).toUpperCase() + field.slice(1)}
                          </FieldLabel>
                          <input
                            className="input input-bordered w-full"
                            value={pet[field]}
                            onChange={(event) => {
                              const pets = [...draft.pets];
                              pets[index] = {
                                ...pet,
                                [field]: event.target.value,
                              };
                              patch({ pets });
                            }}
                          />
                        </label>
                      )
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm sm:col-span-2"
                      onClick={() =>
                        patch({
                          pets: draft.pets.filter((item) => item.id !== pet.id),
                        })
                      }
                    >
                      Remove pet
                    </button>
                  </div>
                ))
              : null}
            {draft.hasPets ? (
              <button type="button" className="btn btn-outline btn-sm" onClick={addPet}>
                Add pet
              </button>
            ) : null}
          </div>
        ) : null}

        {step.id === "vehicles" ? (
          <div className="space-y-4">
            <h2 className="font-display text-3xl">Vehicles</h2>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="toggle toggle-sm"
                checked={draft.hasVehicles}
                onChange={(event) =>
                  patch({
                    hasVehicles: event.target.checked,
                    vehicles: event.target.checked ? draft.vehicles : [],
                  })
                }
              />
              I have vehicles to register
            </label>
            {draft.hasVehicles
              ? draft.vehicles.map((vehicle, index) => (
                  <div
                    key={vehicle.id}
                    className="grid gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 p-4 sm:grid-cols-2"
                  >
                    {(["make", "model", "color", "year", "plateState"] as const).map(
                      (field) => (
                        <label key={field} className="block">
                          <FieldLabel
                            required={field === "make" || field === "model"}
                          >
                            {field === "plateState"
                              ? "Plate state (optional)"
                              : field.charAt(0).toUpperCase() + field.slice(1)}
                          </FieldLabel>
                          <input
                            className="input input-bordered w-full"
                            value={vehicle[field]}
                            onChange={(event) => {
                              const vehicles = [...draft.vehicles];
                              vehicles[index] = {
                                ...vehicle,
                                [field]: event.target.value,
                              };
                              patch({ vehicles });
                            }}
                          />
                        </label>
                      )
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm sm:col-span-2"
                      onClick={() =>
                        patch({
                          vehicles: draft.vehicles.filter(
                            (item) => item.id !== vehicle.id
                          ),
                        })
                      }
                    >
                      Remove vehicle
                    </button>
                  </div>
                ))
              : null}
            {draft.hasVehicles ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={addVehicle}
              >
                Add vehicle
              </button>
            ) : null}
          </div>
        ) : null}

        {step.id === "rentalHistory" ? (
          <div className="space-y-4">
            <h2 className="font-display text-3xl">Rental history</h2>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">
                Have you ever been evicted? <RequiredMark />
              </legend>
              {(["no", "yes"] as const).map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="evicted"
                    className="radio radio-sm"
                    checked={draft.everEvicted === value}
                    onChange={() => patch({ everEvicted: value })}
                  />
                  {value === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">
                Have you ever broken a lease? <RequiredMark />
              </legend>
              {(["no", "yes"] as const).map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="broke"
                    className="radio radio-sm"
                    checked={draft.everBrokeLease === value}
                    onChange={() => patch({ everBrokeLease: value })}
                  />
                  {value === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </fieldset>
            <label className="block">
              <FieldLabel>Additional notes</FieldLabel>
              <textarea
                className="textarea textarea-bordered min-h-24 w-full"
                value={draft.rentalHistoryNotes}
                onChange={(event) =>
                  patch({ rentalHistoryNotes: event.target.value })
                }
              />
            </label>
          </div>
        ) : null}

        {step.id === "references" ? (
          <div className="space-y-4">
            <h2 className="font-display text-3xl">References</h2>
            {draft.references.map((reference, index) => (
              <div
                key={reference.id}
                className="grid gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 p-4 sm:grid-cols-2"
              >
                <label className="block">
                  <FieldLabel required={index === 0}>Name</FieldLabel>
                  <input
                    className="input input-bordered w-full"
                    value={reference.fullName}
                    onChange={(event) => {
                      const references = [...draft.references];
                      references[index] = {
                        ...reference,
                        fullName: event.target.value,
                      };
                      patch({ references });
                    }}
                  />
                </label>
                <label className="block">
                  <FieldLabel required={index === 0}>Relationship</FieldLabel>
                  <input
                    className="input input-bordered w-full"
                    value={reference.relationship}
                    onChange={(event) => {
                      const references = [...draft.references];
                      references[index] = {
                        ...reference,
                        relationship: event.target.value,
                      };
                      patch({ references });
                    }}
                  />
                </label>
                <label className="block">
                  <FieldLabel required={index === 0}>Phone</FieldLabel>
                  <input
                    className="input input-bordered w-full"
                    value={reference.phone}
                    onChange={(event) => {
                      const references = [...draft.references];
                      references[index] = {
                        ...reference,
                        phone: event.target.value,
                      };
                      patch({ references });
                    }}
                  />
                </label>
                <label className="block">
                  <FieldLabel>Email</FieldLabel>
                  <input
                    className="input input-bordered w-full"
                    value={reference.email}
                    onChange={(event) => {
                      const references = [...draft.references];
                      references[index] = {
                        ...reference,
                        email: event.target.value,
                      };
                      patch({ references });
                    }}
                  />
                </label>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={addReference}
            >
              Add reference
            </button>
          </div>
        ) : null}

        {step.id === "screening" ? (
          <div className="space-y-4">
            <h2 className="font-display text-3xl">Screening disclosures</h2>
            <label className="flex items-start gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 p-4 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm mt-0.5"
                checked={draft.authorizeScreening}
                onChange={(event) =>
                  patch({ authorizeScreening: event.target.checked })
                }
              />
              <span>
                <RequiredMark /> I authorize Harborline to obtain consumer
                reports and screening information permitted by law. Sensitive
                identifiers are collected through secure screening channels, not
                this page.
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-[var(--harbor-deep)]/10 p-4 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm mt-0.5"
                checked={draft.acknowledgeFairHousing}
                onChange={(event) =>
                  patch({ acknowledgeFairHousing: event.target.checked })
                }
              />
              <span>
                <RequiredMark /> I acknowledge Harborline follows applicable fair
                housing laws.
              </span>
            </label>
            <label className="block">
              <FieldLabel>Optional disclosure notes</FieldLabel>
              <textarea
                className="textarea textarea-bordered min-h-20 w-full"
                value={draft.disclosureNotes}
                onChange={(event) =>
                  patch({ disclosureNotes: event.target.value })
                }
              />
            </label>
          </div>
        ) : null}

        {step.id === "documents" ? (
          <ApplicationDocumentsUpload
            documents={draft.documents}
            disabled={isSubmitted}
            onChange={(updater) => {
              setValidationError(null);
              updateDraft((current) => ({
                ...current,
                documents: updater(current.documents),
              }));
            }}
          />
        ) : null}

        {step.id === "fee" ? (
          <div className="space-y-4">
            <h2 className="font-display text-3xl">Application fee</h2>
            <div className="rounded-2xl bg-[var(--harbor-sand)]/70 p-4 text-sm">
              <p className="font-semibold">$55 per adult applicant</p>
              <p className="mt-1 text-[var(--harbor-ink)]/65">
                Non-refundable once screening begins. This demo records
                acknowledgment only — no real card or bank numbers are collected.
              </p>
            </div>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm mt-0.5"
                checked={draft.feeAcknowledged}
                onChange={(event) =>
                  patch({ feeAcknowledged: event.target.checked })
                }
              />
              <span>
                <RequiredMark /> I understand the application fee amount and
                terms.
              </span>
            </label>
            <label className="block max-w-md">
              <FieldLabel required>Payment method</FieldLabel>
              <select
                className="select select-bordered w-full"
                value={draft.feePaymentMethod}
                onChange={(event) =>
                  patch({
                    feePaymentMethod: event.target.value as
                      | ""
                      | "card"
                      | "ach-placeholder",
                  })
                }
              >
                <option value="">Select method</option>
                <option value="card">Card (processed offline / mock)</option>
                <option value="ach-placeholder">
                  Bank transfer (details collected securely offline)
                </option>
              </select>
            </label>
          </div>
        ) : null}

        {step.id === "review" ? (
          <div className="space-y-5">
            <h2 className="font-display text-3xl">Review and certification</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ["Property", draft.property],
                ["Unit", draft.floorPlan],
                ["Move-in", draft.desiredMoveInDate],
                ["Applicant", draft.applicantFullName],
                ["Email", draft.email],
                ["Phone", draft.phone],
                ["Income / mo", draft.monthlyIncome],
                [
                  "Household / parties",
                  draft.parties.length === 0
                    ? "Primary only"
                    : draft.parties
                        .map((party) => {
                          const label = getPartyRoleMeta(party.role).shortLabel;
                          return `${party.fullName || "Unnamed"} (${label})`;
                        })
                        .join("; "),
                ],
                ["Pets", draft.hasPets ? String(draft.pets.length) : "None"],
                [
                  "Documents",
                  draft.documents
                    .filter((doc) => doc.status === "success")
                    .map((doc) => doc.fileName)
                    .join(", ") || "None",
                ],
                ["Fee method", draft.feePaymentMethod || "Not selected"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-[var(--harbor-sand)]/55 p-4"
                >
                  <dt className="text-xs uppercase tracking-wide opacity-50">
                    {label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm mt-0.5"
                checked={draft.certifyAccuracy}
                onChange={(event) =>
                  patch({ certifyAccuracy: event.target.checked })
                }
              />
              <span>
                <RequiredMark /> I certify the information in this application is
                true and complete.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm mt-0.5"
                checked={draft.certifyAuthorization}
                onChange={(event) =>
                  patch({ certifyAuthorization: event.target.checked })
                }
              />
              <span>
                <RequiredMark /> I authorize Harborline to process this
                application and related screening.
              </span>
            </label>
            <label className="block max-w-md">
              <FieldLabel required>Type your full name to sign</FieldLabel>
              <input
                className="input input-bordered w-full"
                value={draft.signatureName}
                onChange={(event) =>
                  patch({ signatureName: event.target.value })
                }
              />
            </label>
          </div>
        ) : null}

        {step.id === "confirmation" || isSubmitted ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--harbor-mid)]" />
            <h2 className="font-display text-4xl">Application submitted</h2>
            <p className="text-[var(--harbor-ink)]/65">
              Thank you, {draft.applicantFullName || "applicant"}. Your
              confirmation number is:
            </p>
            <p className="font-display text-3xl tracking-wide text-[var(--harbor-ink)]">
              {draft.confirmationNumber || "Pending"}
            </p>
            <p className="text-sm text-[var(--harbor-ink)]/55">
              Save this number for your records. A leasing specialist will follow
              up using your preferred contact method.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Link href="/portal/applications" className="btn btn-neutral">
                View application status
              </Link>
              <Link href="/portal/profile" className="btn btn-outline">
                Applicant profile
              </Link>
              <button type="button" className="btn btn-ghost" onClick={startNew}>
                Start another application
              </button>
            </div>
          </div>
        ) : null}

        {!isSubmitted && step.id !== "confirmation" ? (
          <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-[var(--harbor-deep)]/10 pt-5">
            <button
              type="button"
              className="btn btn-ghost gap-2"
              onClick={goBack}
              disabled={draft.stepIndex === 0}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              className="btn btn-neutral gap-2"
              onClick={goNext}
            >
              {step.id === "review" ? "Submit application" : "Next"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function RentalApplicationWizard() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" aria-label="Loading rental application">
          <div className="skeleton h-36 w-full rounded-3xl" />
          <div className="skeleton h-80 w-full rounded-3xl" />
        </div>
      }
    >
      <WizardInner />
    </Suspense>
  );
}
