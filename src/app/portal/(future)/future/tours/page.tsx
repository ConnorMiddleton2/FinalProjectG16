import { Suspense } from "react";
import { FutureToursPage } from "@/components/portal/future/FutureToursPage";

export default function FutureToursRoutePage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-[var(--harbor-muted)]" role="status">
          Loading tour scheduling…
        </p>
      }
    >
      <FutureToursPage />
    </Suspense>
  );
}
