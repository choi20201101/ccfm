/**
 * Session-level runtime overrides for configuration.
 * Allows per-session model, provider, thinking level changes.
 */

import type { CcfmConfig } from "@ccfm/shared";
import type { SessionEntry } from "@ccfm/shared";

export interface RuntimeOverrides {
  model?: string;
  provider?: string;
  thinkLevel?: string;
  verboseLevel?: string;
  authProfile?: string;
}

/** Extract runtime overrides from a session entry. */
export function extractSessionOverrides(session: SessionEntry): RuntimeOverrides {
  const overrides: RuntimeOverrides = {};

  if (session.modelOverride) overrides.model = session.modelOverride;
  if (session.providerOverride) overrides.provider = session.providerOverride;
  if (session.thinkLevelOverride) overrides.thinkLevel = session.thinkLevelOverride;
  if (session.verboseLevelOverride) overrides.verboseLevel = session.verboseLevelOverride;
  if (session.authProfileOverride) overrides.authProfile = session.authProfileOverride;

  return overrides;
}

/** Apply session overrides to a base agent config for a single request. */
export function resolveEffectiveModel(
  config: CcfmConfig,
  agentModel?: string,
  overrides?: RuntimeOverrides,
): string {
  // Priority: session override > agent config > tokens.defaultModel > agent defaults
  if (overrides?.model) return overrides.model;
  if (agentModel) return agentModel;
  if (config.tokens?.defaultModel) return config.tokens.defaultModel;
  return config.agents?.defaults?.model ?? "claude-sonnet-4-20250514";
}

/** Resolve effective provider for the current request. */
export function resolveEffectiveProvider(
  config: CcfmConfig,
  agentProvider?: string,
  overrides?: RuntimeOverrides,
): string | undefined {
  if (overrides?.provider) return overrides.provider;
  if (agentProvider) return agentProvider;
  return config.agents?.defaults?.provider;
}
