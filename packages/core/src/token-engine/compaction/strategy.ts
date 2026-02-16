/**
 * Two-tier compaction strategy.
 * Tier 1 (free) first → if insufficient, Tier 2 (cheap LLM).
 */

import type { Message, CompactionResult } from "@ccfm/shared";
import { runFreeTierCompaction } from "./free-tier.js";
import { runCheapTierCompaction } from "./cheap-tier.js";
import { getLogger } from "../../logging/logger.js";

const log = getLogger("token-engine:compaction:strategy");

export type CompactionSendFn = (
  systemPrompt: string,
  userMessage: string,
  model: string,
) => Promise<string>;

export interface CompactionOptions {
  strategy: "tiered" | "always-llm";
  preferredProvider?: "anthropic" | "openai";
  sendFn: CompactionSendFn;
}

/** Run compaction to free the specified number of tokens. */
export async function compactMessages(
  messages: Message[],
  tokensToFree: number,
  options: CompactionOptions,
): Promise<CompactionResult & { messages: Message[] }> {
  const originalTokens = messages.reduce(
    (sum, m) => sum + (typeof m.content === "string" ? m.content.length / 4 : 50),
    0,
  );

  // Strategy: always-llm skips free tier
  if (options.strategy === "always-llm") {
    const result = await runCheapTierCompaction(
      messages,
      tokensToFree,
      options.sendFn,
      options.preferredProvider,
    );
    return {
      messages: result.messages,
      tier: "cheap",
      originalTokens: Math.round(originalTokens),
      compactedTokens: Math.round(originalTokens - result.freedTokens),
      savedTokens: result.freedTokens,
      strategy: `cheap-llm (${result.summarizedCount} messages summarized)`,
    };
  }

  // Tiered strategy: Free first
  log.info({ tokensToFree }, "Starting tiered compaction");

  const freeTier = runFreeTierCompaction(messages, tokensToFree);

  if (freeTier.freedTokens >= tokensToFree) {
    log.info({ freed: freeTier.freedTokens }, "Free tier sufficient");
    return {
      messages: freeTier.messages,
      tier: "free",
      originalTokens: Math.round(originalTokens),
      compactedTokens: Math.round(originalTokens - freeTier.freedTokens),
      savedTokens: freeTier.freedTokens,
      strategy: `free (${freeTier.strategies.join(", ")})`,
    };
  }

  // Free tier insufficient — run cheap tier on remaining
  const remaining = tokensToFree - freeTier.freedTokens;
  log.info({ freed: freeTier.freedTokens, remaining }, "Free tier insufficient, running cheap tier");

  const cheapTier = await runCheapTierCompaction(
    freeTier.messages,
    remaining,
    options.sendFn,
    options.preferredProvider,
  );

  const totalFreed = freeTier.freedTokens + cheapTier.freedTokens;
  return {
    messages: cheapTier.messages,
    tier: cheapTier.freedTokens > 0 ? "cheap" : "free",
    originalTokens: Math.round(originalTokens),
    compactedTokens: Math.round(originalTokens - totalFreed),
    savedTokens: totalFreed,
    strategy: `tiered (free: ${freeTier.strategies.join(",")}; cheap: ${cheapTier.summarizedCount} summarized)`,
  };
}
