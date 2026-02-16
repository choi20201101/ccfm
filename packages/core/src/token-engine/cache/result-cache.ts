/**
 * Tool result caching.
 * Caches expensive tool call results to avoid redundant calls.
 */

import { getLogger } from "../../logging/logger.js";

const log = getLogger("token-engine:result-cache");

interface CacheEntry {
  result: string;
  timestamp: number;
  ttlMs: number;
}

const cache = new Map<string, CacheEntry>();

/** Default TTL: 5 minutes. */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** Generate a cache key from tool name and input. */
function cacheKey(toolName: string, input: unknown): string {
  return `${toolName}:${JSON.stringify(input)}`;
}

/** Get a cached tool result if available and not expired. */
export function getCachedResult(toolName: string, input: unknown): string | undefined {
  const key = cacheKey(toolName, input);
  const entry = cache.get(key);

  if (!entry) return undefined;

  if (Date.now() - entry.timestamp > entry.ttlMs) {
    cache.delete(key);
    return undefined;
  }

  log.debug({ toolName }, "Tool result cache hit");
  return entry.result;
}

/** Store a tool result in cache. */
export function setCachedResult(
  toolName: string,
  input: unknown,
  result: string,
  ttlMs = DEFAULT_TTL_MS,
): void {
  const key = cacheKey(toolName, input);
  cache.set(key, { result, timestamp: Date.now(), ttlMs });
  log.debug({ toolName, ttlMs }, "Tool result cached");
}

/** Clear all cached results. */
export function clearResultCache(): void {
  cache.clear();
}

/** Get cache statistics. */
export function getResultCacheStats(): { entries: number; oldestMs: number } {
  let oldest = Date.now();
  for (const entry of cache.values()) {
    if (entry.timestamp < oldest) oldest = entry.timestamp;
  }
  return { entries: cache.size, oldestMs: Date.now() - oldest };
}
