/**
 * CPMC staffing model (property + corporate) for HR / payroll demos.
 * Ratios approximate 2025–2026 multifamily / commercial PM norms:
 *   PM ~150–200 doors · leasing ~100–125 occupied · tech ~80–120 units.
 */

export type StaffingRoleSpec = {
  jobTitle: string;
  department: string;
  category: "corporate" | "property";
  payType: "salary" | "hourly";
  /** Annual salary or hourly rate. */
  payRate: number;
  payFrequency: "weekly" | "biweekly" | "semimonthly" | "monthly";
  count: number;
};

export function corporateStaffing(): StaffingRoleSpec[] {
  return [
    {
      jobTitle: "VP of Property Management",
      department: "management",
      category: "corporate",
      payType: "salary",
      payRate: 115000,
      payFrequency: "biweekly",
      count: 1,
    },
    {
      jobTitle: "Regional Property Director",
      department: "management",
      category: "corporate",
      payType: "salary",
      payRate: 98000,
      payFrequency: "biweekly",
      count: 1,
    },
    {
      jobTitle: "Controller",
      department: "accounting",
      category: "corporate",
      payType: "salary",
      payRate: 105000,
      payFrequency: "biweekly",
      count: 1,
    },
    {
      jobTitle: "Accounts Receivable Specialist",
      department: "accounting",
      category: "corporate",
      payType: "salary",
      payRate: 58000,
      payFrequency: "biweekly",
      count: 1,
    },
    {
      jobTitle: "Accounts Payable Specialist",
      department: "accounting",
      category: "corporate",
      payType: "salary",
      payRate: 56000,
      payFrequency: "biweekly",
      count: 1,
    },
    {
      jobTitle: "HR Generalist",
      department: "hr",
      category: "corporate",
      payType: "salary",
      payRate: 72000,
      payFrequency: "biweekly",
      count: 1,
    },
    {
      jobTitle: "Payroll Coordinator",
      department: "hr",
      category: "corporate",
      payType: "salary",
      payRate: 62000,
      payFrequency: "biweekly",
      count: 1,
    },
    {
      jobTitle: "Sales & Marketing Manager",
      department: "leasing",
      category: "corporate",
      payType: "salary",
      payRate: 78000,
      payFrequency: "biweekly",
      count: 1,
    },
    {
      jobTitle: "Leasing Marketing Coordinator",
      department: "leasing",
      category: "corporate",
      payType: "salary",
      payRate: 52000,
      payFrequency: "biweekly",
      count: 1,
    },
  ];
}

/** On-site / assigned staff headcount scaled by unit count and asset class. */
export function propertyStaffing(input: {
  units: number;
  propertyType: string;
}): StaffingRoleSpec[] {
  const units = input.units;
  const isOffice = input.propertyType === "office";
  const roles: StaffingRoleSpec[] = [];

  // Property manager — 1 per asset; large multifamily gets an assistant
  roles.push({
    jobTitle: isOffice ? "Commercial Property Manager" : "Community Manager",
    department: "management",
    category: "property",
    payType: "salary",
    payRate: isOffice ? 82000 : units >= 200 ? 75000 : units >= 80 ? 68000 : 62000,
    payFrequency: "biweekly",
    count: 1,
  });

  if (units >= 200 && !isOffice) {
    roles.push({
      jobTitle: "Assistant Community Manager",
      department: "management",
      category: "property",
      payType: "salary",
      payRate: 52000,
      payFrequency: "biweekly",
      count: 1,
    });
  }

  // Leasing — roughly 1 per 100–125 doors (office: fewer, suite leasing)
  const leasingCount = isOffice
    ? units >= 40
      ? 1
      : 1
    : Math.max(1, Math.ceil(units / 120));
  roles.push({
    jobTitle: isOffice ? "Office Leasing Associate" : "Leasing Consultant",
    department: "leasing",
    category: "property",
    payType: "salary",
    payRate: isOffice ? 55000 : 48000,
    payFrequency: "biweekly",
    count: leasingCount,
  });

  // Maintenance — techs ~1 / 90–110 units; supervisor on larger assets
  if (!isOffice) {
    if (units >= 150) {
      roles.push({
        jobTitle: "Maintenance Supervisor",
        department: "maintenance",
        category: "property",
        payType: "salary",
        payRate: 62000,
        payFrequency: "biweekly",
        count: 1,
      });
    }
    const techCount = Math.max(1, Math.ceil(units / 100));
    roles.push({
      jobTitle: "Maintenance Technician",
      department: "maintenance",
      category: "property",
      payType: "hourly",
      payRate: units >= 200 ? 32 : 28,
      payFrequency: "weekly",
      count: techCount,
    });
  } else {
    roles.push({
      jobTitle: units >= 40 ? "Chief Engineer" : "Building Engineer",
      department: "maintenance",
      category: "property",
      payType: "salary",
      payRate: units >= 40 ? 72000 : 64000,
      payFrequency: "biweekly",
      count: 1,
    });
    if (units >= 60) {
      roles.push({
        jobTitle: "Assistant Engineer",
        department: "maintenance",
        category: "property",
        payType: "hourly",
        payRate: 30,
        payFrequency: "weekly",
        count: 1,
      });
    }
  }

  return roles;
}
