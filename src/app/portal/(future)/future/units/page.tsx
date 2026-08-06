import { Suspense } from "react";
import { FutureUnitsPage } from "@/components/portal/future/FutureUnitsPage";

export default function FutureUnitsRoutePage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[var(--harbor-muted)]" role="status">
          Loading available units…
        </p>
      }
    >
      <FutureUnitsPage />
    </Suspense>
  );
}
