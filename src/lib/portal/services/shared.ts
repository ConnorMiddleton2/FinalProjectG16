/**
 * Shared service utilities for the current-tenant portal.
 *
 * ============================================================================
 * BACKEND INTEGRATION — START HERE
 * ----------------------------------------------------------------------------
 * All portal data access should go through `src/lib/portal/services/*`.
 * Hooks and components must not import mock fixtures directly for fetches.
 *
 * To connect a real backend:
 * 1. Keep the exported function signatures in each `*Service.ts` file.
 * 2. Replace the mock/store bodies with HTTP / Supabase / RPC calls.
 * 3. Map API DTOs into the models in `src/lib/portal/models`.
 * 4. Preserve `ServiceResult<T>` so UI loading/error handling stays stable.
 * 5. Remove `simulateLatency` once real network latency applies.
 * 6. Search this folder for `BACKEND_TODO` markers.
 * ============================================================================
 */

export type DataSource = "live" | "mock";

export type ServiceErrorCode =
  | "unknown"
  | "not_found"
  | "unauthorized"
  | "validation"
  | "network"
  | "conflict"
  | "forced";

export type ServiceError = {
  message: string;
  code: ServiceErrorCode;
  cause?: unknown;
};

export type ServiceSuccess<T> = {
  ok: true;
  data: T;
  source: DataSource;
};

export type ServiceFailure = {
  ok: false;
  error: ServiceError;
};

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

/** Default simulated network delay (ms) for mock reads. */
export const DEFAULT_LOAD_DELAY_MS = 400;

/** Default simulated network delay (ms) for mock writes. */
export const DEFAULT_WRITE_DELAY_MS = 700;

/**
 * Set `NEXT_PUBLIC_PORTAL_FORCE_SERVICE_ERROR=1` to force service failures.
 * Useful for verifying portal error UI without changing code.
 */
export function shouldForceServiceError(): boolean {
  return process.env.NEXT_PUBLIC_PORTAL_FORCE_SERVICE_ERROR === "1";
}

export function ok<T>(data: T, source: DataSource = "mock"): ServiceSuccess<T> {
  return { ok: true, data, source };
}

export function fail(
  message: string,
  code: ServiceErrorCode = "unknown",
  cause?: unknown
): ServiceFailure {
  return { ok: false, error: { message, code, cause } };
}

export function failFromUnknown(
  err: unknown,
  fallbackMessage: string,
  code: ServiceErrorCode = "unknown"
): ServiceFailure {
  if (err instanceof Error && err.message) {
    return fail(err.message, code, err);
  }
  return fail(fallbackMessage, code, err);
}

/**
 * Simulates network latency for mock services.
 * BACKEND_TODO: delete calls to this once live APIs are in place.
 */
export async function simulateLatency(
  ms: number = DEFAULT_LOAD_DELAY_MS,
  jitterMs = 40
): Promise<void> {
  const delay = jitterMs > 0 ? ms + Math.floor(Math.random() * jitterMs) : ms;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Throws (as a ServiceFailure path) when forced-error mode is on.
 * Call at the top of mock service methods.
 */
export function assertNotForcedError(operation: string): ServiceFailure | null {
  if (!shouldForceServiceError()) return null;
  return fail(
    `Simulated failure for "${operation}". Turn off NEXT_PUBLIC_PORTAL_FORCE_SERVICE_ERROR to resume mock success.`,
    "forced"
  );
}

/** Unwrap helper for hooks that prefer try/catch + LoadState. */
export function unwrapOrThrow<T>(result: ServiceResult<T>): {
  data: T;
  source: DataSource;
} {
  if (!result.ok) {
    const error = new Error(result.error.message);
    (error as Error & { code?: ServiceErrorCode }).code = result.error.code;
    throw error;
  }
  return { data: result.data, source: result.source };
}
