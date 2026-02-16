/**
 * Complexity-based automatic model routing.
 * Simple → Haiku/gpt-4o-mini, Medium → Sonnet/gpt-4o, Complex → Opus.
 */

import type { ModelComplexity, ModelRoutingDecision } from "@ccfm/shared";
import { MODEL_COMPLEXITY_THRESHOLDS } from "@ccfm/shared";
import { estimateTokens } from "./counter.js";
import { getLogger } from "../logging/logger.js";

const log = getLogger("token-engine:router");

/** Model tiers by complexity. */
const MODEL_TIERS: Record<ModelComplexity, { anthropic: string; openai: string }> = {
  simple: {
    anthropic: "claude-haiku-4-5-20251001",
    openai: "gpt-4o-mini",
  },
  medium: {
    anthropic: "claude-sonnet-4-20250514",
    openai: "gpt-4o",
  },
  complex: {
    anthropic: "claude-opus-4-20250514",
    openai: "gpt-4o",
  },
};

/** Analyze message complexity based on length, tool usage, and patterns. */
export function analyzeComplexity(
  messageText: string,
  hasTools: boolean,
  turnCount: number,
): ModelComplexity {
  const tokens = estimateTokens(messageText);

  // Simple: short messages without tools, early in conversation
  if (
    tokens <= MODEL_COMPLEXITY_THRESHOLDS.simpleMaxTokens &&
    !hasTools &&
    turnCount <= 3
  ) {
    return "simple";
  }

  // Complex: long messages, many turns, or tool-heavy
  if (
    tokens > MODEL_COMPLEXITY_THRESHOLDS.mediumMaxTokens ||
    turnCount > 20 ||
    (hasTools && tokens > MODEL_COMPLEXITY_THRESHOLDS.simpleMaxTokens)
  ) {
    return "complex";
  }

  return "medium";
}

/** Route to optimal model based on complexity and available provider. */
export function routeToModel(
  messageText: string,
  hasTools: boolean,
  turnCount: number,
  preferredProvider: "anthropic" | "openai" = "anthropic",
): ModelRoutingDecision {
  const complexity = analyzeComplexity(messageText, hasTools, turnCount);
  const tier = MODEL_TIERS[complexity];
  const selectedModel = tier[preferredProvider];

  const decision: ModelRoutingDecision = {
    selectedModel,
    selectedProvider: preferredProvider,
    complexity,
    reason: `${complexity} complexity → ${selectedModel}`,
  };

  log.debug(decision, "Model routing decision");
  return decision;
}
