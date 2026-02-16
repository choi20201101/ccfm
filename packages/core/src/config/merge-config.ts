/**
 * Deep config merging with override semantics.
 * Source overrides target at leaf level. Arrays are replaced, not merged.
 */

import type { CcfmConfig } from "@ccfm/shared";
import { deepMerge } from "@ccfm/shared";

/**
 * Merge multiple config layers (e.g., defaults + file + env overrides).
 * Later layers override earlier ones.
 */
export function mergeConfigs(...layers: Partial<CcfmConfig>[]): CcfmConfig {
  let result: CcfmConfig = {} as CcfmConfig;

  for (const layer of layers) {
    result = deepMerge(
      result as Record<string, unknown>,
      layer as Record<string, unknown>,
    ) as unknown as CcfmConfig;
  }

  return result;
}

/**
 * Apply runtime overrides (e.g., from session or CLI flags).
 * Only applies defined values from overrides.
 */
export function applyRuntimeOverrides(
  config: CcfmConfig,
  overrides: Partial<CcfmConfig>,
): CcfmConfig {
  return mergeConfigs(config, overrides);
}
