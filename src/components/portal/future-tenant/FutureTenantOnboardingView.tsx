"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Home,
  LayoutDashboard,
  LoaderCircle,
  MessagesSquare,
  PawPrint,
  ScrollText,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalSection } from "@/components/portal/PortalSection";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import { useFutureTenantOnboarding } from "@/hooks/useFutureTenantOnboarding";
import type { PortalTenantSession } from "@/lib/portal/auth";
import {
  ALLOWED_FUTURE_UPLOAD_TYPES,
  FUTURE_TENANT_STAGE_LABELS,
  FUTURE_TENANT_STAGES,
  MAX_FUTURE_UPLOAD_BYTES,
  type ChecklistItemStatus,
  type FutureChargeStatus,
  type FutureTenantStage,
} from "@/lib/portal/future-tenant-types";
import { markFutureTenantConverted } from "@/lib/portal/future-tenant-store";
import { convertFutureTenantToCurrentAction } from "@/app/portal/future-tenant-actions";
import { PORTAL_DEMO_SESSION_STORAGE_KEY } from "@/lib/portal/portal-demo-auth";

type Section =
  | "progress"
  | "documents"
  | "lease"
  | "payments"
  | "scheduling"
  | "checklist"
  | "utilities"
  | "household"
  | "movein"
  | "messages";

const SECTIONS: {
  id: Section;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "progress", label: "Move-in progress", icon: LayoutDashboard },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "lease", label: "Lease review", icon: ScrollText },
  { id: "payments", label: "Pre-move-in payments", icon: CircleDollarSign },
  { id: "scheduling", label: "Move-in scheduling", icon: CalendarDays },
  { id: "checklist", label: "Pre-move-in checklist", icon: ClipboardCheck },
  { id: "utilities", label: "Utilities & insurance", icon: Zap },
  { id: "household", label: "Household confirmation", icon: PawPrint },
  { id: "movein", label: "Move-in information", icon: Home },
  { id: "messages", label: "Ask leasing", icon: MessagesSquare },
];

const MESSAGE_TOPICS = [
  "Lease documents",
  "Required payments",
  "Missing documents",
  "Insurance",
  "Utilities",
  "Move-in scheduling",
  "Keys and building access",
] as const;

function statusTone(status: ChecklistItemStatus | FutureChargeStatus | string) {
  if (status === "approved" || status === "paid" || status === "waived")
    return "success" as const;
  if (status === "under_review" || status === "processing")
    return "info" as const;
  if (status === "rejected" || status === "declined") return "danger" as const;
  if (status === "due" || status === "required" || status === "not_submitted")
    return "warning" as const;
  return "neutral" as const;
}

function labelStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function validateUpload(file: File): string | null {
  if (!ALLOWED_FUTURE_UPLOAD_TYPES.includes(file.type)) {
    return "Only PDF, JPEG, PNG, or WebP files are allowed.";
  }
  if (file.size > MAX_FUTURE_UPLOAD_BYTES) {
    return "File must be 5 MB or smaller.";
  }
  return null;
}

type Props = {
  session: PortalTenantSession;
};

export function FutureTenantOnboardingView({ session }: Props) {
  const navId = useId();
  const [section, setSection] = useState<Section>("progress");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { data, loading, update } = useFutureTenantOnboarding(session);
  const [banner, setBanner] = useState<{
    tone: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [payBusyId, setPayBusyId] = useState<string | null>(null);
  const [transitionBusy, setTransitionBusy] = useState(false);
  const [mgmtConfirm, setMgmtConfirm] = useState(false);
  const [msgTopic, setMsgTopic] = useState<(typeof MESSAGE_TOPICS)[number]>(
    MESSAGE_TOPICS[0]
  );
  const [msgBody, setMsgBody] = useState("");
  const [messages, setMessages] = useState<
    Array<{ id: string; topic: string; body: string; at: string }>
  >([]);

  const stageIndex = useMemo(() => {
    if (!data) return 0;
    return FUTURE_TENANT_STAGES.indexOf(data.currentStage);
  }, [data]);

  if (loading || !data) {
    return (
      <div
        className="flex min-h-[12rem] items-center justify-center gap-2 text-[var(--harbor-muted)]"
        role="status"
      >
        <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />
        Loading move-in progress…
      </div>
    );
  }

  if (data.lifecycle === "current") {
    return (
      <PortalCard>
        <PortalSection
          title="You’re now a current tenant"
          description="Pre-move-in actions are complete. Open the current-tenant dashboard for rent, maintenance, and ongoing lease tools."
        >
          <a href="/portal" className="btn btn-primary">
            Go to tenant dashboard
          </a>
        </PortalSection>
      </PortalCard>
    );
  }

  const flash = (
    tone: "success" | "error" | "info",
    text: string
  ) => {
    setBanner({ tone, text });
    window.setTimeout(() => setBanner(null), 5000);
  };

  const onUploadDoc = (docId: string, file: File | undefined) => {
    if (!file) return;
    const err = validateUpload(file);
    if (err) {
      flash("error", err);
      return;
    }
    update((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === docId
          ? {
              ...d,
              status: "under_review" as const,
              fileName: file.name,
              uploadedAt: new Date().toISOString().slice(0, 10),
              rejectionReason: null,
            }
          : d
      ),
    }));
    flash("success", `${file.name} uploaded and marked under review.`);
  };

  const onPay = async (chargeId: string, forceDecline = false) => {
    const charge = data.charges.find((c) => c.id === chargeId);
    if (!charge) return;
    if (charge.status === "paid" || charge.status === "waived") {
      flash("error", "This charge is already settled (duplicate payment blocked).");
      return;
    }
    setPayBusyId(chargeId);
    update((prev) => ({
      ...prev,
      charges: prev.charges.map((c) =>
        c.id === chargeId ? { ...c, status: "processing" as const } : c
      ),
    }));
    await new Promise((r) => setTimeout(r, 700));
    if (forceDecline) {
      update((prev) => ({
        ...prev,
        charges: prev.charges.map((c) =>
          c.id === chargeId ? { ...c, status: "declined" as const } : c
        ),
      }));
      setPayBusyId(null);
      flash("error", "Payment declined. Try another method or contact leasing.");
      return;
    }
    const receiptId = `rcpt-${chargeId}-${Date.now().toString(36)}`;
    update((prev) => ({
      ...prev,
      charges: prev.charges.map((c) =>
        c.id === chargeId
          ? { ...c, status: "paid" as const, receiptId }
          : c
      ),
    }));
    setPayBusyId(null);
    flash("success", `Payment successful. Receipt ${receiptId}.`);
  };

  const confirmAppointment = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = String(fd.get("date") || "");
    const time = String(fd.get("time") || "");
    const keyPickup = fd.get("keyPickup") === "on";
    if (!date || !time) {
      flash("error", "Choose a move-in date and time.");
      return;
    }
    update((prev) => ({
      ...prev,
      appointment: {
        ...prev.appointment,
        requestedDate: date,
        requestedTime: time,
        confirmedDate: date,
        confirmedTime: time,
        keyPickupConfirmed: keyPickup,
        changeRequested: false,
        changeStatus: "none",
      },
    }));
    flash("success", "Move-in appointment confirmed.");
  };

  const requestScheduleChange = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const reason = String(fd.get("reason") || "").trim();
    if (!reason) {
      flash("error", "Explain why you need a schedule change.");
      return;
    }
    update((prev) => ({
      ...prev,
      appointment: {
        ...prev.appointment,
        changeRequested: true,
        changeReason: reason,
        changeStatus: "pending_approval",
      },
    }));
    flash("info", "Schedule change submitted for management approval.");
  };

  const confirmHousehold = () => {
    update((prev) => ({
      ...prev,
      household: { ...prev.household, confirmed: true },
    }));
    flash("success", "Household information confirmed.");
  };

  const requestHouseholdChange = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const request = String(fd.get("change") || "").trim();
    if (!request) {
      flash("error", "Describe the change you need management to review.");
      return;
    }
    update((prev) => ({
      ...prev,
      household: {
        ...prev.household,
        changeRequest: request,
        changeStatus: "pending_approval",
      },
    }));
    flash("info", "Change request sent. Approved lease details were not overwritten.");
  };

  const confirmUtility = (id: string, note: string) => {
    update((prev) => ({
      ...prev,
      utilities: prev.utilities.map((u) =>
        u.id === id
          ? { ...u, confirmed: true, confirmationNote: note || u.confirmationNote }
          : u
      ),
    }));
    flash("success", "Utility confirmation saved.");
  };

  const uploadInsurance = (file: File | undefined) => {
    if (!file) return;
    const err = validateUpload(file);
    if (err) {
      flash("error", err);
      return;
    }
    update((prev) => ({
      ...prev,
      insurance: {
        ...prev.insurance,
        status: "under_review",
        fileName: file.name,
        rejectionReason: null,
      },
      documents: prev.documents.map((d) =>
        d.kind === "renters_insurance"
          ? {
              ...d,
              status: "under_review" as const,
              fileName: file.name,
              uploadedAt: new Date().toISOString().slice(0, 10),
              rejectionReason: null,
            }
          : d
      ),
    }));
    flash("success", "Proof of insurance uploaded for review.");
  };

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!msgBody.trim()) {
      flash("error", "Enter a message.");
      return;
    }
    setMessages((prev) => [
      {
        id: `msg-${Date.now()}`,
        topic: msgTopic,
        body: msgBody.trim(),
        at: new Date().toISOString(),
      },
      ...prev,
    ]);
    setMsgBody("");
    flash("success", "Message sent to leasing (pre-move-in topics only).");
  };

  const tryTransition = async () => {
    if (data.outstandingRequirements.length > 0) {
      flash(
        "error",
        `Cannot transition yet. Still required: ${data.outstandingRequirements.join(", ")}`
      );
      return;
    }
    setTransitionBusy(true);
    try {
      const result = await convertFutureTenantToCurrentAction({
        leaseStartDate: data.leaseStartDate,
        readinessComplete: data.outstandingRequirements.length === 0,
        managementConfirmed: mgmtConfirm,
      });
      if (!result.ok) {
        flash("error", result.message);
        return;
      }
      markFutureTenantConverted(session.userId);
      try {
        const raw = window.sessionStorage.getItem(PORTAL_DEMO_SESSION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as PortalTenantSession;
          window.sessionStorage.setItem(
            PORTAL_DEMO_SESSION_STORAGE_KEY,
            JSON.stringify({ ...parsed, lifecycle: "current" })
          );
        }
      } catch {
        /* ignore */
      }
      update((prev) => ({ ...prev, lifecycle: "current" }));
      flash("success", "Role updated to current tenant. Welcome home.");
    } catch (err) {
      flash(
        "error",
        err instanceof Error ? err.message : "Transition failed."
      );
    } finally {
      setTransitionBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <button
          type="button"
          className="btn btn-outline btn-sm w-full lg:hidden"
          aria-expanded={mobileNavOpen}
          aria-controls={navId}
          onClick={() => setMobileNavOpen((o) => !o)}
        >
          {mobileNavOpen ? "Hide sections" : "Show sections"}
        </button>
        <nav
          id={navId}
          aria-label="Future tenant move-in"
          className={`${mobileNavOpen ? "block" : "hidden"} lg:block`}
        >
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--harbor-ink)]/45">
            Future tenant
          </p>
          <ul className="space-y-1">
            {SECTIONS.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSection(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--harbor-mid)] ${
                      active
                        ? "bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                        : "text-[var(--harbor-ink)]/80 hover:bg-[var(--harbor-mist)]/70"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className="min-w-0 space-y-4">
        {banner ? (
          <div
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm ${
              banner.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : banner.tone === "error"
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-sky-200 bg-sky-50 text-sky-900"
            }`}
          >
            {banner.text}
          </div>
        ) : null}

        {section === "progress" ? (
          <div className="space-y-4">
            <PortalCard>
              <PortalSection
                title="Move-in readiness"
                description={`${data.propertyLabel} · Unit ${data.unit}`}
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="Current stage" value={FUTURE_TENANT_STAGE_LABELS[data.currentStage]} />
                  <Stat label="Lease start" value={data.leaseStartDate} />
                  <Stat
                    label="Confirmed move-in"
                    value={
                      data.appointment.confirmedDate
                        ? `${data.appointment.confirmedDate} ${data.appointment.confirmedTime ?? ""}`
                        : "Not confirmed"
                    }
                  />
                  <Stat
                    label="Readiness"
                    value={`${data.readinessPercent}%`}
                  />
                </div>
                <div className="mt-4 rounded-xl bg-[var(--harbor-mist)]/50 p-4">
                  <p className="text-sm font-medium text-[var(--harbor-ink)]">
                    Next required action
                  </p>
                  <p className="mt-1 text-[var(--harbor-muted)]">{data.nextAction}</p>
                </div>
              </PortalSection>
            </PortalCard>

            <PortalCard>
              <PortalSection title="Progress tracker" description="Nine stages from approval to move-in day.">
                <ol className="space-y-2">
                  {FUTURE_TENANT_STAGES.map((stage, index) => {
                    const done = data.completedStages.includes(stage);
                    const current = data.currentStage === stage;
                    return (
                      <li
                        key={stage}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                          current
                            ? "border-[var(--harbor-mid)] bg-[var(--harbor-sand)]/40"
                            : "border-[var(--harbor-deep)]/10"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                            done
                              ? "bg-emerald-600 text-white"
                              : current
                                ? "bg-[var(--harbor-ink)] text-white"
                                : "bg-[var(--harbor-mist)] text-[var(--harbor-muted)]"
                          }`}
                          aria-hidden
                        >
                          {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                        </span>
                        <span className="font-medium text-[var(--harbor-ink)]">
                          {FUTURE_TENANT_STAGE_LABELS[stage as FutureTenantStage]}
                        </span>
                        {current ? (
                          <span className="ml-auto text-xs text-[var(--harbor-mid)]">
                            Current
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-3 text-xs text-[var(--harbor-muted)]" aria-live="polite">
                  Stage {Math.min(stageIndex + 1, FUTURE_TENANT_STAGES.length)} of{" "}
                  {FUTURE_TENANT_STAGES.length}
                </p>
              </PortalSection>
            </PortalCard>

            <PortalCard>
              <PortalSection title="Outstanding requirements & deadlines">
                <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-[var(--harbor-ink)]">
                  {data.outstandingRequirements.length === 0 ? (
                    <li>None — waiting for management lease-start confirmation.</li>
                  ) : (
                    data.outstandingRequirements.map((item) => (
                      <li key={item}>{item}</li>
                    ))
                  )}
                </ul>
                <ul className="space-y-2 text-sm">
                  {data.importantDeadlines.map((d) => (
                    <li
                      key={d.label}
                      className="flex justify-between gap-3 border-b border-[var(--harbor-deep)]/10 py-2"
                    >
                      <span>{d.label}</span>
                      <time dateTime={d.date}>{d.date}</time>
                    </li>
                  ))}
                </ul>
                {data.outstandingRequirements.length === 0 ? (
                  <div className="mt-4 space-y-3">
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={mgmtConfirm}
                        onChange={(e) => setMgmtConfirm(e.target.checked)}
                        className="mt-1"
                      />
                      <span>
                        Management confirms the lease has started and move-in
                        requirements are complete (required before role change if
                        lease start is still in the future).
                      </span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={transitionBusy}
                      onClick={() => void tryTransition()}
                    >
                      {transitionBusy ? (
                        <>
                          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                          Confirming…
                        </>
                      ) : (
                        "Confirm lease start → become current tenant"
                      )}
                    </button>
                    <p className="text-xs text-[var(--harbor-muted)]">
                      Signed leases, receipts, documents, and message history are
                      preserved. Incomplete or canceled leases cannot convert.
                    </p>
                  </div>
                ) : null}
              </PortalSection>
            </PortalCard>
          </div>
        ) : null}

        {section === "documents" ? (
          <PortalCard>
            <PortalSection
              title="Required document checklist"
              description="Upload PDF or images up to 5 MB. Rejected items show a reason and accept a replacement."
            >
              <ul className="space-y-3">
                {data.documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="rounded-xl border border-[var(--harbor-deep)]/10 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[var(--harbor-ink)]">
                          {doc.label}
                        </p>
                        {doc.fileName ? (
                          <p className="text-xs text-[var(--harbor-muted)]">
                            File: {doc.fileName}
                            {doc.uploadedAt ? ` · ${doc.uploadedAt}` : ""}
                          </p>
                        ) : null}
                        {doc.status === "rejected" && doc.rejectionReason ? (
                          <p className="mt-1 text-sm text-red-700" role="alert">
                            Rejected: {doc.rejectionReason}
                          </p>
                        ) : null}
                      </div>
                      <PortalStatusBadge tone={statusTone(doc.status)}>
                        {labelStatus(doc.status)}
                      </PortalStatusBadge>
                    </div>
                    {(doc.status === "not_submitted" ||
                      doc.status === "required" ||
                      doc.status === "rejected") && (
                      <label className="mt-3 block text-sm">
                        <span className="sr-only">Upload {doc.label}</span>
                        <input
                          type="file"
                          accept=".pdf,image/jpeg,image/png,image/webp"
                          className="block w-full text-sm"
                          onChange={(e) =>
                            onUploadDoc(doc.id, e.target.files?.[0])
                          }
                        />
                      </label>
                    )}
                    {doc.status === "under_review" ? (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm mt-3"
                        onClick={() => {
                          update((prev) => ({
                            ...prev,
                            documents: prev.documents.map((d) =>
                              d.id === doc.id
                                ? { ...d, status: "approved" as const }
                                : d
                            ),
                          }));
                          flash("success", `${doc.label} approved (management simulation).`);
                        }}
                      >
                        Simulate management approval
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </PortalSection>
          </PortalCard>
        ) : null}

        {section === "lease" ? (
          <PortalCard>
            <PortalSection
              title="Lease review & signing"
              description="Review terms and addendums. Official lease terms cannot be edited here."
            >
              {!data.lease.ready ? (
                <p className="text-[var(--harbor-muted)]">Lease package is not ready yet.</p>
              ) : (
                <div className="space-y-4 text-sm">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <Field label="Property" value={data.lease.propertyLabel} />
                    <Field label="Unit" value={data.lease.unit} />
                    <Field label="Monthly rent" value={data.lease.monthlyRent} />
                    <Field label="Security deposit" value={data.lease.securityDeposit} />
                    <Field label="Fees" value={data.lease.feesSummary} />
                    <Field label="Lease dates" value={`${data.lease.leaseStart} → ${data.lease.leaseEnd}`} />
                  </dl>
                  <div>
                    <p className="font-medium">Required addendums</p>
                    <ul className="mt-1 list-disc pl-5">
                      {data.lease.addendums.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Signature status</p>
                    <ul className="mt-2 space-y-1">
                      {data.lease.parties.map((p) => (
                        <li key={p.id} className="flex justify-between gap-2">
                          <span>
                            {p.name} ({p.role})
                          </span>
                          <PortalStatusBadge tone={p.signed ? "success" : "warning"}>
                            {p.signed ? "Signed" : "Pending"}
                          </PortalStatusBadge>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={data.lease.tenantInitialed}
                      onClick={() =>
                        update((prev) => ({
                          ...prev,
                          lease: { ...prev.lease, tenantInitialed: true },
                        }))
                      }
                    >
                      {data.lease.tenantInitialed
                        ? "Initials recorded"
                        : "Initial required sections"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={
                        !data.lease.tenantInitialed || data.lease.tenantSigned
                      }
                      onClick={() =>
                        update((prev) => ({
                          ...prev,
                          lease: {
                            ...prev.lease,
                            tenantSigned: true,
                            signedAt: new Date().toISOString(),
                            downloadAvailable: true,
                            parties: prev.lease.parties.map((p) =>
                              p.role === "tenant"
                                ? {
                                    ...p,
                                    signed: true,
                                    signedAt: new Date().toISOString(),
                                  }
                                : p
                            ),
                          },
                        }))
                      }
                    >
                      {data.lease.tenantSigned
                        ? "Lease signed"
                        : "Electronically sign"}
                    </button>
                    {data.lease.downloadAvailable ? (
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() =>
                          flash(
                            "success",
                            "Download started (demo): signed-lease-copy.pdf"
                          )
                        }
                      >
                        Download completed copy
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </PortalSection>
          </PortalCard>
        ) : null}

        {section === "payments" ? (
          <PortalCard>
            <PortalSection
              title="Pre-move-in payments"
              description="One-time charges due before lease start. Recurring rent tools stay hidden until you become a current tenant."
            >
              <ul className="space-y-3">
                {data.charges.map((charge) => (
                  <li
                    key={charge.id}
                    className="rounded-xl border border-[var(--harbor-deep)]/10 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{charge.label}</p>
                        <p className="text-sm text-[var(--harbor-muted)]">
                          {charge.description}
                        </p>
                        <p className="mt-1 text-sm">
                          Due {charge.dueDate} ·{" "}
                          {charge.refundable ? "Refundable" : "Nonrefundable"}
                        </p>
                        {charge.receiptId ? (
                          <p className="text-xs text-emerald-700">
                            Receipt: {charge.receiptId}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{charge.amount}</p>
                        <PortalStatusBadge tone={statusTone(charge.status)}>
                          {labelStatus(charge.status)}
                        </PortalStatusBadge>
                      </div>
                    </div>
                    {charge.status === "due" || charge.status === "declined" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={payBusyId === charge.id}
                          onClick={() => void onPay(charge.id)}
                        >
                          {payBusyId === charge.id ? (
                            <>
                              <LoaderCircle className="mr-1 h-3 w-3 animate-spin" />
                              Processing…
                            </>
                          ) : (
                            "Pay now"
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={payBusyId === charge.id}
                          onClick={() => void onPay(charge.id, true)}
                        >
                          Simulate decline
                        </button>
                      </div>
                    ) : null}
                    {charge.status === "processing" ? (
                      <p className="mt-2 text-sm text-[var(--harbor-muted)]" role="status">
                        Payment processing…
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </PortalSection>
          </PortalCard>
        ) : null}

        {section === "scheduling" ? (
          <div className="space-y-4">
            <PortalCard>
              <PortalSection
                title="Move-in scheduling"
                description={`Approved lease start: ${data.appointment.leaseStartDate}`}
              >
                <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
                  <Field label="Office hours" value={data.appointment.officeHours} />
                  <Field label="Parking" value={data.appointment.parkingInstructions} />
                  <Field label="Loading" value={data.appointment.loadingInstructions} />
                  <Field label="Elevator" value={data.appointment.elevatorInstructions} />
                  <Field label="Building access" value={data.appointment.buildingAccess} />
                </dl>
                {data.appointment.confirmedDate ? (
                  <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    Confirmed: {data.appointment.confirmedDate} at{" "}
                    {data.appointment.confirmedTime}
                    {data.appointment.keyPickupConfirmed
                      ? " · Key pickup confirmed"
                      : ""}
                  </p>
                ) : null}
                <form onSubmit={confirmAppointment} className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Move-in date</span>
                    <input
                      name="date"
                      type="date"
                      required
                      className="input w-full"
                      defaultValue={data.appointment.requestedDate ?? ""}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Time</span>
                    <select
                      name="time"
                      required
                      className="input w-full"
                      defaultValue={data.appointment.requestedTime ?? ""}
                    >
                      <option value="">Select…</option>
                      <option value="9:00 AM">9:00 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="1:00 PM">1:00 PM</option>
                      <option value="3:00 PM">3:00 PM</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input name="keyPickup" type="checkbox" defaultChecked />
                    Confirm key pickup at this appointment
                  </label>
                  <button type="submit" className="btn btn-primary sm:col-span-2">
                    Confirm move-in appointment
                  </button>
                </form>
              </PortalSection>
            </PortalCard>
            <PortalCard>
              <PortalSection
                title="Request a schedule change"
                description="Changes require management approval when an appointment is already confirmed."
              >
                <form onSubmit={requestScheduleChange} className="space-y-3">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Reason</span>
                    <textarea name="reason" className="input min-h-[5rem] w-full" required />
                  </label>
                  {data.appointment.changeStatus === "pending_approval" ? (
                    <PortalStatusBadge tone="info">Pending approval</PortalStatusBadge>
                  ) : null}
                  <button type="submit" className="btn btn-outline">
                    Submit change request
                  </button>
                </form>
              </PortalSection>
            </PortalCard>
          </div>
        ) : null}

        {section === "checklist" ? (
          <PortalCard>
            <PortalSection
              title="Pre-move-in checklist"
              description="Incomplete blocking items prevent Ready for Move-In."
            >
              <ul className="space-y-2">
                {data.readiness.map((item) => (
                  <li
                    key={item.id}
                    className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${
                      !item.complete && item.blocking
                        ? "border-amber-200 bg-amber-50/60"
                        : "border-[var(--harbor-deep)]/10"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {item.complete ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-[var(--harbor-muted)]" aria-hidden />
                      )}
                      {item.label}
                      {!item.complete && item.blocking ? (
                        <span className="text-xs text-amber-800">Blocking</span>
                      ) : null}
                    </span>
                    <PortalStatusBadge tone={item.complete ? "success" : "warning"}>
                      {item.complete ? "Complete" : "Incomplete"}
                    </PortalStatusBadge>
                  </li>
                ))}
              </ul>
            </PortalSection>
          </PortalCard>
        ) : null}

        {section === "utilities" ? (
          <div className="space-y-4">
            <PortalCard>
              <PortalSection
                title="Required utilities"
                description="Only provider and setup details needed for move-in are shown."
              >
                <ul className="space-y-3">
                  {data.utilities.map((u) => (
                    <li
                      key={u.id}
                      className="rounded-xl border border-[var(--harbor-deep)]/10 p-4 text-sm"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {u.utility} · {u.name}
                          </p>
                          <p className="text-[var(--harbor-muted)]">{u.instructions}</p>
                          <p className="mt-1">Activate by {u.activationBy}</p>
                          {u.setupUrl ? (
                            <a
                              href={u.setupUrl}
                              className="text-[var(--harbor-mid)] underline"
                              target="_blank"
                              rel="noreferrer"
                            >
                              Setup instructions
                            </a>
                          ) : null}
                        </div>
                        <PortalStatusBadge tone={u.confirmed ? "success" : "warning"}>
                          {u.confirmed ? "Confirmed" : "Pending"}
                        </PortalStatusBadge>
                      </div>
                      {!u.confirmed ? (
                        <form
                          className="mt-3 flex flex-wrap gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            confirmUtility(u.id, String(fd.get("note") || ""));
                          }}
                        >
                          <label className="min-w-[12rem] flex-1 text-sm">
                            <span className="sr-only">Confirmation note</span>
                            <input
                              name="note"
                              className="input w-full"
                              placeholder="Account last 4 or confirmation #"
                            />
                          </label>
                          <button type="submit" className="btn btn-outline btn-sm">
                            Confirm setup
                          </button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </PortalSection>
            </PortalCard>
            <PortalCard>
              <PortalSection title="Renter’s insurance">
                <dl className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
                  <Field label="Required coverage" value={data.insurance.requiredCoverage} />
                  <Field label="Minimum liability" value={data.insurance.minLiability} />
                  <Field
                    label="Additional interest"
                    value={data.insurance.additionalInterest}
                  />
                </dl>
                <div className="mb-2">
                  <PortalStatusBadge tone={statusTone(data.insurance.status)}>
                    {labelStatus(data.insurance.status)}
                  </PortalStatusBadge>
                </div>
                {data.insurance.rejectionReason ? (
                  <p className="mb-2 text-sm text-red-700" role="alert">
                    {data.insurance.rejectionReason}
                  </p>
                ) : null}
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Upload proof of insurance</span>
                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => uploadInsurance(e.target.files?.[0])}
                  />
                </label>
                {data.insurance.status === "under_review" ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm mt-3"
                    onClick={() => {
                      update((prev) => ({
                        ...prev,
                        insurance: {
                          ...prev.insurance,
                          status: "approved",
                        },
                        documents: prev.documents.map((d) =>
                          d.kind === "renters_insurance"
                            ? { ...d, status: "approved" as const }
                            : d
                        ),
                      }));
                      flash("success", "Insurance verified (management simulation).");
                    }}
                  >
                    Simulate insurance approval
                  </button>
                ) : null}
              </PortalSection>
            </PortalCard>
          </div>
        ) : null}

        {section === "household" ? (
          <PortalCard>
            <PortalSection
              title="Household, pets & vehicles"
              description="Review approved details. Changes are requests only — they do not overwrite the lease."
            >
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Field
                  label="Approved occupants"
                  value={data.household.occupants.join(", ") || "—"}
                />
                <Field
                  label="Emergency contacts"
                  value={data.household.emergencyContacts.join(", ") || "None listed"}
                />
                <Field label="Pets" value={data.household.pets.join(", ") || "None"} />
                <Field
                  label="Assistance animals"
                  value={data.household.assistanceAnimals.join(", ") || "None"}
                />
                <Field
                  label="Vehicles"
                  value={data.household.vehicles.join(", ") || "None listed"}
                />
                <Field label="Parking needs" value={data.household.parkingNeeds} />
                <Field label="Storage / accessibility" value={data.household.storageNeeds} />
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={data.household.confirmed}
                  onClick={confirmHousehold}
                >
                  {data.household.confirmed ? "Confirmed" : "Confirm household information"}
                </button>
              </div>
              <form onSubmit={requestHouseholdChange} className="mt-4 space-y-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Request a change for management</span>
                  <textarea name="change" className="input min-h-[4rem] w-full" />
                </label>
                {data.household.changeStatus === "pending_approval" ? (
                  <PortalStatusBadge tone="info">Change pending approval</PortalStatusBadge>
                ) : null}
                <button type="submit" className="btn btn-outline btn-sm">
                  Submit change request
                </button>
              </form>
            </PortalSection>
          </PortalCard>
        ) : null}

        {section === "movein" ? (
          <PortalCard>
            <PortalSection title="Move-in information">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Field label="Property address" value={data.moveInInfo.propertyAddress} />
                <Field label="Unit" value={data.moveInInfo.unit} />
                <Field label="Key pickup" value={data.moveInInfo.keyPickup} />
                <Field label="Parking" value={data.moveInInfo.parking} />
                <Field label="Building access" value={data.moveInInfo.buildingAccess} />
                <Field label="Mail & packages" value={data.moveInInfo.mailPackages} />
                <Field label="Trash" value={data.moveInInfo.trash} />
                <Field label="Internet & utilities" value={data.moveInInfo.internetUtilities} />
                <Field label="Community rules" value={data.moveInInfo.communityRules} />
                <Field label="Management contact" value={data.moveInInfo.managementContact} />
                <Field label="Emergency guidance" value={data.moveInInfo.emergencyGuidance} />
              </dl>
            </PortalSection>
          </PortalCard>
        ) : null}

        {section === "messages" ? (
          <PortalCard>
            <PortalSection
              title="Pre-move-in questions"
              description="Limited topics for approved future tenants. Reuses the portal messaging pattern — not a separate chat platform."
            >
              <form onSubmit={sendMessage} className="space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Topic</span>
                  <select
                    className="input w-full"
                    value={msgTopic}
                    onChange={(e) =>
                      setMsgTopic(e.target.value as (typeof MESSAGE_TOPICS)[number])
                    }
                  >
                    {MESSAGE_TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Message</span>
                  <textarea
                    className="input min-h-[6rem] w-full"
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    required
                  />
                </label>
                <button type="submit" className="btn btn-primary">
                  Send to leasing
                </button>
              </form>
              {messages.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--harbor-muted)]">No messages yet.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {messages.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-xl border border-[var(--harbor-deep)]/10 p-3 text-sm"
                    >
                      <p className="font-medium">{m.topic}</p>
                      <p className="text-[var(--harbor-muted)]">{m.body}</p>
                      <time className="text-xs text-[var(--harbor-muted)]" dateTime={m.at}>
                        {new Date(m.at).toLocaleString()}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </PortalSection>
          </PortalCard>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--harbor-deep)]/10 bg-white/70 p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--harbor-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--harbor-ink)]">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--harbor-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-[var(--harbor-ink)]">{value}</dd>
    </div>
  );
}
