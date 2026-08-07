/**
 * Tenant portal navigation.
 * Private `/portal` routes require an authenticated tenant session.
 * Public entry is `/portal/start` (browse) and `/portal/start/apply`.
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
    description: "Balance due, late fees, payment options, and payment history.",
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
    href: "/portal/announcements",
    label: "Announcements",
    description: "Building and property notices.",
  },
  {
    href: "/portal/messages",
    label: "Messages",
    description: "Message CPMC management.",
  },
  {
    href: "/portal/profile",
    label: "Profile",
    description: "Update contact and household details.",
  },
];

/** Secondary actions for current tenants (kept empty — renewals/move-out handled offline). */
export const PORTAL_SECONDARY_ACTIONS: PortalNavItem[] = [];

export type PortalPageMeta = {
  title: string;
  description: string;
};

export const PORTAL_PAGE_META: Record<string, PortalPageMeta> = {
  "/portal": {
    title: "Dashboard",
    description:
      "Rent, maintenance, lease, and notices for your current CPMC space.",
  },
  "/portal/payments": {
    title: "Payments",
    description:
      "See your current or next bill, choose debit, check, or ACH, and review payment history.",
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
      "Property updates, service interruptions, events, safety notices, policies, and other CPMC notices.",
  },
  "/portal/messages": {
    title: "Messages",
    description:
      "Secure async messages with CPMC management — questions, follow-ups, and replies (not live chat).",
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
    title: "Start application",
    description: "Redirects to the public application form.",
  },
  "/portal/start": {
    title: "Browse properties",
    description:
      "Browse CPMC properties, start an application, or sign in to your tenant dashboard.",
  },
  "/portal/unauthorized": {
    title: "Unauthorized",
    description:
      "This area is only for authenticated tenants. Apply or sign in from the tenant welcome path.",
  },
  "/portal/login": {
    title: "Tenant login",
    description:
      "Sign in to the CPMC tenant portal with your lease email and password.",
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
    description: "Manage your lease and requests with CPMC.",
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
