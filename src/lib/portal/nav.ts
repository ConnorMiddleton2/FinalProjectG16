/**
 * Tenant portal (main-dash “I am a tenant or future tenant”) navigation.
 * Paths live under /portal — public, not the team/ops /tenant role shell.
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

/** Future-tenant entry (applications / onboarding). */
export const PORTAL_FUTURE_TENANT_LINK: PortalNavItem = {
  href: "/portal/apply",
  label: "Apply for a property",
  description: "Start an application if you are looking for space.",
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
    description: "Property and building notices from Harborline.",
  },
  "/portal/messages": {
    title: "Messages",
    description: "Secure messages with property management.",
  },
  "/portal/profile": {
    title: "Profile",
    description:
      "Contact information, emergency contacts, and notification preferences.",
  },
  "/portal/renewal": {
    title: "Renewal request",
    description: "Ask to renew your lease and track the request status.",
  },
  "/portal/move-out": {
    title: "Move-out notice",
    description:
      "Give notice that you intend to vacate and track next steps.",
  },
  "/portal/apply": {
    title: "Apply for a property",
    description:
      "Future tenants can submit an application, review contracts, and check billing.",
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
