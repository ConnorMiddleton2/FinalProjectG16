"use client";

import { useEffect, useState } from "react";

/**
 * Client-only search params. Avoids Next.js `useSearchParams` Suspense
 * hydration mismatches (server fallback vs client tree).
 */
export function useClientSearchParams(): URLSearchParams {
  const [params, setParams] = useState(() => new URLSearchParams());

  useEffect(() => {
    function sync() {
      setParams(new URLSearchParams(window.location.search));
    }
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  return params;
}
