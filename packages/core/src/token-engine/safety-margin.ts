/**
 * Safety margin calculation.
 * CCFM uses 5% explicit margin vs OpenClaw's implicit ~44%.
 */

import { DEFAULT_SAFETY_MARGIN_PERCENT } from "@ccfm/shared";

/** Calculate the effective context window after safety margin. */
export function effectiveContextWindow(
  totalTokens: number,
  marginPercent = DEFAULT_SAFETY_MARGIN_PERCENT,
): number {
  return Math.floor(totalTokens * (1 - marginPercent));
}

/** Calculate the safety margin in tokens. */
export function safetyMarginTokens(
  totalTokens: number,
  marginPercent = DEFAULT_SAFETY_MARGIN_PERCENT,
): number {
  return totalTokens - effectiveContextWindow(totalTokens, marginPercent);
}

/** Check if we're dangerously close to the context limit. */
export function isNearLimit(
  usedTokens: number,
  totalTokens: number,
  thresholdPercent = 0.90,
): boolean {
  return usedTokens >= totalTokens * thresholdPercent;
}
