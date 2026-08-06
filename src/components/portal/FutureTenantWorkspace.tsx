"use client";

import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  MessagesSquare,
  PlusCircle,
  Receipt,
  RefreshCw,
  ScrollText,
} from "lucide-react";
import { FutureTenantOnboardingView } from "@/components/portal/future-tenant/FutureTenantOnboardingView";
import { PortalCard } from "@/components/portal/PortalCard";
import { PortalSection } from "@/components/portal/PortalSection";
import { PortalStatusBadge } from "@/components/portal/PortalStatusBadge";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import { getPortalTenantSessionClient } from "@/lib/portal/auth-client";
import type { PortalTenantSession } from "@/lib/portal/auth";
import { createClient } from "@/lib/supabase/client";
import { listSharedRecords } from "@/lib/shared-store";
import type { ManagementContractDraft } from "@/lib/management-contract";
import {
  emptyTenantContract,
  emptyTenantInvoice,
  type TenantContract,
  type TenantInvoice,
} from "@/lib/portal-records";

type Section =
  | "dashboard"
  | "applications"
  | "contracts"
  | "billing"
  | "messages";

type Application = {
  id: string;
  property: string;
  name: string;
  email: string;
  notes: string;
  status: "Submitted" | "In review";
  createdAt: string;
  /** Owning portal user — filters out other applicants. */
  ownerUserId?: string;
  ownerEmail?: string;
};

function normalizeOwnerEmail(value: string | undefined | null) {
  return (value ?? "").trim().toLowerCase();
}

function ownsRecord(
  record: { ownerUserId?: string; ownerEmail?: string; email?: string },
  session: { userId: string; email: string }
) {
  if (record.ownerUserId && record.ownerUserId === session.userId) return true;
  const email = normalizeOwnerEmail(session.email);
  if (!email) return false;
  if (normalizeOwnerEmail(record.ownerEmail) === email) return true;
  if (normalizeOwnerEmail(record.email) === email) return true;
  return false;
}

const SECTIONS: {
  id: Section;
  label: string;
  group: string;
  icon: typeof LayoutDashboard;
}[] = [
  {
    id: "dashboard",
    label: "Overview",
    group: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "applications",
    label: "New application",
    group: "Applications",
    icon: ClipboardList,
  },
  {
    id: "billing",
    label: "Balance & invoices",
    group: "Payments and Balance",
    icon: CircleDollarSign,
  },
  {
    id: "contracts",
    label: "Contracts",
    group: "Lease Documents",
    icon: ScrollText,
  },
  {
    id: "messages",
    label: "Contact management",
    group: "Messages and Notifications",
    icon: MessagesSquare,
  },
];

function invoiceTone(status: TenantInvoice["status"]) {
  if (status === "Paid") return "success" as const;
  if (status === "Due") return "warning" as const;
  return "danger" as const;
}

function applicationTone(status: Application["status"]) {
  return status === "In review" ? ("info" as const) : ("neutral" as const);
}

function formatMoney(value: string) {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return value || "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

export function FutureTenantWorkspace() {
  const [section, setSection] = useState<Section>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navId = useId();
  const [session, setSession] = useState<PortalTenantSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const {
    items: allApplications,
    saveOne: saveApplication,
    loading,
    error,
  } = useSharedCollection<Application>(COLLECTIONS.tenantApplications);
  const {
    items: allContracts,
    saveOne: saveContract,
    loading: contractsLoading,
    error: contractsError,
  } = useSharedCollection<TenantContract>(COLLECTIONS.tenantContracts);
  const {
    items: allInvoices,
    saveOne: saveInvoice,
    loading: invoicesLoading,
    error: invoicesError,
  } = useSharedCollection<TenantInvoice>(COLLECTIONS.tenantInvoices);

  const [managedProperties, setManagedProperties] = useState<
    ManagementContractDraft[]
  >([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [property, setProperty] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const [contractForm, setContractForm] = useState(emptyTenantContract());
  const [invoiceForm, setInvoiceForm] = useState(emptyTenantInvoice());
  const [showContractForm, setShowContractForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  useEffect(() => {
    void (async () => {
      setSessionLoading(true);
      const next = await getPortalTenantSessionClient();
      setSession(next);
      if (next) {
        setName(next.displayName);
        setEmail(next.email);
      }
      setSessionLoading(false);
    })();
  }, []);

  const applications = useMemo(() => {
    if (!session) return [];
    return allApplications.filter((row) => ownsRecord(row, session));
  }, [allApplications, session]);

  const contracts = useMemo(() => {
    if (!session) return [];
    return allContracts.filter((row) => ownsRecord(row, session));
  }, [allContracts, session]);

  const invoices = useMemo(() => {
    if (!session) return [];
    return allInvoices.filter((row) => ownsRecord(row, session));
  }, [allInvoices, session]);

  useEffect(() => {
    void (async () => {
      setPropertiesLoading(true);
      setPropertiesError(null);
      try {
        const supabase = createClient();
        const rows = await listSharedRecords<ManagementContractDraft>(
          supabase,
          COLLECTIONS.managedProperties
        );
        setManagedProperties(rows);
        if (!property && rows[0]?.propertyName) {
          setProperty(rows[0].propertyName);
        } else if (!property) {
          setProperty("Pier 12 · Suite 305");
        }
      } catch (err) {
        setPropertiesError(
          err instanceof Error
            ? err.message
            : "Could not load available properties."
        );
        if (!property) setProperty("Pier 12 · Suite 305");
      } finally {
        setPropertiesLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const propertyOptions = useMemo(() => {
    const names = managedProperties
      .map((p) => p.propertyName)
      .filter(Boolean);
    const fallback = [
      "Pier 12 · Suite 305",
      "Canal Yard · Unit A",
      "Harbor Court · Floor 3",
      "Wharf East · Retail Bay 4",
    ];
    return Array.from(new Set([...names, ...fallback]));
  }, [managedProperties]);

  const openInvoices = useMemo(
    () => invoices.filter((inv) => inv.status === "Due" || inv.status === "Overdue"),
    [invoices]
  );
  const nextInvoice = openInvoices[0] ?? null;
  const activeContracts = useMemo(
    () => contracts.filter((c) => c.status === "Active"),
    [contracts]
  );
  const recentApplications = useMemo(
    () => [...applications].slice(0, 4),
    [applications]
  );

  const dashboardLoading =
    sessionLoading || loading || contractsLoading || invoicesLoading;
  const dashboardError = error || contractsError || invoicesError;

  async function handleApply(e: FormEvent) {
    e.preventDefault();
    setApplyError(null);
    if (!session) {
      setApplyError("Sign in required before submitting an application.");
      return;
    }
    const next: Application = {
      id: crypto.randomUUID(),
      property,
      name: name.trim() || session.displayName || "Applicant",
      email: email.trim() || session.email,
      notes: notes.trim(),
      status: "Submitted",
      createdAt: new Date().toLocaleDateString(),
      ownerUserId: session.userId,
      ownerEmail: session.email,
    };
    try {
      await saveApplication(next);
      setNotes("");
      setSavedMsg(
        "Application saved to your account only. Harborline will follow up shortly."
      );
      setTimeout(() => setSavedMsg(null), 4000);
      setSection("dashboard");
    } catch (err) {
      setApplyError(
        err instanceof Error ? err.message : "Could not save application."
      );
    }
  }

  async function handleAddContract(e: FormEvent) {
    e.preventDefault();
    if (!session || !contractForm.property.trim()) return;
    await saveContract({
      ...contractForm,
      id: crypto.randomUUID(),
      property: contractForm.property.trim(),
      ownerUserId: session.userId,
      ownerEmail: session.email,
      tenantEmail: session.email,
      tenantName: session.displayName || undefined,
    });
    setContractForm(emptyTenantContract());
    setShowContractForm(false);
  }

  async function handleAddInvoice(e: FormEvent) {
    e.preventDefault();
    if (!session || !invoiceForm.label.trim()) return;
    await saveInvoice({
      ...invoiceForm,
      id: crypto.randomUUID(),
      label: invoiceForm.label.trim(),
      ownerUserId: session.userId,
      ownerEmail: session.email,
      tenantEmail: session.email,
      tenantName: session.displayName || undefined,
    });
    setInvoiceForm(emptyTenantInvoice());
    setShowInvoiceForm(false);
  }

  function goTo(next: Section) {
    setSection(next);
    setMobileNavOpen(false);
  }

  const groupedNav = useMemo(() => {
    const groups = new Map<string, typeof SECTIONS>();
    for (const item of SECTIONS) {
      const list = groups.get(item.group) ?? [];
      list.push(item);
      groups.set(item.group, list);
    }
    return Array.from(groups.entries());
  }, []);

  if (sessionLoading) {
    return (
      <div
        className="flex min-h-[12rem] items-center justify-center gap-2 text-[var(--harbor-muted)]"
        role="status"
      >
        <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />
        Loading portal…
      </div>
    );
  }

  if (session?.lifecycle === "future") {
    return <FutureTenantOnboardingView session={session} />;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-6">
      <div className="lg:hidden">
        <button
          type="button"
          className="portal-btn portal-btn-secondary w-full justify-between"
          aria-expanded={mobileNavOpen}
          aria-controls={navId}
          onClick={() => setMobileNavOpen((open) => !open)}
        >
          <span>Future tenant menu</span>
          <span className="text-xs portal-muted">
            {SECTIONS.find((s) => s.id === section)?.label}
          </span>
        </button>
      </div>

      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[var(--harbor-ink)]/35 lg:hidden"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        id={navId}
        aria-label="Future tenant sections"
        className={`portal-card z-50 p-3 lg:sticky lg:top-24 lg:z-auto lg:block lg:self-start ${
          mobileNavOpen
            ? "fixed left-3 right-3 top-[5.5rem] max-h-[calc(100vh-6.5rem)] overflow-y-auto"
            : "hidden lg:block"
        }`}
      >
        <nav className="space-y-4">
          {groupedNav.map(([group, items]) => (
            <div key={group}>
              <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--harbor-ink)]/45">
                {group}
              </p>
              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => goTo(item.id)}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors portal-focus ${
                          active
                            ? "bg-[var(--harbor-ink)] text-[var(--harbor-sand)]"
                            : "text-[var(--harbor-ink)]/80 hover:bg-[var(--harbor-mist)]/70"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 space-y-5 sm:space-y-6">
        {section === "dashboard" && (
          <DashboardPanel
            loading={dashboardLoading}
            error={dashboardError}
            applications={recentApplications}
            applicationCount={applications.length}
            nextInvoice={nextInvoice}
            openInvoiceCount={openInvoices.length}
            contracts={activeContracts}
            contractCount={contracts.length}
            onRetry={() => window.location.reload()}
            onNavigate={goTo}
          />
        )}

        {section === "applications" && (
          <ApplicationsPanel
            property={property}
            setProperty={setProperty}
            propertyOptions={propertyOptions}
            propertiesLoading={propertiesLoading}
            propertiesError={propertiesError}
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            notes={notes}
            setNotes={setNotes}
            onSubmit={handleApply}
            savedMsg={savedMsg}
            applyError={applyError}
            applications={applications}
            loading={loading}
            error={error}
          />
        )}

        {section === "contracts" && (
          <ContractsPanel
            contracts={contracts}
            loading={contractsLoading}
            error={contractsError}
            showForm={showContractForm}
            setShowForm={setShowContractForm}
            form={contractForm}
            setForm={setContractForm}
            onSubmit={handleAddContract}
          />
        )}

        {section === "billing" && (
          <BillingPanel
            invoices={invoices}
            loading={invoicesLoading}
            error={invoicesError}
            showForm={showInvoiceForm}
            setShowForm={setShowInvoiceForm}
            form={invoiceForm}
            setForm={setInvoiceForm}
            onSubmit={handleAddInvoice}
          />
        )}

        {section === "messages" && <MessagesPanel onApply={() => goTo("applications")} />}
      </div>
    </div>
  );
}

function DashboardPanel({
  loading,
  error,
  applications,
  applicationCount,
  nextInvoice,
  openInvoiceCount,
  contracts,
  contractCount,
  onRetry,
  onNavigate,
}: {
  loading: boolean;
  error: string | null;
  applications: Application[];
  applicationCount: number;
  nextInvoice: TenantInvoice | null;
  openInvoiceCount: number;
  contracts: TenantContract[];
  contractCount: number;
  onRetry: () => void;
  onNavigate: (section: Section) => void;
}) {
  if (loading) {
    return (
      <PortalCard
        className="flex min-h-48 flex-col items-center justify-center gap-3"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle
          className="h-8 w-8 animate-spin text-[var(--harbor-mid)]"
          aria-hidden="true"
        />
        <p className="text-sm portal-muted">Loading your future-tenant dashboard…</p>
      </PortalCard>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-2xl border border-error/30 bg-error/5 p-6"
        role="alert"
      >
        <h2 className="portal-section-title">Dashboard unavailable</h2>
        <p className="mt-1 text-sm portal-muted">{error}</p>
        <button
          type="button"
          className="portal-btn portal-btn-primary mt-4 gap-1"
          onClick={onRetry}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  const isEmpty =
    applicationCount === 0 && contractCount === 0 && openInvoiceCount === 0;

  if (isEmpty) {
    return (
      <PortalCard className="space-y-4 border-dashed">
        <h2 className="portal-section-title">Nothing on your dashboard yet</h2>
        <p className="max-w-xl text-sm portal-muted">
          Start an application to track status, review contracts, and see any
          application-related billing in one place.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="portal-btn portal-btn-primary"
            onClick={() => onNavigate("applications")}
          >
            Start an application
          </button>
          <button
            type="button"
            className="portal-btn portal-btn-secondary"
            onClick={() => onNavigate("contracts")}
          >
            View contracts
          </button>
        </div>
      </PortalCard>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div
        className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm portal-muted"
        role="status"
        aria-live="polite"
      >
        Dashboard loaded successfully. Application, contract, and billing data
        come from the shared Harborline database when available.
      </div>

      <section aria-labelledby="future-summary-heading">
        <h2 id="future-summary-heading" className="sr-only">
          Account summary
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <li>
            <button
              type="button"
              onClick={() => onNavigate("billing")}
              className="portal-card portal-card-interactive flex h-full w-full flex-col gap-3 p-4 text-left portal-focus"
            >
              <span className="flex items-center gap-2 text-sm portal-muted">
                <CircleDollarSign
                  className="h-4 w-4 text-[var(--harbor-mid)]"
                  aria-hidden="true"
                />
                Current balance / next due
              </span>
              <span className="font-display text-2xl tracking-tight text-[var(--harbor-ink)]">
                {nextInvoice ? formatMoney(nextInvoice.amount) : "—"}
              </span>
              <span className="text-xs portal-muted">
                {nextInvoice
                  ? `Due ${nextInvoice.due || nextInvoice.dueDate || "soon"}`
                  : "No open balance"}
              </span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => onNavigate("applications")}
              className="portal-card portal-card-interactive flex h-full w-full flex-col gap-3 p-4 text-left portal-focus"
            >
              <span className="flex items-center gap-2 text-sm portal-muted">
                <ClipboardList
                  className="h-4 w-4 text-[var(--harbor-mid)]"
                  aria-hidden="true"
                />
                Applications
              </span>
              <span className="font-display text-2xl tracking-tight text-[var(--harbor-ink)]">
                {applicationCount}
              </span>
              <span className="text-xs portal-muted">Submitted or in review</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => onNavigate("contracts")}
              className="portal-card portal-card-interactive flex h-full w-full flex-col gap-3 p-4 text-left portal-focus"
            >
              <span className="flex items-center gap-2 text-sm portal-muted">
                <ScrollText
                  className="h-4 w-4 text-[var(--harbor-mid)]"
                  aria-hidden="true"
                />
                Active contracts
              </span>
              <span className="font-display text-2xl tracking-tight text-[var(--harbor-ink)]">
                {contracts.length}
              </span>
              <span className="text-xs portal-muted">
                {contractCount} total on file
              </span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => onNavigate("billing")}
              className="portal-card portal-card-interactive flex h-full w-full flex-col gap-3 p-4 text-left portal-focus"
            >
              <span className="flex items-center gap-2 text-sm portal-muted">
                <Receipt
                  className="h-4 w-4 text-[var(--harbor-mid)]"
                  aria-hidden="true"
                />
                Open invoices
              </span>
              <span className="font-display text-2xl tracking-tight text-[var(--harbor-ink)]">
                {openInvoiceCount}
              </span>
              {nextInvoice ? (
                <PortalStatusBadge tone={invoiceTone(nextInvoice.status)}>
                  {nextInvoice.status}
                </PortalStatusBadge>
              ) : (
                <span className="text-xs portal-muted">All clear</span>
              )}
            </button>
          </li>
        </ul>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="grid gap-4 lg:grid-cols-2">
          <PortalSection
            title="Recent applications"
            action={
              <button
                type="button"
                className="shrink-0 text-sm font-semibold text-[var(--harbor-mid)] underline-offset-2 hover:underline portal-focus rounded"
                onClick={() => onNavigate("applications")}
              >
                Manage
              </button>
            }
          >
            {applications.length === 0 ? (
              <p className="portal-empty">No applications yet.</p>
            ) : (
              <ul className="space-y-3">
                {applications.map((app) => (
                  <li
                    key={app.id}
                    className="rounded-xl border border-[var(--harbor-deep)]/10 px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--harbor-ink)]">
                        {app.property}
                      </p>
                      <PortalStatusBadge tone={applicationTone(app.status)}>
                        {app.status}
                      </PortalStatusBadge>
                    </div>
                    <p className="mt-1 text-xs portal-muted">
                      {app.name} · {app.createdAt}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </PortalSection>

          <PortalSection
            title="Contracts on file"
            action={
              <button
                type="button"
                className="shrink-0 text-sm font-semibold text-[var(--harbor-mid)] underline-offset-2 hover:underline portal-focus rounded"
                onClick={() => onNavigate("contracts")}
              >
                View all
              </button>
            }
          >
            {contracts.length === 0 ? (
              <p className="portal-empty">No active contracts yet.</p>
            ) : (
              <ul className="space-y-3">
                {contracts.slice(0, 3).map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-[var(--harbor-deep)]/10 px-3 py-3"
                  >
                    <p className="text-sm font-semibold text-[var(--harbor-ink)]">
                      {c.property}
                    </p>
                    <p className="mt-1 text-xs portal-muted">
                      {c.term || "Term TBD"} · {c.rent || "Rent TBD"}
                    </p>
                    <div className="mt-2">
                      <PortalStatusBadge
                        tone={c.status === "Active" ? "success" : "warning"}
                      >
                        {c.status}
                      </PortalStatusBadge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PortalSection>

          <PortalSection
            title="Payments and balance"
            className="lg:col-span-2"
            action={
              <button
                type="button"
                className="shrink-0 text-sm font-semibold text-[var(--harbor-mid)] underline-offset-2 hover:underline portal-focus rounded"
                onClick={() => onNavigate("billing")}
              >
                View billing
              </button>
            }
          >
            {!nextInvoice ? (
              <p className="portal-empty">No open invoices right now.</p>
            ) : (
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm portal-muted">{nextInvoice.label}</p>
                  <p className="font-display text-3xl tracking-tight text-[var(--harbor-ink)]">
                    {formatMoney(nextInvoice.amount)}
                  </p>
                  <p className="mt-1 text-sm portal-muted">
                    Due{" "}
                    <strong className="text-[var(--harbor-ink)]">
                      {nextInvoice.due || nextInvoice.dueDate || "—"}
                    </strong>
                  </p>
                </div>
                <PortalStatusBadge tone={invoiceTone(nextInvoice.status)}>
                  {nextInvoice.status}
                </PortalStatusBadge>
              </div>
            )}
          </PortalSection>
        </div>

        <PortalCard as="section" aria-labelledby="future-quick-actions-heading">
          <h2 id="future-quick-actions-heading" className="portal-section-title">
            Quick actions
          </h2>
          <ul className="mt-4 grid gap-2">
            {[
              {
                id: "applications" as const,
                label: "Submit application",
                description: "Apply for a Harborline property",
                icon: PlusCircle,
              },
              {
                id: "contracts" as const,
                label: "View contracts",
                description: "Review lease documents on file",
                icon: ScrollText,
              },
              {
                id: "billing" as const,
                label: "Check balance",
                description: "See invoices and amounts due",
                icon: CircleDollarSign,
              },
              {
                id: "messages" as const,
                label: "Contact management",
                description: "Reach the Harborline leasing team",
                icon: MessagesSquare,
              },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <li key={action.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(action.id)}
                    className="flex min-h-14 w-full items-start gap-3 rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/40 px-3 py-3 text-left transition hover:border-[var(--harbor-mid)]/40 hover:bg-[var(--harbor-mist)]/50 portal-focus"
                  >
                    <span className="mt-0.5 rounded-lg bg-[var(--harbor-ink)] p-2 text-[var(--harbor-sand)]">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[var(--harbor-ink)]">
                        {action.label}
                      </span>
                      <span className="block text-xs portal-muted">
                        {action.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </PortalCard>
      </div>
    </div>
  );
}

function ApplicationsPanel({
  property,
  setProperty,
  propertyOptions,
  propertiesLoading,
  propertiesError,
  name,
  setName,
  email,
  setEmail,
  notes,
  setNotes,
  onSubmit,
  savedMsg,
  applyError,
  applications,
  loading,
  error,
}: {
  property: string;
  setProperty: (value: string) => void;
  propertyOptions: string[];
  propertiesLoading: boolean;
  propertiesError: string | null;
  name: string;
  setName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  savedMsg: string | null;
  applyError: string | null;
  applications: Application[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <PortalCard as="form" onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[var(--harbor-mid)]" aria-hidden="true" />
          <h2 className="portal-section-title">Start a new application</h2>
        </div>

        {propertiesError ? (
          <p className="text-sm text-error" role="alert">
            {propertiesError} Showing fallback property choices.
          </p>
        ) : null}

        <label className="form-control w-full">
          <span className="label-text mb-1">Property interest</span>
          <select
            className="select select-bordered w-full portal-focus"
            value={property}
            onChange={(e) => setProperty(e.target.value)}
            disabled={propertiesLoading && propertyOptions.length === 0}
          >
            {propertyOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control w-full">
          <span className="label-text mb-1">Full name</span>
          <input
            className="input input-bordered w-full portal-focus"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Tenant"
            required
          />
        </label>
        <label className="form-control w-full">
          <span className="label-text mb-1">Email</span>
          <input
            type="email"
            className="input input-bordered w-full portal-focus"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />
        </label>
        <label className="form-control w-full">
          <span className="label-text mb-1">Notes</span>
          <textarea
            className="textarea textarea-bordered min-h-24 w-full portal-focus"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Desired move-in date, square footage, or questions"
          />
        </label>
        <button type="submit" className="portal-btn portal-btn-primary">
          Submit application
        </button>
        {savedMsg ? (
          <p className="text-sm text-[var(--harbor-mid)]" role="status">
            {savedMsg}
          </p>
        ) : null}
        {applyError ? (
          <p className="text-sm text-error" role="alert">
            {applyError}
          </p>
        ) : null}
      </PortalCard>

      <PortalCard>
        <h3 className="portal-section-title">Your applications</h3>
        {error ? (
          <p className="mt-3 text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <div
            className="mt-6 flex flex-col items-center gap-2 py-8"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle
              className="h-6 w-6 animate-spin text-[var(--harbor-mid)]"
              aria-hidden="true"
            />
            <p className="text-sm portal-muted">Loading shared applications…</p>
          </div>
        ) : applications.length === 0 ? (
          <p className="portal-empty mt-4">
            No applications yet. Submit one to see it tracked here for the whole
            team.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {applications.map((app) => (
              <li
                key={app.id}
                className="rounded-xl border border-[var(--harbor-deep)]/10 bg-[var(--harbor-sand)]/35 px-4 py-3"
              >
                <p className="font-medium text-[var(--harbor-ink)]">
                  {app.property}
                </p>
                <p className="text-sm portal-muted">
                  {app.name} · {app.createdAt}
                </p>
                <div className="mt-2">
                  <PortalStatusBadge tone={applicationTone(app.status)}>
                    {app.status}
                  </PortalStatusBadge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PortalCard>
    </section>
  );
}

function ContractsPanel({
  contracts,
  loading,
  error,
  showForm,
  setShowForm,
  form,
  setForm,
  onSubmit,
}: {
  contracts: TenantContract[];
  loading: boolean;
  error: string | null;
  showForm: boolean;
  setShowForm: (value: boolean | ((prev: boolean) => boolean)) => void;
  form: Omit<TenantContract, "id">;
  setForm: React.Dispatch<React.SetStateAction<Omit<TenantContract, "id">>>;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="portal-section-title">Lease documents & contracts</h2>
        <button
          type="button"
          className="portal-btn portal-btn-secondary gap-1"
          onClick={() => setShowForm((v) => !v)}
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          {showForm ? "Hide" : "Add contract"}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <PortalCard
          as="form"
          onSubmit={onSubmit}
          className="grid gap-2 sm:grid-cols-2"
        >
          <input
            className="input input-bordered input-sm portal-focus"
            placeholder="Property"
            value={form.property}
            onChange={(e) =>
              setForm((f) => ({ ...f, property: e.target.value }))
            }
            required
          />
          <input
            className="input input-bordered input-sm portal-focus"
            placeholder="Term"
            value={form.term}
            onChange={(e) => setForm((f) => ({ ...f, term: e.target.value }))}
          />
          <input
            className="input input-bordered input-sm portal-focus"
            placeholder="Rent"
            value={form.rent}
            onChange={(e) => setForm((f) => ({ ...f, rent: e.target.value }))}
          />
          <select
            className="select select-bordered select-sm portal-focus"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as TenantContract["status"],
              }))
            }
          >
            <option value="Active">Active</option>
            <option value="Renewal pending">Renewal pending</option>
          </select>
          <button type="submit" className="portal-btn portal-btn-primary">
            Save to shared database
          </button>
        </PortalCard>
      ) : null}

      {loading ? (
        <PortalCard
          className="flex min-h-32 flex-col items-center justify-center gap-2"
          role="status"
        >
          <LoaderCircle
            className="h-6 w-6 animate-spin text-[var(--harbor-mid)]"
            aria-hidden="true"
          />
          <p className="text-sm portal-muted">Loading shared contracts…</p>
        </PortalCard>
      ) : contracts.length === 0 ? (
        <p className="portal-empty">No contracts on file yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {contracts.map((c) => (
            <PortalCard key={c.id} as="article">
              <p className="text-lg font-semibold text-[var(--harbor-ink)]">
                {c.property}
              </p>
              <p className="mt-1 text-sm portal-muted">{c.term}</p>
              <p className="mt-3 text-sm">
                Rent: <strong>{c.rent}</strong>
              </p>
              <div className="mt-3">
                <PortalStatusBadge
                  tone={c.status === "Active" ? "success" : "warning"}
                >
                  {c.status}
                </PortalStatusBadge>
              </div>
            </PortalCard>
          ))}
        </div>
      )}
    </section>
  );
}

function BillingPanel({
  invoices,
  loading,
  error,
  showForm,
  setShowForm,
  form,
  setForm,
  onSubmit,
}: {
  invoices: TenantInvoice[];
  loading: boolean;
  error: string | null;
  showForm: boolean;
  setShowForm: (value: boolean | ((prev: boolean) => boolean)) => void;
  form: Omit<TenantInvoice, "id">;
  setForm: React.Dispatch<React.SetStateAction<Omit<TenantInvoice, "id">>>;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="portal-section-title">Payments and balance</h2>
        <button
          type="button"
          className="portal-btn portal-btn-secondary gap-1"
          onClick={() => setShowForm((v) => !v)}
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          {showForm ? "Hide" : "Add invoice"}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <PortalCard
          as="form"
          onSubmit={onSubmit}
          className="grid gap-2 sm:grid-cols-2"
        >
          <input
            className="input input-bordered input-sm portal-focus"
            placeholder="Label"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            required
          />
          <input
            className="input input-bordered input-sm portal-focus"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <input
            className="input input-bordered input-sm portal-focus"
            placeholder="Due date"
            value={form.due}
            onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))}
          />
          <select
            className="select select-bordered select-sm portal-focus"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as TenantInvoice["status"],
              }))
            }
          >
            <option value="Paid">Paid</option>
            <option value="Due">Due</option>
            <option value="Overdue">Overdue</option>
          </select>
          <button type="submit" className="portal-btn portal-btn-primary">
            Save to shared database
          </button>
        </PortalCard>
      ) : null}

      {loading ? (
        <PortalCard
          className="flex min-h-32 flex-col items-center justify-center gap-2"
          role="status"
        >
          <LoaderCircle
            className="h-6 w-6 animate-spin text-[var(--harbor-mid)]"
            aria-hidden="true"
          />
          <p className="text-sm portal-muted">Loading shared billing…</p>
        </PortalCard>
      ) : invoices.length === 0 ? (
        <p className="portal-empty">No billing items yet.</p>
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {invoices.map((inv) => (
              <li key={inv.id} className="portal-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--harbor-ink)]">
                      {inv.label}
                    </p>
                    <p className="text-xs portal-muted">
                      Due {inv.due || inv.dueDate || "—"}
                    </p>
                  </div>
                  <p className="font-semibold">{formatMoney(inv.amount)}</p>
                </div>
                <div className="mt-3">
                  <PortalStatusBadge tone={invoiceTone(inv.status)}>
                    {inv.status}
                  </PortalStatusBadge>
                </div>
              </li>
            ))}
          </ul>

          <div className="portal-card hidden overflow-x-auto md:block">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Amount</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.label}</td>
                    <td>{formatMoney(inv.amount)}</td>
                    <td>{inv.due || inv.dueDate || "—"}</td>
                    <td>
                      <PortalStatusBadge tone={invoiceTone(inv.status)}>
                        {inv.status}
                      </PortalStatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function MessagesPanel({ onApply }: { onApply: () => void }) {
  return (
    <PortalCard className="space-y-4">
      <h2 className="portal-section-title">Messages and notifications</h2>
      <p className="text-sm portal-muted">
        Future-tenant messaging stays with Harborline leasing. Submit an
        application with your questions, or email the team after you apply.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="portal-btn portal-btn-primary"
          onClick={onApply}
        >
          Ask in your application
        </button>
        <Link href="mailto:leasing@harborline.example" className="portal-btn portal-btn-secondary">
          Email leasing
        </Link>
      </div>
      <p className="portal-empty">
        No in-portal message threads yet for future-tenant accounts.
      </p>
    </PortalCard>
  );
}
