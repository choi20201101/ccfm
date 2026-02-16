/**
 * Pure utility functions shared across packages.
 * No Node.js dependencies — safe for browser use.
 */

/** Deep-clone a JSON-serializable value. */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** Deep merge two objects. Source overrides target. Arrays are replaced. */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };
  for (const key of Object.keys(source) as Array<keyof T>) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv !== null &&
      typeof sv === "object" &&
      !Array.isArray(sv) &&
      tv !== null &&
      typeof tv === "object" &&
      !Array.isArray(tv)
    ) {
      result[key] = deepMerge(
        tv as Record<string, unknown>,
        sv as Record<string, unknown>,
      ) as T[keyof T];
    } else if (sv !== undefined) {
      result[key] = sv as T[keyof T];
    }
  }
  return result;
}

/** Safe JSON parse with fallback. */
export function safeJsonParse<T = unknown>(
  text: string,
  fallback: T,
): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/** Truncate a string to maxLen, appending suffix if truncated. */
export function truncate(
  str: string,
  maxLen: number,
  suffix = "…[truncated]",
): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - suffix.length) + suffix;
}

/** Sleep for given milliseconds. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a short random ID (12 hex chars). */
export function shortId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Mask a secret string, showing only the last 4 characters. */
export function maskSecret(secret: string): string {
  if (secret.length <= 4) return "****";
  return "****" + secret.slice(-4);
}

/** Format token count with K/M suffix. */
export function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

/** Format USD cost with appropriate precision. */
export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

/** Clamp a number between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Calculate exponential backoff with jitter. */
export function exponentialBackoff(
  attempt: number,
  baseMs: number,
  maxMs: number,
): number {
  const delay = Math.min(baseMs * Math.pow(2, attempt), maxMs);
  const jitter = delay * 0.1 * Math.random();
  return delay + jitter;
}

/** Check if a string matches a glob-like pattern (simple *, ** support). */
export function simpleGlobMatch(pattern: string, str: string): boolean {
  const regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "§")
    .replace(/\*/g, "[^/]*")
    .replace(/§/g, ".*");
  return new RegExp(`^${regex}$`).test(str);
}

/** Debounce a function call. */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Pick specified keys from an object. */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/** Omit specified keys from an object. */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}
