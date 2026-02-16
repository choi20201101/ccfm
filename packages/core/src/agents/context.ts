/**
 * Agent context building.
 * Assembles the full request context (system prompt, history, tools)
 * while respecting token budget constraints.
 */

import type { AgentConfig, Message, TokenBudget } from "@ccfm/shared";
import { calculateBudget, estimateTokens } from "../token-engine/index.js";
import { getLogger } from "../logging/logger.js";
import { resolveIdentity, buildSystemPrompt } from "./identity.js";
import { validateContextWindow } from "./context-window-guard.js";

const log = getLogger("agents");

export interface AgentContext {
  systemPrompt: string;
  messages: Message[];
  tools: unknown[];
  budget: TokenBudget;
  historyTokens: number;
}

/** Quickly estimate tokens for an array of Messages (sync). */
function estimateMessagesTokens(messages: Message[]): number {
  let total = 0;
  const perMessageOverhead = 4;
  for (const msg of messages) {
    const text = typeof msg.content === "string"
      ? msg.content
      : JSON.stringify(msg.content);
    total += estimateTokens(text) + perMessageOverhead;
  }
  return total + 2;
}

/** Build the full context for an agent turn. */
export function buildAgentContext(
  agentConfig: AgentConfig,
  sessionMessages: Message[],
  tools: unknown[],
): AgentContext {
  const contextTokens = agentConfig.defaults.contextTokens ?? 200_000;
  const validation = validateContextWindow(contextTokens);
  if (!validation.valid) {
    log.error({ warning: validation.warning }, "Invalid context window");
  }

  const budget = calculateBudget(contextTokens);
  const identity = resolveIdentity(agentConfig);
  const systemPrompt = buildSystemPrompt(identity);

  const messages = sessionMessages;
  const historyTokens = estimateMessagesTokens(messages);

  if (historyTokens > budget.history) {
    log.info(
      { historyTokens, budgetHistory: budget.history },
      "History exceeds budget, will need compaction",
    );
  }

  log.debug(
    { msgCount: messages.length, historyTokens, budget: budget.history },
    "Agent context built",
  );

  return { systemPrompt, messages, tools, budget, historyTokens };
}
