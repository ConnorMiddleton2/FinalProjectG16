"use client";

import { useEffect, useRef } from "react";
import {
  COLLECTIONS,
  useSharedCollection,
} from "@/hooks/useSharedCollection";
import { syncApQueueToOperatingExpense } from "@/lib/ap-queue-sync";
import { seedPayableInvoices, type PayableInvoice } from "@/lib/accounts-payable";
import { seedApPayables, type ApPayable } from "@/lib/management";

/** Keep operating-expense invoices in sync with the management AP queue. */
export function useApQueueOperatingExpenseSync() {
  const {
    items: queueItems,
    loading: queueLoading,
  } = useSharedCollection<ApPayable>(COLLECTIONS.apPayables, seedApPayables);
  const {
    items: payableInvoices,
    saveOne: savePayableInvoice,
    loading: invoicesLoading,
  } = useSharedCollection<PayableInvoice>(
    COLLECTIONS.payableInvoices,
    seedPayableInvoices
  );

  const backfillKeyRef = useRef("");

  useEffect(() => {
    if (queueLoading || invoicesLoading || queueItems.length === 0) return;

    const key = queueItems
      .map((ap) => `${ap.id}:${ap.status}:${ap.amount}:${ap.paidAt ?? ""}`)
      .join("|");
    if (key === backfillKeyRef.current) return;
    backfillKeyRef.current = key;

    void (async () => {
      for (const ap of queueItems) {
        await syncApQueueToOperatingExpense(ap, payableInvoices, savePayableInvoice);
      }
    })();
  }, [
    queueItems,
    payableInvoices,
    queueLoading,
    invoicesLoading,
    savePayableInvoice,
  ]);

  return {
    queueItems,
    payableInvoices,
    savePayableInvoice,
    loading: queueLoading || invoicesLoading,
  };
}
