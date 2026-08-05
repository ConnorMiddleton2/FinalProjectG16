"use client";

import { Printer } from "lucide-react";

export function ContractPrintButton() {
  return (
    <button
      type="button"
      className="btn btn-neutral btn-sm gap-1 print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4" />
      Download / print PDF
    </button>
  );
}
