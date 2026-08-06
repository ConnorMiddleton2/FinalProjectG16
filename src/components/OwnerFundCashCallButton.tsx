"use client";

import { useState, useTransition } from "react";
import { fundOwnerCashCallAsOwner } from "@/app/owners/dashboard/cash-call-actions";

export function OwnerFundCashCallButton({ cashCallId }: { cashCallId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="owner-btn-primary owner-btn-primary-sm"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const result = await fundOwnerCashCallAsOwner({ cashCallId });
            if ("error" in result) {
              setMsg(result.error ?? "Could not fund cash call.");
              return;
            }
            setMsg("Funded — thank you.");
          });
        }}
      >
        {pending ? "Funding…" : "Fund cash call"}
      </button>
      {msg ? <p className="text-xs opacity-70">{msg}</p> : null}
    </div>
  );
}
