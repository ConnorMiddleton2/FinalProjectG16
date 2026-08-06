export type UserRole =
  | "owner"
  | "manager"
  | "tenant"
  | "maintenance"
  | "accounting";

export type Profile = {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export const ROLE_META: Record<
  UserRole,
  { label: string; description: string; href: string }
> = {
  owner: {
    label: "Property Owner",
    description: "See portfolio performance, approvals, and management fees.",
    href: "/owner",
  },
  manager: {
    label: "Property Manager",
    description: "Run day-to-day leasing, billing, vendors, and operations.",
    href: "/manager",
  },
  tenant: {
    label: "Tenant",
    description: "View lease info, balances, payments, and maintenance requests.",
    href: "/portal",
  },
  maintenance: {
    label: "Maintenance",
    description: "See work orders, record completion, and capture costs.",
    href: "/maintenance",
  },
  accounting: {
    label: "Accounting / Billing",
    description: "Monitor AR, deposits, revenue recognition, and profitability.",
    href: "/accounting",
  },
};

export const ALL_ROLES: UserRole[] = [
  "owner",
  "manager",
  "tenant",
  "maintenance",
  "accounting",
];
