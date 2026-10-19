"use client";

import { Printer } from "lucide-react";

export function InvoicePrintButton() {
  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 print:hidden"
      onClick={() => window.print()}
      type="button"
    >
      <Printer className="size-4" />
      Print invoice
    </button>
  );
}
