import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ClipboardList,
  Home,
  LayoutGrid,
  Megaphone,
  Package,
  Receipt,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import type { HrOpsModule } from "@/lib/hr";

export type OpsWindow = {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  /** When true, this entry is the operations home itself (not a department). */
  isHome?: boolean;
  /** Required HR module for non-home windows. */
  module?: HrOpsModule;
};

/** Single source of truth for ops Windows drawer and Operations home. */
export const OPS_WINDOWS: OpsWindow[] = [
  {
    href: "/ops",
    label: "Operations home",
    hint: "Welcome and employee clock in",
    icon: LayoutGrid,
    isHome: true,
  },
  {
    href: "/ops/properties",
    label: "Properties",
    hint: "Portfolio, owners, and applications",
    icon: Building2,
    module: "properties",
  },
  {
    href: "/ops/maintenance",
    label: "Maintenance",
    hint: "Work orders, vendors, and budget",
    icon: Wrench,
    module: "maintenance",
  },
  {
    href: "/ops/tenant",
    label: "Tenant",
    hint: "Leases and tenant records",
    icon: Users,
    module: "tenant",
  },
  {
    href: "/ops/ap",
    label: "Accounts payable",
    hint: "Vendor bills and owner payments",
    icon: Wallet,
    module: "ap",
  },
  {
    href: "/ops/ar",
    label: "Accounts receivable",
    hint: "Rent and miscellaneous billing",
    icon: Receipt,
    module: "ar",
  },
  {
    href: "/ops/assets",
    label: "Assets",
    hint: "PP&E, depreciation, and placed-in-service dates",
    icon: Package,
    module: "assets",
  },
  {
    href: "/ops/hr",
    label: "Human resources",
    hint: "Staffing and payroll",
    icon: ClipboardList,
    module: "hr",
  },
  {
    href: "/ops/sales-marketing",
    label: "Sales & marketing",
    hint: "Leasing pipeline and campaigns",
    icon: Megaphone,
    module: "sales-marketing",
  },
  {
    href: "/ops/management",
    label: "Management",
    hint: "Executive summary views",
    icon: Home,
    module: "management",
  },
];

/** Department windows only (excludes Operations home). */
export const OPS_DEPARTMENT_WINDOWS = OPS_WINDOWS.filter((w) => !w.isHome);

export function isOpsWindowActive(pathname: string, href: string) {
  if (href === "/ops") return pathname === "/ops";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Filter windows by HR module access. `null` allowedModules = admin (all). */
export function filterOpsWindows(
  windows: OpsWindow[],
  allowedModules: HrOpsModule[] | null
) {
  if (allowedModules === null) return windows;
  return windows.filter(
    (w) => w.isHome || (w.module != null && allowedModules.includes(w.module))
  );
}
