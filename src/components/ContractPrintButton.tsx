"use client";

import { Printer } from "lucide-react";

export function ContractPrintButton() {
  return (
    <button
      type="button"
      className="owner-btn-secondary owner-btn-secondary-sm gap-1 print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4" />
      Download / print PDF
    </button>
  );
}
