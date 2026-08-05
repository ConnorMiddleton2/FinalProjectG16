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
  due: string;
  status: "Paid" | "Due" | "Overdue";
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

export function seedTenantInvoices(): TenantInvoice[] {
  return [
    {
      id: "i1",
      label: "April rent · Pier 12",
      amount: "$4,800.00",
      due: "Apr 1, 2026",
      status: "Paid",
    },
    {
      id: "i2",
      label: "May rent · Pier 12",
      amount: "$4,800.00",
      due: "May 1, 2026",
      status: "Due",
    },
    {
      id: "i3",
      label: "Late fee · Canal Yard",
      amount: "$75.00",
      due: "Mar 15, 2026",
      status: "Overdue",
    },
  ];
}
