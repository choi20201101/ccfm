/**
 * Enhanced fetch wrapper with timeout, retry, and logging.
 */

import { getLogger } from "../logging/logger.js";
import { withRetry } from "./backoff.js";

const log = getLogger("infra:fetch");

export interface FetchOptions extends RequestInit {
  /** Timeout in ms (default: 30000). */
  timeoutMs?: number;
  /** Max retries for transient errors (default: 2). */
  maxRetries?: number;
  /** Whether to log the request (default: true). */
  logRequest?: boolean;
}

/** Fetch with timeout, retry, and structured logging. */
export async function ccfmFetch(
  url: string,
  options?: FetchOptions,
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const maxRetries = options?.maxRetries ?? 2;
  const logRequest = options?.logRequest ?? true;

  return withRetry(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        if (logRequest) {
          log.debug({ method: options?.method ?? "GET", url }, "Outbound request");
        }

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        if (logRequest) {
          log.debug(
            { status: response.status, url },
            "Response received",
          );
        }

        // Throw on server errors so retry kicks in
        if (response.status >= 500) {
          throw Object.assign(
            new Error(`HTTP ${response.status}: ${response.statusText}`),
            { status: response.status, isTransient: true },
          );
        }

        return response;
      } finally {
        clearTimeout(timeout);
      }
    },
    {
      maxRetries,
      shouldRetry: (err) => {
        if (err && typeof err === "object" && "isTransient" in err) return true;
        if (err instanceof Error && err.name === "AbortError") return true;
        return false;
      },
    },
  );
}
