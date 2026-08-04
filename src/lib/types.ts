export type UserRole =
  | "executive"
  | "manager"
  | "maintenance"
  | "accounting"
  | "owner"
  | "tenant"
  | "vendor";

export type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type NavItem = {
  href: string;
  label: string;
};

export type RoleMeta = {
  label: string;
  description: string;
  href: string;
  /** Pages this role may open */
  allowedPaths: string[];
  /** Primary nav links for this role */
  nav: NavItem[];
  /** Actions shown as available in the role workspace */
  allowedActions: string[];
  /** Explicitly blocked capabilities (shown for demos) */
  restrictedActions: string[];
};

export const ROLE_META: Record<UserRole, RoleMeta> = {
  executive: {
    label: "Property Management Executive",
    description:
      "Oversee portfolio performance, major approvals, and company profitability.",
    href: "/executive",
    allowedPaths: ["/executive", "/workspace", "/accounting"],
    nav: [
      { href: "/executive", label: "Executive overview" },
      { href: "/accounting", label: "Profitability reports" },
      { href: "/workspace", label: "Role hub" },
    ],
    allowedActions: [
      "View company and property profitability",
      "Review portfolio performance",
      "Approve major expenses",
      "Review management-fee results",
    ],
    restrictedActions: [
      "Edit day-to-day accounting transactions",
      "Submit tenant maintenance requests",
      "Record vendor field work",
    ],
  },
  manager: {
    label: "Property Manager",
    description:
      "Run day-to-day leasing, tenant relationships, vendors, and collections follow-up.",
    href: "/manager",
    allowedPaths: ["/manager", "/workspace", "/maintenance"],
    nav: [
      { href: "/manager", label: "Operations" },
      { href: "/maintenance", label: "Work-order board" },
      { href: "/workspace", label: "Role hub" },
    ],
    allowedActions: [
      "Manage properties and units",
      "Manage leases and renewals",
      "Coordinate maintenance work orders",
      "Follow up on rent roll / AR",
    ],
    restrictedActions: [
      "Edit general-ledger accounting entries",
      "View internal executive-only profitability packages",
      "Access another tenant’s private payment portal",
    ],
  },
  maintenance: {
    label: "Maintenance Coordinator",
    description:
      "Dispatch work orders, coordinate vendors, and track maintenance costs.",
    href: "/maintenance",
    allowedPaths: ["/maintenance", "/workspace", "/vendor"],
    nav: [
      { href: "/maintenance", label: "Coordinator board" },
      { href: "/vendor", label: "Vendor assignments" },
      { href: "/workspace", label: "Role hub" },
    ],
    allowedActions: [
      "Create and assign work orders",
      "Coordinate vendors and technicians",
      "Track maintenance costs",
      "Review completion status",
    ],
    restrictedActions: [
      "View tenant payment records",
      "Edit accounting transactions",
      "View owner profitability reports",
    ],
  },
  accounting: {
    label: "Accounting and Billing",
    description:
      "Monitor AR, deposits, revenue recognition, billing, and profitability.",
    href: "/accounting",
    allowedPaths: ["/accounting", "/workspace"],
    nav: [
      { href: "/accounting", label: "Billing & AR" },
      { href: "/workspace", label: "Role hub" },
    ],
    allowedActions: [
      "Create and edit rent invoices",
      "Record tenant payments and receipts",
      "Track security deposit liability",
      "Recognize earned vs unearned rent",
      "View profitability by property / owner",
    ],
    restrictedActions: [
      "Assign field technicians",
      "Edit lease terms as property manager",
      "Submit work as an external vendor",
    ],
  },
  owner: {
    label: "Property Owner Client",
    description:
      "Review portfolio results, statements, approvals, and management fees.",
    href: "/owner",
    allowedPaths: ["/owner", "/workspace"],
    nav: [
      { href: "/owner", label: "Owner portfolio" },
      { href: "/workspace", label: "Role hub" },
    ],
    allowedActions: [
      "View portfolio summary by property",
      "View owner statements",
      "Approve major expenses",
      "View management fee summary",
    ],
    restrictedActions: [
      "Edit accounting transactions",
      "View other owners’ confidential data",
      "Access tenant payment portals",
      "Dispatch vendors",
    ],
  },
  tenant: {
    label: "Tenant",
    description:
      "View lease info, balances, payments, and submit maintenance requests.",
    href: "/tenant",
    allowedPaths: ["/tenant", "/workspace"],
    nav: [
      { href: "/tenant", label: "Tenant portal" },
      { href: "/workspace", label: "Role hub" },
    ],
    allowedActions: [
      "View lease summary",
      "View current balance and invoices",
      "View own payment history",
      "Submit maintenance requests",
    ],
    restrictedActions: [
      "View internal profitability reports",
      "View other tenants’ records",
      "Edit accounting transactions",
      "Access owner or executive dashboards",
    ],
  },
  vendor: {
    label: "Vendor / Maintenance Technician",
    description:
      "See assigned work orders, confirm completion, and capture time and materials.",
    href: "/vendor",
    allowedPaths: ["/vendor", "/workspace"],
    nav: [
      { href: "/vendor", label: "My work orders" },
      { href: "/workspace", label: "Role hub" },
    ],
    allowedActions: [
      "View assigned work orders",
      "Confirm arrival / completion",
      "Enter time and materials",
      "Request approval for ad hoc work",
    ],
    restrictedActions: [
      "View tenant payment records",
      "View profitability reports",
      "Edit invoices or accounting transactions",
      "Access owner portfolio data",
    ],
  },
};

export const ALL_ROLES: UserRole[] = [
  "executive",
  "manager",
  "maintenance",
  "accounting",
  "owner",
  "tenant",
  "vendor",
];

export const DEFAULT_ROLE: UserRole = "manager";

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && ALL_ROLES.includes(value as UserRole);
}
