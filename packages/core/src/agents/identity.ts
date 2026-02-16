/**
 * Persona and identity management.
 * Resolves an agent's display identity and builds system prompts.
 */

import type { AgentConfig } from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";

const log = getLogger("agents");

export interface ResolvedIdentity {
  name: string;
  systemPrompt: string;
  avatar: string | undefined;
}

/** Resolve an agent's identity fields, applying defaults. */
export function resolveIdentity(agentConfig: AgentConfig): ResolvedIdentity {
  const { identity } = agentConfig;
  const name = identity.name || agentConfig.id;
  const systemPrompt = identity.systemPrompt ?? `You are ${name}.`;
  const avatar = identity.avatar;

  log.debug({ agentId: agentConfig.id, name }, "Resolved identity");

  return { name, systemPrompt, avatar };
}

/** Build the final system prompt, optionally appending a suffix. */
export function buildSystemPrompt(
  identity: ResolvedIdentity,
  suffix?: string,
): string {
  if (!suffix) {
    return identity.systemPrompt;
  }
  return `${identity.systemPrompt}\n\n${suffix}`;
}
