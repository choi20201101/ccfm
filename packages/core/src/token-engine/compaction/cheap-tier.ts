/**
 * Tier 2: Cheap LLM compaction — uses Haiku/gpt-4o-mini for summarization.
 * Only used when free tier didn't free enough tokens.
 */

import type { Message } from "@ccfm/shared";
import { getLogger } from "../../logging/logger.js";
import { estimateTokens } from "../counter.js";

const log = getLogger("token-engine:compaction:cheap");

export interface CheapTierResult {
  messages: Message[];
  freedTokens: number;
  summarizedCount: number;
}

/** Summarization model selection. */
const CHEAP_MODELS = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
};

/**
 * Summarize older messages using a cheap LLM.
 * Takes a sendFn callback to decouple from specific provider.
 */
export async function runCheapTierCompaction(
  messages: Message[],
  targetTokensToFree: number,
  sendFn: (systemPrompt: string, userMessage: string, model: string) => Promise<string>,
  preferredProvider: "anthropic" | "openai" = "anthropic",
): Promise<CheapTierResult> {
  const model = CHEAP_MODELS[preferredProvider];
  const keepRecentCount = 6; // Keep last 3 pairs unsummarized

  if (messages.length <= keepRecentCount) {
    return { messages, freedTokens: 0, summarizedCount: 0 };
  }

  const toSummarize = messages.slice(0, -keepRecentCount);
  const recent = messages.slice(-keepRecentCount);

  // Build summarization prompt
  const conversationText = toSummarize
    .map((m) => `${m.role}: ${typeof m.content === "string" ? m.content : "[non-text content]"}`)
    .join("\n");

  const beforeTokens = estimateTokens(conversationText);

  const systemPrompt = `You are a conversation summarizer. Summarize the following conversation history into a concise summary that preserves all key information, decisions, and context needed for the conversation to continue naturally. Be thorough but concise.`;

  try {
    const summary = await sendFn(systemPrompt, conversationText, model);
    const afterTokens = estimateTokens(summary);
    const freed = beforeTokens - afterTokens;

    log.info(
      { beforeTokens, afterTokens, freed, summarizedCount: toSummarize.length, model },
      "Cheap-tier compaction complete",
    );

    // Create a summary message to replace the old messages
    const summaryMessage: Message = {
      role: "system",
      content: `[Conversation Summary]\n${summary}`,
    };

    return {
      messages: [summaryMessage, ...recent],
      freedTokens: freed,
      summarizedCount: toSummarize.length,
    };
  } catch (err) {
    log.error({ err, model }, "Cheap-tier compaction failed, returning original");
    return { messages, freedTokens: 0, summarizedCount: 0 };
  }
}
