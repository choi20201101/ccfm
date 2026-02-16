/**
 * Model fallback logic.
 *
 * When a primary model request fails (rate limit, overloaded, billing, etc.),
 * automatically tries the next model in the provider's fallback chain.
 * Supports both intra-provider (same provider, different model) and
 * cross-provider fallback.
 */

import type { ModelInfo } from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";
import { ProviderError, RateLimitError, BillingError } from "../infra/errors.js";
import { getProvider } from "./registry.js";
import type {
  ProviderResponse,
  SendMessageOptions,
  StreamChunk,
} from "./types.js";

const log = getLogger("providers");

// ---------------------------------------------------------------------------
// Fallback chain configuration
// ---------------------------------------------------------------------------

export interface FallbackChainEntry {
  providerId: string;
  modelId: string;
}

export interface FallbackConfig {
  /** Ordered list of fallback entries. First entry is the primary. */
  chain: FallbackChainEntry[];
  /** Max number of fallback attempts (default: chain.length - 1). */
  maxAttempts?: number;
}

// ---------------------------------------------------------------------------
// Built-in fallback chains
// ---------------------------------------------------------------------------

/**
 * Default fallback chains keyed by a "primary model" pattern.
 * The caller can override these with explicit config.
 */
const DEFAULT_CHAINS: Record<string, FallbackChainEntry[]> = {
  "claude-sonnet-4-20250514": [
    { providerId: "anthropic", modelId: "claude-sonnet-4-20250514" },
    { providerId: "anthropic", modelId: "claude-3-5-haiku-20241022" },
    { providerId: "openai", modelId: "gpt-4o" },
  ],
  "claude-opus-4-20250514": [
    { providerId: "anthropic", modelId: "claude-opus-4-20250514" },
    { providerId: "anthropic", modelId: "claude-sonnet-4-20250514" },
    { providerId: "openai", modelId: "gpt-4o" },
  ],
  "gpt-4o": [
    { providerId: "openai", modelId: "gpt-4o" },
    { providerId: "openai", modelId: "gpt-4o-mini" },
    { providerId: "anthropic", modelId: "claude-sonnet-4-20250514" },
  ],
};

/**
 * Get the fallback chain for a given primary model.
 * Returns the built-in chain if one exists, otherwise a single-entry chain.
 */
export function getFallbackChain(
  primaryProviderId: string,
  primaryModelId: string,
): FallbackChainEntry[] {
  const builtin = DEFAULT_CHAINS[primaryModelId];
  if (builtin) return builtin;

  // No built-in chain; return just the primary
  return [{ providerId: primaryProviderId, modelId: primaryModelId }];
}

// ---------------------------------------------------------------------------
// Fallback-aware send
// ---------------------------------------------------------------------------

export interface FallbackResult {
  response: ProviderResponse;
  /** Which entry in the chain was ultimately used. */
  usedEntry: FallbackChainEntry;
  /** How many fallback attempts were needed (0 = primary succeeded). */
  fallbackAttempts: number;
}

/**
 * Send a message with automatic fallback through the chain.
 * On retryable errors (rate limit, 5xx, billing), the next model in the
 * chain is tried.
 */
export async function sendWithFallback(
  opts: SendMessageOptions,
  config: FallbackConfig,
): Promise<FallbackResult> {
  const maxAttempts = config.maxAttempts ?? config.chain.length;
  const errors: Array<{ entry: FallbackChainEntry; error: unknown }> = [];

  for (let i = 0; i < Math.min(maxAttempts, config.chain.length); i++) {
    const entry = config.chain[i]!;
    const adapter = getProvider(entry.providerId);

    if (!adapter) {
      log.debug(
        { provider: entry.providerId, model: entry.modelId },
        "Fallback: provider not registered, skipping",
      );
      continue;
    }

    try {
      const response = await adapter.sendMessage({
        ...opts,
        model: entry.modelId,
      });

      if (i > 0) {
        log.info(
          { provider: entry.providerId, model: entry.modelId, attempt: i + 1 },
          "Fallback succeeded",
        );
      }

      return {
        response,
        usedEntry: entry,
        fallbackAttempts: i,
      };
    } catch (err) {
      errors.push({ entry, error: err });

      if (shouldFallback(err)) {
        log.warn(
          {
            provider: entry.providerId,
            model: entry.modelId,
            attempt: i + 1,
            error: err instanceof Error ? err.message : String(err),
          },
          "Model failed, trying next in fallback chain",
        );
        continue;
      }

      // Non-retryable error: bail out immediately
      throw err;
    }
  }

  // All entries exhausted
  const lastErr = errors[errors.length - 1]?.error;
  if (lastErr instanceof Error) throw lastErr;
  throw new ProviderError(
    `All ${errors.length} model(s) in fallback chain failed`,
    config.chain[0]?.providerId ?? "unknown",
  );
}

// ---------------------------------------------------------------------------
// Fallback-aware stream
// ---------------------------------------------------------------------------

export interface FallbackStreamResult {
  stream: AsyncGenerator<StreamChunk>;
  usedEntry: FallbackChainEntry;
  fallbackAttempts: number;
}

/**
 * Start a streaming response with automatic fallback.
 * Only the initial connection attempt triggers fallback; once streaming
 * begins, errors propagate normally.
 */
export async function streamWithFallback(
  opts: SendMessageOptions,
  config: FallbackConfig,
): Promise<FallbackStreamResult> {
  const maxAttempts = config.maxAttempts ?? config.chain.length;
  const errors: Array<{ entry: FallbackChainEntry; error: unknown }> = [];

  for (let i = 0; i < Math.min(maxAttempts, config.chain.length); i++) {
    const entry = config.chain[i]!;
    const adapter = getProvider(entry.providerId);

    if (!adapter) {
      log.debug(
        { provider: entry.providerId, model: entry.modelId },
        "Fallback: provider not registered, skipping",
      );
      continue;
    }

    try {
      // Get the generator; the first `next()` call may throw on connection.
      const gen = adapter.streamMessage({ ...opts, model: entry.modelId });

      // Peek at the first chunk to verify the stream is alive.
      const first = await gen.next();

      // Wrap so the caller gets the first chunk too.
      async function* prependFirst(
        firstResult: IteratorResult<StreamChunk>,
        rest: AsyncGenerator<StreamChunk>,
      ): AsyncGenerator<StreamChunk> {
        if (!firstResult.done) {
          yield firstResult.value;
        }
        yield* rest;
      }

      if (i > 0) {
        log.info(
          { provider: entry.providerId, model: entry.modelId, attempt: i + 1 },
          "Fallback stream connected",
        );
      }

      return {
        stream: prependFirst(first, gen),
        usedEntry: entry,
        fallbackAttempts: i,
      };
    } catch (err) {
      errors.push({ entry, error: err });

      if (shouldFallback(err)) {
        log.warn(
          {
            provider: entry.providerId,
            model: entry.modelId,
            attempt: i + 1,
            error: err instanceof Error ? err.message : String(err),
          },
          "Stream connection failed, trying next in fallback chain",
        );
        continue;
      }

      throw err;
    }
  }

  const lastErr = errors[errors.length - 1]?.error;
  if (lastErr instanceof Error) throw lastErr;
  throw new ProviderError(
    `All ${errors.length} model(s) in fallback chain failed to stream`,
    config.chain[0]?.providerId ?? "unknown",
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Determine whether an error should trigger a fallback attempt. */
function shouldFallback(err: unknown): boolean {
  if (err instanceof RateLimitError) return true;
  if (err instanceof BillingError) return true;
  if (err instanceof ProviderError) return err.isRetryable;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("overloaded") ||
      msg.includes("503") ||
      msg.includes("502") ||
      msg.includes("econnrefused")
    );
  }
  return false;
}

/**
 * Build a {@link FallbackConfig} from a primary model and an optional catalog.
 * Uses the built-in fallback chains, filtered to only include providers that
 * are actually registered.
 */
export function buildFallbackConfig(
  primaryProviderId: string,
  primaryModelId: string,
  catalog?: ModelInfo[],
): FallbackConfig {
  const chain = getFallbackChain(primaryProviderId, primaryModelId);

  // Filter chain to only registered providers
  const available = chain.filter((entry) => {
    const adapter = getProvider(entry.providerId);
    return adapter !== undefined;
  });

  if (available.length === 0) {
    // At minimum, include the primary even if not registered (will fail with
    // a clear "provider not registered" error).
    return { chain: [{ providerId: primaryProviderId, modelId: primaryModelId }] };
  }

  return { chain: available };
}
