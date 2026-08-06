export type TenantContract = {
  id: string;
  property: string;
  term: string;
  rent: string;
  status: "Active" | "Renewal pending";
};

export type TenantInvoice = {
  id: string;
  label: string;
  amount: string;
  /** Display due string (legacy portal). */
  due: string;
  status: "Paid" | "Due" | "Overdue";
  /** Managed property id when known (AR ↔ Management budgets). */
  propertyId?: string;
  propertyName?: string;
  /** ISO date preferred for year/month attribution. */
  dueDate?: string;
  /** ISO date when marked Paid — used for revenue year. */
  paidAt?: string;
};

export function emptyTenantContract(): Omit<TenantContract, "id"> {
  return {
    property: "",
    term: "",
    rent: "",
    status: "Active",
  };
}

export function emptyTenantInvoice(): Omit<TenantInvoice, "id"> {
  return {
    label: "",
    amount: "",
    due: "",
    status: "Due",
    propertyId: "",
    propertyName: "",
    dueDate: "",
    paidAt: "",
  };
}

export function seedTenantContracts(): TenantContract[] {
  return [
    {
      id: "c1",
      property: "Pier 12 · Suite 210",
      term: "Jan 2026 – Dec 2027",
      rent: "$4,800 / mo",
      status: "Active",
    },
    {
      id: "c2",
      property: "Canal Yard · Unit B",
      term: "Expired · renewal offered",
      rent: "$2,150 / mo",
      status: "Renewal pending",
    },
  ];
}

function monthDue(year: number, monthIndex: number, day = 1) {
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Seed paid AR history so Management budgets can pull exact prior-year revenue. */
export function seedTenantInvoices(): TenantInvoice[] {
  const thisYear = new Date().getFullYear();
  const prior = thisYear - 1;
  const invoices: TenantInvoice[] = [];

  const properties = [
    {
      key: "harborline",
      propertyName: "Harborline Commons",
      monthly: 86000,
    },
    {
      key: "pier12",
      propertyName: "Pier 12",
      monthly: 4800,
    },
    {
      key: "canal",
      propertyName: "Canal Yard",
      monthly: 2150,
    },
  ];

  for (const prop of properties) {
    // Full prior year paid
    for (let m = 0; m < 12; m++) {
      const dueDate = monthDue(prior, m);
      invoices.push({
        id: `ar-${prop.key}-${prior}-${m + 1}`,
        label: `${new Date(prior, m, 1).toLocaleString("en", { month: "short" })} rent · ${prop.propertyName}`,
        amount: `$${prop.monthly.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        due: new Date(prior, m, 1).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        dueDate,
        paidAt: monthDue(prior, m, 5),
        status: "Paid",
        propertyName: prop.propertyName,
      });
    }
    // Current year: paid through last completed month
    const now = new Date();
    const monthsPaid =
      now.getFullYear() === thisYear ? now.getMonth() : 12; // 0-based → count of completed months
    for (let m = 0; m < monthsPaid; m++) {
      const dueDate = monthDue(thisYear, m);
      invoices.push({
        id: `ar-${prop.key}-${thisYear}-${m + 1}`,
        label: `${new Date(thisYear, m, 1).toLocaleString("en", { month: "short" })} rent · ${prop.propertyName}`,
        amount: `$${prop.monthly.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        due: new Date(thisYear, m, 1).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        dueDate,
        paidAt: monthDue(thisYear, m, 5),
        status: "Paid",
        propertyName: prop.propertyName,
      });
    }
    // Current month due (unpaid)
    if (now.getFullYear() === thisYear) {
      const m = now.getMonth();
      invoices.push({
        id: `ar-${prop.key}-${thisYear}-${m + 1}-due`,
        label: `${new Date(thisYear, m, 1).toLocaleString("en", { month: "short" })} rent · ${prop.propertyName}`,
        amount: `$${prop.monthly.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        due: new Date(thisYear, m, 1).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        dueDate: monthDue(thisYear, m),
        status: "Due",
        propertyName: prop.propertyName,
      });
    }
  }

  return invoices;
}
