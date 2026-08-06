"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Plus, Sparkles, Trash2 } from "lucide-react";
import { OwnerAlert } from "@/components/OwnerAlert";
import {
  ownerApply,
  type OwnerAuthState,
} from "@/app/owners/actions";
import {
  COMMERCIAL_PROPERTY_TYPES,
  CURRENT_MANAGEMENT_OPTIONS,
  MANAGEMENT_SERVICES,
  demoOwnerApplicationEntity,
  demoOwnerApplicationProperties,
  emptyOwnerApplicationProperty,
  type OwnerApplicationProperty,
} from "@/lib/owner-application-intake";

const initialState: OwnerAuthState = {};

type PropertyRow = OwnerApplicationProperty & { id: string };

function newPropertyRow(): PropertyRow {
  return { id: crypto.randomUUID(), ...emptyOwnerApplicationProperty() };
}

function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block w-full ${className}`}>
      <span className="owner-label">
        {label}
        {hint ? <span className="opacity-50"> · {hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function Section({
  title,
  blurb,
  children,
  defaultOpen = true,
}: {
  title: string;
  blurb?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-2xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/35"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <div>
          <p className="font-semibold text-[var(--harbor-ink)]">{title}</p>
          {blurb ? <p className="owner-muted mt-0.5 text-xs">{blurb}</p> : null}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </summary>
      <div className="space-y-3 border-t border-[var(--harbor-deep)]/10 px-4 py-4">
        {children}
      </div>
    </details>
  );
}

export function OwnerApplicationForm({
  defaultFullName,
  defaultEmail,
  lockedEmail = false,
}: {
  defaultFullName?: string;
  defaultEmail?: string;
  lockedEmail?: boolean;
}) {
  const [properties, setProperties] = useState<PropertyRow[]>([newPropertyRow()]);
  const [openPropertyId, setOpenPropertyId] = useState<string | null>(
    properties[0]?.id ?? null
  );
  const [state, action, pending] = useActionState(ownerApply, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  function setNamedField(name: string, value: string | boolean) {
    const form = formRef.current;
    if (!form) return;
    const el = form.elements.namedItem(name);
    if (el instanceof HTMLInputElement) {
      if (el.type === "checkbox") {
        el.checked = Boolean(value);
      } else if (!el.readOnly) {
        el.value = String(value);
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      el.value = String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function generateAllFields() {
    const demo = demoOwnerApplicationEntity({
      fullName: defaultFullName,
      email: defaultEmail,
    });

    setNamedField("fullName", demo.fullName);
    if (!lockedEmail) setNamedField("email", demo.email);
    setNamedField("phone", demo.phone);
    setNamedField("preferredContactMethod", demo.preferredContactMethod);
    setNamedField("companyName", demo.companyName);
    setNamedField("entityType", demo.entityType);
    setNamedField("taxIdOrEin", demo.taxIdOrEin);
    setNamedField("mailingAddress", demo.mailingAddress);
    setNamedField("emergencyContactName", demo.emergencyContactName);
    setNamedField("emergencyContactPhone", demo.emergencyContactPhone);
    setNamedField("communicationPreference", demo.communicationPreference);
    setNamedField("ownershipProofAvailable", demo.ownershipProofAvailable);
    setNamedField("rentRollAvailable", demo.rentRollAvailable);
    setNamedField("leasesAvailable", demo.leasesAvailable);
    setNamedField("insuranceDocsAvailable", demo.insuranceDocsAvailable);
    setNamedField("bankingReady", demo.bankingReady);
    setNamedField("documentsReadyNotes", demo.documentsReadyNotes);
    setNamedField("message", demo.message);

    const rows: PropertyRow[] = demoOwnerApplicationProperties().map((p) => ({
      id: crypto.randomUUID(),
      ...p,
    }));
    setProperties(rows);
    setOpenPropertyId(rows[0]?.id ?? null);
  }

  function updateProperty<K extends keyof OwnerApplicationProperty>(
    id: string,
    key: K,
    value: OwnerApplicationProperty[K]
  ) {
    setProperties((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );
  }

  function toggleService(id: string, service: string) {
    setProperties((rows) =>
      rows.map((row) => {
        if (row.id !== id) return row;
        const has = row.servicesRequested.includes(service);
        return {
          ...row,
          servicesRequested: has
            ? row.servicesRequested.filter((s) => s !== service)
            : [...row.servicesRequested, service],
        };
      })
    );
  }

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-[var(--harbor-deep)]/25 bg-[var(--harbor-mist)]/30 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[var(--harbor-ink)]">
            Demo shortcut
          </p>
          <p className="owner-muted text-xs">
            Fills entity, documents, notes, and two sample commercial properties.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--harbor-ink)] px-4 text-sm font-semibold text-[var(--harbor-sand)] hover:opacity-90"
          onClick={generateAllFields}
        >
          <Sparkles className="h-4 w-4" />
          Generate all fields
        </button>
      </div>

      <Section
        title="1. Ownership entity & contacts"
        blurb="Legal ownership details Harborline needs for contracting, tax reporting, and day-to-day communication."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full legal name (signatory)">
            <input
              name="fullName"
              className="owner-input"
              placeholder="Alex Rivera"
              defaultValue={defaultFullName}
              required
            />
          </Field>
          <Field label="Email">
            <input
              name="email"
              type="email"
              className="owner-input"
              placeholder="owner@example.com"
              defaultValue={defaultEmail}
              readOnly={lockedEmail}
              required
            />
          </Field>
          <Field label="Primary phone">
            <input
              name="phone"
              className="owner-input"
              placeholder="(615) 555-0100"
            />
          </Field>
          <Field label="Preferred contact method">
            <select name="preferredContactMethod" className="owner-input" defaultValue="email">
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="text">Text</option>
              <option value="portal">Owner portal only</option>
            </select>
          </Field>
          <Field label="Ownership entity legal name" className="sm:col-span-2">
            <input
              name="companyName"
              className="owner-input"
              placeholder="Summit Residential Partners LLC"
              required
            />
          </Field>
          <Field label="Entity type">
            <select name="entityType" className="owner-input" defaultValue="LLC">
              <option value="LLC">LLC</option>
              <option value="LP">LP</option>
              <option value="Corporation">Corporation</option>
              <option value="Trust">Trust</option>
              <option value="Individual">Individual</option>
              <option value="Other">Other</option>
            </select>
          </Field>
          <Field label="EIN / Tax ID" hint="optional">
            <input
              name="taxIdOrEin"
              className="owner-input"
              placeholder="XX-XXXXXXX"
            />
          </Field>
          <Field label="Mailing address for notices" className="sm:col-span-2">
            <input
              name="mailingAddress"
              className="owner-input"
              placeholder="1200 Commerce St, Suite 400, Nashville, TN 37203"
            />
          </Field>
          <Field label="Emergency contact name">
            <input
              name="emergencyContactName"
              className="owner-input"
              placeholder="Jordan Hale"
            />
          </Field>
          <Field label="Emergency contact phone">
            <input
              name="emergencyContactPhone"
              className="owner-input"
              placeholder="(615) 555-0199"
            />
          </Field>
          <Field label="Communication preference" className="sm:col-span-2">
            <select
              name="communicationPreference"
              className="owner-input"
              defaultValue="monthly_summary"
            >
              <option value="hands_off">Hands-off — monthly summary only</option>
              <option value="monthly_summary">Monthly summary + exceptions</option>
              <option value="weekly_updates">Weekly operational updates</option>
              <option value="high_touch">High-touch — approve most decisions</option>
            </select>
          </Field>
        </div>
      </Section>

      <Section
        title="2. Onboarding documents checklist"
        blurb="Tell us what you can provide now. Missing items slow diligence but do not block submitting the application."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["ownershipProofAvailable", "Deed / proof of ownership available"],
            ["rentRollAvailable", "Current rent roll available"],
            ["leasesAvailable", "Active leases / amendments available"],
            ["insuranceDocsAvailable", "Owner COI / insurance declarations available"],
            ["bankingReady", "Banking / distribution instructions ready"],
          ].map(([name, label]) => (
            <label
              key={name}
              className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--harbor-deep)]/10 bg-white/70 px-3 text-sm"
            >
              <input type="checkbox" name={name} className="checkbox checkbox-sm" />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <Field label="Document notes" hint="what you still need to gather">
          <textarea
            name="documentsReadyNotes"
            className="owner-input min-h-20 py-3"
            placeholder="e.g. CAM reconciliations for last 2 years coming next week; elevator warranty with prior manager."
          />
        </Field>
      </Section>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-[var(--harbor-ink)]">
              3. Commercial properties
            </h2>
            <p className="owner-muted text-xs">
              Harborline manages commercial assets only (office, retail,
              industrial, mixed-use, multifamily). Short-term / individual
              vacation rentals are not accepted.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-[var(--harbor-mid)] hover:bg-[var(--harbor-mist)]/50"
            onClick={() => {
              const row = newPropertyRow();
              setProperties((rows) => [...rows, row]);
              setOpenPropertyId(row.id);
            }}
          >
            <Plus className="h-4 w-4" />
            Add property
          </button>
        </div>

        {properties.map((property, index) => {
          const open = openPropertyId === property.id;
          return (
            <div
              key={property.id}
              className="overflow-hidden rounded-2xl border border-[var(--harbor-deep)]/15 bg-white/90 shadow-sm"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                onClick={() =>
                  setOpenPropertyId(open ? null : property.id)
                }
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-55">
                    Property {index + 1}
                  </p>
                  <p className="font-semibold text-[var(--harbor-ink)]">
                    {property.propertyName ||
                      property.streetAddress ||
                      "Untitled commercial asset"}
                  </p>
                  <p className="owner-muted text-xs">
                    {[
                      property.category,
                      property.city && property.state
                        ? `${property.city}, ${property.state}`
                        : "",
                      property.rentableSf ? `${property.rentableSf} SF` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Complete the intake sections below"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {properties.length > 1 ? (
                    <span
                      role="button"
                      tabIndex={0}
                      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProperties((rows) =>
                          rows.filter((row) => row.id !== property.id)
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          setProperties((rows) =>
                            rows.filter((row) => row.id !== property.id)
                          );
                        }
                      }}
                      aria-label={`Remove property ${index + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                  <ChevronDown
                    className={`h-4 w-4 opacity-50 transition ${open ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {open ? (
                <div className="space-y-4 border-t border-[var(--harbor-deep)]/10 px-4 py-4">
                  <Section
                    title="Asset identity"
                    blurb="Where is the property and how should Harborline refer to it?"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Property name" className="sm:col-span-2">
                        <input
                          className="owner-input"
                          value={property.propertyName}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "propertyName",
                              e.target.value
                            )
                          }
                          placeholder="Meridian Tower"
                          required
                        />
                      </Field>
                      <Field label="Commercial type">
                        <select
                          className="owner-input"
                          value={property.category}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "category",
                              e.target.value as OwnerApplicationProperty["category"]
                            )
                          }
                          required
                        >
                          <option value="">Select type</option>
                          {COMMERCIAL_PROPERTY_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Parcel / tax ID">
                        <input
                          className="owner-input"
                          value={property.parcelTaxId}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "parcelTaxId",
                              e.target.value
                            )
                          }
                          placeholder="Assessor parcel #"
                        />
                      </Field>
                      <Field label="Street address" className="sm:col-span-2">
                        <input
                          className="owner-input"
                          value={property.streetAddress}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "streetAddress",
                              e.target.value
                            )
                          }
                          placeholder="500 Meridian Plaza"
                          required
                        />
                      </Field>
                      <Field label="City">
                        <input
                          className="owner-input"
                          value={property.city}
                          onChange={(e) =>
                            updateProperty(property.id, "city", e.target.value)
                          }
                          placeholder="Chicago"
                          required
                        />
                      </Field>
                      <Field label="State">
                        <input
                          className="owner-input"
                          value={property.state}
                          onChange={(e) =>
                            updateProperty(property.id, "state", e.target.value)
                          }
                          placeholder="IL"
                          required
                        />
                      </Field>
                      <Field label="ZIP">
                        <input
                          className="owner-input"
                          value={property.zip}
                          onChange={(e) =>
                            updateProperty(property.id, "zip", e.target.value)
                          }
                          placeholder="60601"
                        />
                      </Field>
                      <Field label="County">
                        <input
                          className="owner-input"
                          value={property.county}
                          onChange={(e) =>
                            updateProperty(property.id, "county", e.target.value)
                          }
                          placeholder="Cook"
                        />
                      </Field>
                    </div>
                  </Section>

                  <Section
                    title="Physical plant & size"
                    blurb="Building metrics used for staffing, vendor bids, and fee proposals."
                    defaultOpen={false}
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      {(
                        [
                          ["yearBuilt", "Year built", "1998"],
                          ["yearRenovated", "Year renovated", "2022"],
                          ["buildings", "# buildings", "1"],
                          ["floors", "# floors", "12"],
                          ["unitsSuites", "Units / suites", "48"],
                          ["grossSf", "Gross SF", "120000"],
                          ["rentableSf", "Rentable SF", "108000"],
                          ["parkingSpaces", "Parking spaces", "210"],
                          ["zoning", "Zoning", "C-2"],
                          ["roofAgeYears", "Roof age (years)", "8"],
                        ] as const
                      ).map(([key, label, ph]) => (
                        <Field key={key} label={label}>
                          <input
                            className="owner-input"
                            value={property[key]}
                            onChange={(e) =>
                              updateProperty(property.id, key, e.target.value)
                            }
                            placeholder={ph}
                          />
                        </Field>
                      ))}
                      <Field label="Elevator">
                        <select
                          className="owner-input"
                          value={property.elevator}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "elevator",
                              e.target.value as OwnerApplicationProperty["elevator"]
                            )
                          }
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="unknown">Unknown</option>
                        </select>
                      </Field>
                      <Field label="Fire sprinkler">
                        <select
                          className="owner-input"
                          value={property.fireSprinkler}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "fireSprinkler",
                              e.target.value as OwnerApplicationProperty["fireSprinkler"]
                            )
                          }
                        >
                          <option value="">Unknown</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                          <option value="unknown">Unknown</option>
                        </select>
                      </Field>
                      <Field label="Amenities" className="sm:col-span-3">
                        <textarea
                          className="owner-input min-h-16 py-3"
                          value={property.amenities}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "amenities",
                              e.target.value
                            )
                          }
                          placeholder="Lobby, fitness, conference rooms, loading dock…"
                        />
                      </Field>
                    </div>
                  </Section>

                  <Section
                    title="Financial & operating metrics"
                    blurb="Numbers a management company underwrites before proposing a fee and staffing plan."
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      {(
                        [
                          ["occupancyPercent", "Occupancy %", "82"],
                          ["tenantCount", "Tenant count", "36"],
                          ["monthlyRentRoll", "Monthly rent roll ($)", "312000"],
                          ["annualGpr", "Annual GPR ($)", "3744000"],
                          ["annualOperatingExpenses", "Annual OpEx ($)", "2250000"],
                          ["annualNoi", "Annual NOI ($)", "1494000"],
                          ["arBalance", "AR balance ($)", "18400"],
                          ["securityDepositsHeld", "Security deposits held ($)", "92000"],
                          ["reserveBalance", "Reserve balance ($)", "125000"],
                        ] as const
                      ).map(([key, label, ph]) => (
                        <Field key={key} label={label}>
                          <input
                            className="owner-input"
                            value={property[key]}
                            onChange={(e) =>
                              updateProperty(property.id, key, e.target.value)
                            }
                            placeholder={ph}
                          />
                        </Field>
                      ))}
                      <Field label="Lease structure (CAM / NNN / Gross)" className="sm:col-span-3">
                        <input
                          className="owner-input"
                          value={property.camOrNnnStructure}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "camOrNnnStructure",
                              e.target.value
                            )
                          }
                          placeholder="NNN with annual CAM reconciliation"
                        />
                      </Field>
                    </div>
                  </Section>

                  <Section
                    title="Tenancy, leasing & current management"
                    blurb="Lease rollover risk and why you are seeking Harborline."
                    defaultOpen={false}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Current management">
                        <select
                          className="owner-input"
                          value={property.currentManagement}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "currentManagement",
                              e.target.value
                            )
                          }
                        >
                          <option value="">Select</option>
                          {CURRENT_MANAGEMENT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Avg lease term (years)">
                        <input
                          className="owner-input"
                          value={property.avgLeaseTermYears}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "avgLeaseTermYears",
                              e.target.value
                            )
                          }
                          placeholder="5"
                        />
                      </Field>
                      <Field label="% of leases expiring in 12 months">
                        <input
                          className="owner-input"
                          value={property.percentLeasesExpiring12mo}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "percentLeasesExpiring12mo",
                              e.target.value
                            )
                          }
                          placeholder="18"
                        />
                      </Field>
                      <Field label="Major lease expirations" className="sm:col-span-2">
                        <textarea
                          className="owner-input min-h-16 py-3"
                          value={property.majorLeaseExpirations}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "majorLeaseExpirations",
                              e.target.value
                            )
                          }
                          placeholder="Floor 8 (Acme Co) expires Jun 2027; Suite 210 month-to-month…"
                        />
                      </Field>
                      <Field label="Why change managers / seek management?" className="sm:col-span-2">
                        <textarea
                          className="owner-input min-h-20 py-3"
                          value={property.reasonForChange}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "reasonForChange",
                              e.target.value
                            )
                          }
                          placeholder="Need stronger leasing velocity, cleaner owner reporting, and CapEx planning."
                        />
                      </Field>
                    </div>
                  </Section>

                  <Section
                    title="Systems, vendors, access & insurance"
                    blurb="Operational handoff details that prevent surprises on day one."
                    defaultOpen={false}
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="HVAC / mechanical notes" className="sm:col-span-2">
                        <textarea
                          className="owner-input min-h-16 py-3"
                          value={property.hvacNotes}
                          onChange={(e) =>
                            updateProperty(property.id, "hvacNotes", e.target.value)
                          }
                          placeholder="Two RTUs replaced 2024; BAS vendor is Siemens…"
                        />
                      </Field>
                      <Field label="Known issues / deferred maintenance" className="sm:col-span-2">
                        <textarea
                          className="owner-input min-h-16 py-3"
                          value={property.knownIssues}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "knownIssues",
                              e.target.value
                            )
                          }
                          placeholder="Parking deck membrane soft spots; elevator #2 intermittent faults."
                        />
                      </Field>
                      <Field label="Preferred / incumbent vendors" className="sm:col-span-2">
                        <textarea
                          className="owner-input min-h-16 py-3"
                          value={property.preferredVendors}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "preferredVendors",
                              e.target.value
                            )
                          }
                          placeholder="HVAC: Delta Mechanical · Janitorial: ClearPath · Fire: Metro Life Safety"
                        />
                      </Field>
                      <Field label="Utilities (owner vs tenant paid)" className="sm:col-span-2">
                        <textarea
                          className="owner-input min-h-16 py-3"
                          value={property.utilityNotes}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "utilityNotes",
                              e.target.value
                            )
                          }
                          placeholder="Owner pays common-area electric & water; tenants separately metered for suite power."
                        />
                      </Field>
                      <Field label="Access / keys / codes / after-hours" className="sm:col-span-2">
                        <textarea
                          className="owner-input min-h-16 py-3"
                          value={property.accessNotes}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "accessNotes",
                              e.target.value
                            )
                          }
                          placeholder="Master key with on-site; alarm code with Allied; loading dock fob program…"
                        />
                      </Field>
                      <Field label="Insurance carrier">
                        <input
                          className="owner-input"
                          value={property.insuranceCarrier}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "insuranceCarrier",
                              e.target.value
                            )
                          }
                          placeholder="Harbor First Assurance"
                        />
                      </Field>
                      <Field label="Coverage amount">
                        <input
                          className="owner-input"
                          value={property.insuranceCoverageAmount}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "insuranceCoverageAmount",
                              e.target.value
                            )
                          }
                          placeholder="$5M building / $2M liability"
                        />
                      </Field>
                      <Field label="Policy expiration">
                        <input
                          type="date"
                          className="owner-input"
                          value={property.insuranceExpiration}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "insuranceExpiration",
                              e.target.value
                            )
                          }
                        />
                      </Field>
                      <Field label="Claims history notes">
                        <input
                          className="owner-input"
                          value={property.claimsHistoryNotes}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "claimsHistoryNotes",
                              e.target.value
                            )
                          }
                          placeholder="No open claims; water claim closed 2023"
                        />
                      </Field>
                    </div>
                  </Section>

                  <Section
                    title="Goals & services requested"
                    blurb="What success looks like and which Harborline functions you want engaged."
                  >
                    <div className="space-y-3">
                      <Field label="Owner goals for this asset">
                        <textarea
                          className="owner-input min-h-20 py-3"
                          value={property.ownerGoals}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "ownerGoals",
                              e.target.value
                            )
                          }
                          placeholder="Stabilize occupancy above 90%, reduce OpEx 5%, prepare for refinance in 24 months."
                        />
                      </Field>
                      <div>
                        <p className="owner-label mb-2">Services requested</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {MANAGEMENT_SERVICES.map((s) => (
                            <label
                              key={s.value}
                              className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--harbor-deep)]/10 bg-white/70 px-3 text-sm"
                            >
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={property.servicesRequested.includes(
                                  s.value
                                )}
                                onChange={() =>
                                  toggleService(property.id, s.value)
                                }
                              />
                              <span>{s.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <Field label="Near-term capital plans">
                        <textarea
                          className="owner-input min-h-16 py-3"
                          value={property.capitalPlans}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "capitalPlans",
                              e.target.value
                            )
                          }
                          placeholder="Lobby refresh Q4; roof overlay budgeted next FY."
                        />
                      </Field>
                      <Field label="Special instructions for Harborline">
                        <textarea
                          className="owner-input min-h-16 py-3"
                          value={property.specialInstructions}
                          onChange={(e) =>
                            updateProperty(
                              property.id,
                              "specialInstructions",
                              e.target.value
                            )
                          }
                          placeholder="Owner approval required above $2,500; no weekend construction without notice."
                        />
                      </Field>
                    </div>
                  </Section>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <Section
        title="4. Additional notes for Harborline"
        blurb="Anything else management should know before diligence starts."
        defaultOpen={false}
      >
        <textarea
          name="message"
          className="owner-input min-h-24 py-3"
          placeholder="Portfolio strategy, lender requirements, preferred fee structure, timing for takeover…"
        />
      </Section>

      <input
        type="hidden"
        name="propertiesJson"
        value={JSON.stringify(
          properties.map(({ id: _id, ...rest }) => rest)
        )}
      />

      {state.error ? <OwnerAlert variant="error">{state.error}</OwnerAlert> : null}

      <button
        type="submit"
        className="owner-btn-primary w-full sm:w-auto"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Submitting…" : "Submit commercial management application"}
      </button>
    </form>
  );
}
