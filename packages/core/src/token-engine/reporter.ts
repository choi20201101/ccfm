/**
 * Cost calculation and reporting.
 * Per-model pricing for accurate cost tracking.
 */

import type { TokenUsage, TokenReport } from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";

const log = getLogger("token-engine:reporter");

/** Per-million token pricing. */
interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
  cacheReadPer1M?: number;
  cacheWritePer1M?: number;
}

/** Known model pricing (per million tokens, USD). */
const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-opus-4": { inputPer1M: 15, outputPer1M: 75, cacheReadPer1M: 1.5, cacheWritePer1M: 18.75 },
  "claude-sonnet-4": { inputPer1M: 3, outputPer1M: 15, cacheReadPer1M: 0.3, cacheWritePer1M: 3.75 },
  "claude-haiku-4": { inputPer1M: 0.8, outputPer1M: 4, cacheReadPer1M: 0.08, cacheWritePer1M: 1.0 },
  "claude-3.5-sonnet": { inputPer1M: 3, outputPer1M: 15, cacheReadPer1M: 0.3, cacheWritePer1M: 3.75 },
  "claude-3.5-haiku": { inputPer1M: 0.8, outputPer1M: 4, cacheReadPer1M: 0.08, cacheWritePer1M: 1.0 },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4-turbo": { inputPer1M: 10, outputPer1M: 30 },
};

/** Resolve pricing for a model (fuzzy match by prefix). */
function resolvePricing(model: string): ModelPricing {
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];

  for (const [prefix, pricing] of Object.entries(MODEL_PRICING)) {
    if (model.startsWith(prefix)) return pricing;
  }

  // Default to Sonnet pricing as a reasonable middle ground
  return MODEL_PRICING["claude-sonnet-4"]!;
}

/** Calculate cost for a single API call. */
export function calculateCost(
  usage: TokenUsage,
  model: string,
): number {
  const pricing = resolvePricing(model);

  let cost = 0;
  cost += (usage.inputTokens / 1_000_000) * pricing.inputPer1M;
  cost += (usage.outputTokens / 1_000_000) * pricing.outputPer1M;

  if (usage.cacheReadTokens && pricing.cacheReadPer1M) {
    cost += (usage.cacheReadTokens / 1_000_000) * pricing.cacheReadPer1M;
  }
  if (usage.cacheCreationTokens && pricing.cacheWritePer1M) {
    cost += (usage.cacheCreationTokens / 1_000_000) * pricing.cacheWritePer1M;
  }

  return cost;
}

/** Create a full token report from usage data. */
export function createTokenReport(
  usage: TokenUsage,
  model: string,
  provider: string,
  sessionKey?: string,
): TokenReport {
  const cost = calculateCost(usage, model);

  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens ?? 0,
    cacheWriteTokens: usage.cacheCreationTokens ?? 0,
    estimatedCost: cost,
    model,
    provider,
    timestamp: Date.now(),
    sessionKey,
  };
}
