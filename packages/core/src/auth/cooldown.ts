/**
 * Exponential backoff cooldown for failed auth profiles.
 *
 * Rate limit:  5^(n-1) minutes, capped at 1 hour
 *   n=1 -> 1 min, n=2 -> 5 min, n=3 -> 25 min, n=4+ -> 60 min (cap)
 *
 * Billing:     2^(n-1) * 5 hours, capped at 24 hours
 *   n=1 -> 5h, n=2 -> 10h, n=3 -> 20h, n=4+ -> 24h (cap)
 *
 * Other reasons (auth, format, timeout, unknown): linear backoff with
 *   base of 1 minute per failure, capped at 30 minutes.
 */

import type {
  AuthProfileFailureReason,
  ProfileUsageStats,
} from "@ccfm/shared";
import {
  AUTH_RATE_LIMIT_BASE_MS,
  AUTH_RATE_LIMIT_MAX_MS,
  AUTH_BILLING_BASE_HOURS,
  AUTH_BILLING_MAX_HOURS,
} from "@ccfm/shared";

/** Milliseconds per hour. */
const MS_PER_HOUR = 3_600_000;

/** Milliseconds per minute. */
const MS_PER_MINUTE = 60_000;

/** Max cooldown for generic failures (30 minutes). */
const GENERIC_MAX_MS = 30 * MS_PER_MINUTE;

/**
 * Calculate cooldown duration in milliseconds for a given failure count and reason.
 *
 * @param failureCount - Number of consecutive failures of this type (1-based).
 * @param reason - The category of failure.
 * @returns Cooldown duration in milliseconds.
 */
export function calculateCooldown(
  failureCount: number,
  reason: AuthProfileFailureReason,
): number {
  const n = Math.max(1, failureCount);

  switch (reason) {
    case "rate_limit": {
      // 5^(n-1) minutes, capped at AUTH_RATE_LIMIT_MAX_MS (1 hour)
      const delayMs = Math.pow(5, n - 1) * AUTH_RATE_LIMIT_BASE_MS;
      return Math.min(delayMs, AUTH_RATE_LIMIT_MAX_MS);
    }

    case "billing": {
      // 2^(n-1) * 5 hours, capped at AUTH_BILLING_MAX_HOURS (24 hours)
      const delayHours = Math.pow(2, n - 1) * AUTH_BILLING_BASE_HOURS;
      const cappedHours = Math.min(delayHours, AUTH_BILLING_MAX_HOURS);
      return cappedHours * MS_PER_HOUR;
    }

    case "auth":
    case "format":
    case "timeout":
    case "unknown":
    default: {
      // Linear backoff: n minutes, capped at 30 minutes
      const delayMs = n * MS_PER_MINUTE;
      return Math.min(delayMs, GENERIC_MAX_MS);
    }
  }
}

/**
 * Check whether a profile is currently in cooldown.
 *
 * @param stats - The profile's usage statistics.
 * @returns true if the profile is in cooldown and should be skipped.
 */
export function isInCooldown(stats: ProfileUsageStats): boolean {
  if (stats.cooldownUntil == null) return false;
  return Date.now() < stats.cooldownUntil;
}
