/**
 * Shared Future Tenant Portal service helpers.
 *
 * @backend Swap `runMockService` bodies for `fetch` / Supabase clients.
 * Keep thrown `PortalServiceError` shapes so hooks can stay stable.
 */

import {
  PortalServiceError,
  maybeMockFailure,
  mockDelay,
  type MockDelayOptions,
} from "@/lib/portal/mock/delay";

export type ServiceSuccess<T> = {
  ok: true;
  data: T;
};

export type ServiceFailure = {
  ok: false;
  error: {
    message: string;
    code: string;
    status: number;
  };
};

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

export type RunMockServiceOptions = MockDelayOptions & {
  /** Probability of a simulated failure (0–1). */
  failureRate?: number;
  failureMessage?: string;
};

/**
 * Runs a mock operation with delay + optional random failure.
 * Always returns a typed result (never throws) unless `throwOnError` is true.
 */
export async function runMockService<T>(
  operation: () => T | Promise<T>,
  options: RunMockServiceOptions & { throwOnError?: boolean } = {}
): Promise<ServiceResult<T>> {
  const {
    failureRate = 0.03,
    failureMessage = "The request could not be completed. Please try again.",
    throwOnError = false,
    ...delayOptions
  } = options;

  try {
    if (typeof window !== "undefined") {
      await mockDelay(delayOptions);
      await maybeMockFailure(failureRate, failureMessage);
    }
    const data = await operation();
    return { ok: true, data };
  } catch (error) {
    const portalError =
      error instanceof PortalServiceError
        ? error
        : new PortalServiceError(
            error instanceof Error ? error.message : failureMessage,
            "UNEXPECTED"
          );

    if (throwOnError) throw portalError;

    return {
      ok: false,
      error: {
        message: portalError.message,
        code: portalError.code,
        status: portalError.status,
      },
    };
  }
}

export async function unwrapServiceResult<T>(
  result: ServiceResult<T>
): Promise<T> {
  if (!result.ok) {
    throw new PortalServiceError(
      result.error.message,
      result.error.code,
      result.error.status
    );
  }
  return result.data;
}
