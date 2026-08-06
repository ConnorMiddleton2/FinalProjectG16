import { Suspense } from "react";
import { FutureApplyWizard } from "@/components/portal/future/FutureApplyWizard";

export default function FutureApplyRoutePage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[var(--harbor-muted)]" role="status">
          Loading application…
        </p>
      }
    >
      <FutureApplyWizard />
    </Suspense>
  );
}
