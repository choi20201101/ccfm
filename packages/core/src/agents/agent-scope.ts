/**
 * Multi-agent scope resolution.
 * Resolves agent IDs and configurations from the global CCFM config.
 */

import type { CcfmConfig, AgentConfig } from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";

const log = getLogger("agents");

/** List all configured agent IDs. Returns empty array if none. */
export function listAgentIds(config: CcfmConfig): string[] {
  const ids = (config.agents?.list ?? []).map((a) => a.id);
  log.debug({ count: ids.length }, "Listed agent IDs");
  return ids;
}

/** Resolve the default agent ID from config, falling back to the first agent. */
export function resolveDefaultAgentId(config: CcfmConfig): string {
  if (config.agents?.defaultAgentId) {
    return config.agents.defaultAgentId;
  }
  const first = config.agents?.list?.[0];
  if (first) {
    log.debug({ id: first.id }, "No defaultAgentId set, using first agent");
    return first.id;
  }
  log.warn("No agents configured, returning fallback ID 'default'");
  return "default";
}

/** Look up a specific agent's config by ID. */
export function resolveAgentConfig(
  config: CcfmConfig,
  agentId: string,
): AgentConfig | undefined {
  const agent = config.agents?.list?.find((a) => a.id === agentId);
  if (!agent) {
    log.warn({ agentId }, "Agent config not found");
  }
  return agent;
}
