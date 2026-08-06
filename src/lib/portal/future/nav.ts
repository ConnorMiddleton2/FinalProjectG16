/**
 * Future Tenant Portal navigation and page meta.
 * Focused on leasing discovery and applicant workflows.
 */

import {
  FUTURE_APPLY,
  FUTURE_CO_APPLICANTS,
  FUTURE_DOCUMENTS,
  FUTURE_FEE,
  FUTURE_HOME,
  FUTURE_LEASE_OFFER,
  FUTURE_COMMERCIAL,
  FUTURE_LEASE_SIGN,
  FUTURE_MESSAGES,
  FUTURE_NOTIFICATIONS,
  FUTURE_ONBOARDING,
  FUTURE_PROFILE,
  FUTURE_REVIEW,
  FUTURE_SAVED,
  FUTURE_SCREENING,
  FUTURE_STATUS,
  FUTURE_TOURS,
  FUTURE_UNITS,
  FUTURE_WAITLIST,
} from "@/lib/portal/future/paths";

export type FutureNavItem = {
  href: string;
  label: string;
  description: string;
  exact?: boolean;
};

/** Primary navigation for the Future Tenant Portal. */
export const FUTURE_PRIMARY_NAV: FutureNavItem[] = [
  {
    href: FUTURE_HOME,
    label: "Home",
    description: "Find your next Harborline home and start an application.",
    exact: true,
  },
  {
    href: FUTURE_UNITS,
    label: "Available Units",
    description: "Browse and filter open Harborline inventory.",
  },
  {
    href: FUTURE_TOURS,
    label: "Schedule a Tour",
    description: "Book an in-person, virtual, or self-guided tour.",
  },
  {
    href: FUTURE_WAITLIST,
    label: "Waitlist",
    description: "Join an interest list when a home or suite is not ready yet.",
  },
  {
    href: FUTURE_APPLY,
    label: "Apply",
    description: "Start or continue your rental application.",
  },
  {
    href: FUTURE_SCREENING,
    label: "Screening",
    description: "Complete identification, income, and consent for applicant screening.",
  },
  {
    href: FUTURE_STATUS,
    label: "Application Status",
    description: "Track review progress and next required actions.",
  },
  {
    href: FUTURE_LEASE_SIGN,
    label: "Sign lease",
    description: "Review and electronically sign your lease packet.",
  },
  {
    href: FUTURE_COMMERCIAL,
    label: "Commercial package",
    description:
      "Use clause, tenant improvement allowance, guarantor, and retail sales reporting.",
  },
  {
    href: FUTURE_MESSAGES,
    label: "Messages",
    description: "Message Harborline leasing about units and applications.",
  },
  {
    href: FUTURE_PROFILE,
    label: "Applicant Profile",
    description: "Manage contact details and leasing preferences.",
  },
];

/** Header shortcuts (saved units + contact leasing). */
export const FUTURE_SHORTCUTS: FutureNavItem[] = [
  {
    href: FUTURE_SAVED,
    label: "Saved Units",
    description: "Units you saved while browsing (works signed out).",
  },
  {
    href: FUTURE_MESSAGES,
    label: "Contact Leasing",
    description: "Ask Harborline leasing a question.",
  },
];

export type FuturePageMeta = {
  title: string;
  description: string;
};

export const FUTURE_PAGE_META: Record<string, FuturePageMeta> = {
  [FUTURE_HOME]: {
    title: "Find your next home",
    description:
      "Browse Harborline communities, schedule tours, and start a rental application.",
  },
  [FUTURE_UNITS]: {
    title: "Available units",
    description:
      "Filter Harborline personal homes and commercial suites by property class, rent, size, amenities, and move-in date.",
  },
  "/portal/future/units/[id]": {
    title: "Unit details",
    description:
      "Floor plan, pricing, amenities, policies, and actions to save, tour, or apply.",
  },
  [FUTURE_SAVED]: {
    title: "Saved units",
    description:
      "Compare units you saved locally, then schedule a tour or start an application.",
  },
  [FUTURE_TOURS]: {
    title: "Schedule a tour",
    description:
      "Choose a property, tour type, and available time with Harborline leasing.",
  },
  [FUTURE_WAITLIST]: {
    title: "Interest & waitlist",
    description:
      "Join a Harborline waitlist for personal homes or commercial suites and track your place on the list.",
  },
  [FUTURE_APPLY]: {
    title: "Rental application",
    description:
      "Multi-step Harborline rental application with save-and-continue support.",
  },
  [FUTURE_SCREENING]: {
    title: "Applicant screening",
    description:
      "Upload identification and income verification, provide consent, and track screening status.",
  },
  [FUTURE_STATUS]: {
    title: "Application status",
    description:
      "See submission details, current status, timeline, and next required actions.",
  },
  [FUTURE_CO_APPLICANTS]: {
    title: "Co-applicants and occupants",
    description:
      "Add co-applicants, guarantors, and occupants for your rental application.",
  },
  [FUTURE_DOCUMENTS]: {
    title: "Application documents",
    description:
      "Upload required identification, income, and supporting documents securely.",
  },
  [FUTURE_FEE]: {
    title: "Application fee",
    description:
      "Review fee amount, refundability, and complete the mock or provider payment flow.",
  },
  [FUTURE_REVIEW]: {
    title: "Review and certification",
    description:
      "Review your answers, certifications, and submit your Harborline application.",
  },
  [FUTURE_MESSAGES]: {
    title: "Messages",
    description:
      "Async messages with Harborline leasing about units, tours, and applications.",
  },
  [FUTURE_PROFILE]: {
    title: "Applicant profile",
    description:
      "Update contact details, preferences, and review related leasing activity.",
  },
  [FUTURE_LEASE_OFFER]: {
    title: "Lease offer",
    description:
      "Review an approved lease offer, documents, deadlines, and accept or decline.",
  },
  [FUTURE_LEASE_SIGN]: {
    title: "Electronically sign lease",
    description:
      "Review lease documents and complete a typed electronic signature for your Harborline lease.",
  },
  [FUTURE_COMMERCIAL]: {
    title: "Commercial leasing package",
    description:
      "Document permitted use, tenant improvement allowance, guarantor details, and retail sales reporting for commercial suites.",
  },
  [FUTURE_ONBOARDING]: {
    title: "Move-in onboarding",
    description:
      "Complete pre-move-in tasks before transitioning to the current-tenant portal.",
  },
  [FUTURE_NOTIFICATIONS]: {
    title: "Notifications",
    description:
      "In-portal alerts for tours, applications, documents, offers, and move-in tasks.",
  },
};

export function isFutureNavActive(
  pathname: string,
  item: FutureNavItem
): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function resolveFuturePageMeta(pathname: string): FuturePageMeta {
  if (FUTURE_PAGE_META[pathname]) {
    return FUTURE_PAGE_META[pathname];
  }

  const unitDetail = pathname.match(/^\/portal\/future\/units\/([^/]+)$/);
  if (unitDetail) {
    return {
      ...FUTURE_PAGE_META["/portal/future/units/[id]"],
      title: "Unit details",
    };
  }

  return {
    title: "Future tenant portal",
    description: "Explore Harborline homes and manage your rental application.",
  };
}
