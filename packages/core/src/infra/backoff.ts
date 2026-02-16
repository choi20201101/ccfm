/**
 * Retry with exponential backoff and jitter.
 */

import { sleep } from "@ccfm/shared";
import { isTransientError } from "./errors.js";
import { getLogger } from "../logging/logger.js";

const log = getLogger("infra:backoff");

export interface RetryOptions {
  /** Max retry attempts (default: 3). */
  maxRetries?: number;
  /** Base delay in ms (default: 1000). */
  baseDelayMs?: number;
  /** Max delay cap in ms (default: 30000). */
  maxDelayMs?: number;
  /** Custom predicate for retryable errors. Defaults to isTransientError. */
  shouldRetry?: (err: unknown) => boolean;
  /** Called before each retry with attempt number and delay. */
  onRetry?: (attempt: number, delayMs: number, err: unknown) => void;
}

/** Execute a function with exponential backoff retry. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelay = options?.baseDelayMs ?? 1_000;
  const maxDelay = options?.maxDelayMs ?? 30_000;
  const shouldRetry = options?.shouldRetry ?? isTransientError;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt >= maxRetries || !shouldRetry(err)) {
        throw err;
      }

      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * baseDelay * 0.5,
        maxDelay,
      );

      log.warn(
        { attempt: attempt + 1, maxRetries, delayMs: Math.round(delay) },
        `Retrying after transient error: ${err instanceof Error ? err.message : String(err)}`,
      );

      options?.onRetry?.(attempt + 1, delay, err);

      await sleep(delay);
    }
  }

  throw lastError;
}
