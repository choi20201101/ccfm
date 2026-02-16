/**
 * Provider registry — singleton map of provider ID to {@link ProviderAdapter}.
 *
 * Supports both explicit registration (from config) and implicit discovery
 * (from environment variables / local services).
 */

import { getLogger } from "../logging/logger.js";
import { discoverProvidersFromEnv } from "../config/env-vars.js";
import type { ProviderAdapter } from "./types.js";

const log = getLogger("providers");

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

const providers = new Map<string, ProviderAdapter>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Register an adapter. Replaces any existing adapter with the same id. */
export function registerProvider(adapter: ProviderAdapter): void {
  log.info({ provider: adapter.providerId }, `Registered provider: ${adapter.displayName}`);
  providers.set(adapter.providerId, adapter);
}

/** Unregister an adapter by its provider id. Returns `true` if it existed. */
export function unregisterProvider(providerId: string): boolean {
  const removed = providers.delete(providerId);
  if (removed) {
    log.info({ provider: providerId }, `Unregistered provider: ${providerId}`);
  }
  return removed;
}

/** Retrieve a registered adapter by id, or `undefined` if not found. */
export function getProvider(providerId: string): ProviderAdapter | undefined {
  return providers.get(providerId);
}

/** Return all registered adapters. */
export function getAllProviders(): ReadonlyMap<string, ProviderAdapter> {
  return providers;
}

/** Check whether a provider is registered. */
export function hasProvider(providerId: string): boolean {
  return providers.has(providerId);
}

/**
 * Discover providers that can be inferred from the environment (API keys set
 * as env vars, local services like Ollama, etc.).
 *
 * This does NOT instantiate adapters — it returns the raw discovery results so
 * the caller can decide which adapters to create and register.
 */
export function discoverImplicitProviders(): Array<{
  providerId: string;
  envVar: string;
  apiKey: string;
}> {
  const discovered = discoverProvidersFromEnv();

  if (discovered.length > 0) {
    log.info(
      { providers: discovered.map((d) => d.providerId) },
      `Discovered ${discovered.length} implicit provider(s) from environment`,
    );
  } else {
    log.debug("No implicit providers discovered from environment");
  }

  return discovered;
}

/** Reset the registry (primarily useful in tests). */
export function clearProviders(): void {
  providers.clear();
  log.debug("Provider registry cleared");
}
