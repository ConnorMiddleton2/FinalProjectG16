import { Suspense } from "react";
import { ProspectApplyForm } from "@/components/portal/ProspectApplyForm";

export default function PortalApplyPage() {
  return (
    <Suspense fallback={<p className="p-10 text-sm opacity-60">Loading…</p>}>
      <ProspectApplyForm />
    </Suspense>
  );
}
