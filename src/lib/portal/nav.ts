/**
 * Tenant portal (main-dash “I am a tenant or future tenant”) navigation.
 * Private `/portal` routes require authenticated current-tenant role.
 * `/portal/apply` stays public for future tenants. Not the staff `/tenant` shell.
 */

export type PortalNavItem = {
  href: string;
  label: string;
  description: string;
  exact?: boolean;
};

/** Primary navigation for current tenants. */
export const PORTAL_PRIMARY_NAV: PortalNavItem[] = [
  {
    href: "/portal",
    label: "Dashboard",
    description: "Overview of balance, requests, and notices.",
    exact: true,
  },
  {
    href: "/portal/payments",
    label: "Payments",
    description: "See what’s due and recent payment activity.",
  },
  {
    href: "/portal/charges",
    label: "Utilities & fees",
    description: "Pay utilities, common area maintenance, parking, and amenity charges.",
  },
  {
    href: "/portal/maintenance",
    label: "Maintenance",
    description: "Track and submit maintenance requests.",
  },
  {
    href: "/portal/lease",
    label: "Lease",
    description: "View lease terms and unit details.",
  },
  {
    href: "/portal/insurance",
    label: "Insurance",
    description: "Track coverage and upload certificates of insurance.",
  },
  {
    href: "/portal/documents",
    label: "Documents",
    description: "Access lease files and statements.",
  },
  {
    href: "/portal/announcements",
    label: "Announcements",
    description: "Building and property notices.",
  },
  {
    href: "/portal/messages",
    label: "Messages",
    description: "Message Harborline management.",
  },
  {
    href: "/portal/profile",
    label: "Profile",
    description: "Update contact and household details.",
  },
];

/** Secondary actions for current tenants. */
export const PORTAL_SECONDARY_ACTIONS: PortalNavItem[] = [
  {
    href: "/portal/notification-preferences",
    label: "Mobile alerts",
    description: "Manage mobile notification preferences.",
  },
  {
    href: "/portal/renewal",
    label: "Request Renewal",
    description: "Ask to renew your lease.",
  },
  {
    href: "/portal/move-out",
    label: "Submit Move-Out Notice",
    description: "Give notice that you intend to vacate.",
  },
];

/** Primary navigation when a future-tenant session is inside current-tenant chrome. */
export const PORTAL_FUTURE_PRIMARY_NAV: PortalNavItem[] = [
  {
    href: "/portal/future",
    label: "Leasing home",
    description: "Browse units and start an application.",
    exact: true,
  },
  {
    href: "/portal/future/units",
    label: "Available units",
    description: "Search open inventory.",
  },
  {
    href: "/portal/apply",
    label: "Move-in progress",
    description: "Track approval stage, deadlines, and readiness.",
  },
];

/** Future-tenant entry (leasing discovery + application). */
export const PORTAL_FUTURE_TENANT_LINK: PortalNavItem = {
  href: "/portal/future",
  label: "Future tenant leasing",
  description: "Browse units, schedule tours, and apply with Harborline.",
};

export type PortalPageMeta = {
  title: string;
  description: string;
};

export const PORTAL_PAGE_META: Record<string, PortalPageMeta> = {
  "/portal": {
    title: "Dashboard",
    description:
      "Rent, maintenance, lease, and notices for your current Harborline space.",
  },
  "/portal/payments": {
    title: "Payments overview",
    description:
      "Balance, due dates, autopay, saved methods, and recent transactions for your lease.",
  },
  "/portal/payments/make": {
    title: "Make a payment",
    description:
      "Multi-step mock rent payment: review balance, choose amount and method, confirm, and get a receipt.",
  },
  "/portal/payments/history": {
    title: "Payment history and receipts",
    description:
      "Search, filter, and download receipts for past payments with masked methods.",
  },
  "/portal/charges": {
    title: "Utilities, common area maintenance & fees",
    description:
      "View and pay charges beyond base rent — utilities, common area maintenance, parking, and amenity fees.",
  },
  "/portal/insurance": {
    title: "Insurance & certificates",
    description:
      "Track required insurance for personal and commercial leases and upload certificates of insurance.",
  },
  "/portal/maintenance": {
    title: "Maintenance requests",
    description:
      "Track open, scheduled, completed, and cancelled requests for your space.",
  },
  "/portal/maintenance/new": {
    title: "Submit maintenance request",
    description:
      "Describe the issue, set priority and access details, and attach photos if helpful. Not for emergencies.",
  },
  "/portal/maintenance/[id]": {
    title: "Maintenance request details",
    description: "Status, updates, and history for a single request.",
  },
  "/portal/lease": {
    title: "Lease information",
    description:
      "Property, unit, term, rent, deposit, occupants, parking, pets, renewal, and move-out details for your current occupancy.",
  },
  "/portal/documents": {
    title: "Document center",
    description:
      "Secure lease, payment, policy, inspection, notice, insurance, renewal, and move-out files authorized for your tenant account.",
  },
  "/portal/announcements": {
    title: "Announcements",
    description:
      "Property updates, service interruptions, events, safety notices, policies, and other Harborline notices.",
  },
  "/portal/messages": {
    title: "Messages",
    description:
      "Secure async messages with Harborline management — questions, follow-ups, and replies (not live chat).",
  },
  "/portal/notifications": {
    title: "Notifications",
    description:
      "In-portal alerts for rent, payments, maintenance, announcements, messages, renewals, and documents.",
  },
  "/portal/notification-preferences": {
    title: "Mobile alerts",
    description:
      "Enable mobile alerts, choose alert categories, set quiet hours, and send a test alert.",
  },
  "/portal/profile": {
    title: "Profile",
    description:
      "Update preferred contact details, emergency contacts, vehicles, pets, and communication preferences. Legal identity fields stay read-only.",
  },
  "/portal/renewal": {
    title: "Renewal request",
    description:
      "Review eligibility and terms, submit a renewal request, and track status. Submitting does not finalize the renewal.",
  },
  "/portal/move-out": {
    title: "Move-out notice",
    description:
      "Submit a move-out notice, review checklist items, and track status. Notices are not accepted until management acknowledges them.",
  },
  "/portal/apply": {
    title: "Move-in progress",
    description:
      "Approved future tenants: track stages, documents, lease signing, deposits, scheduling, and readiness before move-in.",
  },
  "/portal/start": {
    title: "Choose your path",
    description:
      "Select current tenant or future tenant to open the matching Harborline experience.",
  },
  "/portal/unauthorized": {
    title: "Unauthorized",
    description:
      "This area is only for authenticated current tenants. Choose another path if you need to apply or sign in.",
  },
  "/portal/login": {
    title: "Tenant login",
    description:
      "Sign in to the Harborline tenant portal with your lease email and password.",
  },
  "/portal/signup": {
    title: "Tenant signup",
    description:
      "Create a tenant account with a valid invitation code for your unit.",
  },
  "/portal/reset-password": {
    title: "Reset password",
    description: "Choose a new password for your tenant portal account.",
  },
};

export const PORTAL_HELP_HREF = "/portal/messages";
export const PORTAL_HELP_LABEL = "Contact management";

export function isPortalNavActive(
  pathname: string,
  item: PortalNavItem
): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function resolvePortalPageMeta(pathname: string): PortalPageMeta {
  if (PORTAL_PAGE_META[pathname]) {
    return PORTAL_PAGE_META[pathname];
  }

  const maintenanceDetail = pathname.match(/^\/portal\/maintenance\/([^/]+)$/);
  if (maintenanceDetail && maintenanceDetail[1] !== "new") {
    return {
      ...PORTAL_PAGE_META["/portal/maintenance/[id]"],
      title: "Maintenance request",
    };
  }

  return {
    title: "Tenant portal",
    description: "Manage your lease, payments, and requests with Harborline.",
  };
}

export type PortalBreadcrumb = {
  href?: string;
  label: string;
};

export function getPortalBreadcrumbs(pathname: string): PortalBreadcrumb[] {
  if (pathname === "/portal") {
    return [{ label: "Dashboard" }];
  }

  const crumbs: PortalBreadcrumb[] = [
    { href: "/portal", label: "Dashboard" },
  ];

  const segments = pathname
    .replace(/^\/portal\/?/, "")
    .split("/")
    .filter(Boolean);
  let href = "/portal";

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    href += `/${segment}`;
    const isLast = i === segments.length - 1;
    const meta = PORTAL_PAGE_META[href];

    let label =
      meta?.title ??
      segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    if (
      segments[0] === "maintenance" &&
      segment !== "maintenance" &&
      segment !== "new" &&
      isLast
    ) {
      label = "Request details";
    }

    crumbs.push(isLast ? { label } : { href, label });
  }

  return crumbs;
}
