/**
 * Mock network timing and failure helpers for Future Tenant Portal services.
 *
 * @backend Delete or bypass these helpers when calling a real API.
 */

export type MockDelayOptions = {
  /** Minimum latency in ms. */
  minMs?: number;
  /** Maximum latency in ms. */
  maxMs?: number;
};

export async function mockDelay(options: MockDelayOptions = {}): Promise<void> {
  const minMs = options.minMs ?? 180;
  const maxMs = options.maxMs ?? Math.max(minMs, 520);
  const wait = minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
  await new Promise((resolve) => {
    window.setTimeout(resolve, wait);
  });
}

/**
 * Throws with the given message when Math.random() falls under `rate`.
 * @backend Remove once the backend returns real HTTP errors.
 */
export async function maybeMockFailure(
  rate: number,
  message: string
): Promise<void> {
  if (rate <= 0) return;
  if (Math.random() < rate) {
    throw new PortalServiceError(message, "MOCK_FAILURE");
  }
}

export class PortalServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "SERVICE_ERROR", status = 500) {
    super(message);
    this.name = "PortalServiceError";
    this.code = code;
    this.status = status;
  }
}

export function isPortalServiceError(error: unknown): error is PortalServiceError {
  return error instanceof PortalServiceError;
}
