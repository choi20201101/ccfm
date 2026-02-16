/**
 * Tier 1: Free compaction — no LLM calls needed.
 * Strategies: tool result truncation, old pair removal,
 * image dropping, consecutive message merge, old turn removal.
 */

import type { Message } from "@ccfm/shared";
import { DEFAULT_MAX_TOOL_RESULT_CHARS, truncate } from "@ccfm/shared";
import { getLogger } from "../../logging/logger.js";
import { estimateTokens } from "../counter.js";

const log = getLogger("token-engine:compaction:free");

export interface FreeTierResult {
  messages: Message[];
  freedTokens: number;
  strategies: string[];
}

/** Run all free-tier compaction strategies. */
export function runFreeTierCompaction(
  messages: Message[],
  targetTokensToFree: number,
): FreeTierResult {
  let current = [...messages];
  let totalFreed = 0;
  const strategies: string[] = [];

  // Strategy 1: Truncate tool results
  const toolResult = truncateToolResults(current);
  if (toolResult.freed > 0) {
    current = toolResult.messages;
    totalFreed += toolResult.freed;
    strategies.push(`tool_truncation(-${toolResult.freed})`);
  }

  if (totalFreed >= targetTokensToFree) {
    return { messages: current, freedTokens: totalFreed, strategies };
  }

  // Strategy 2: Drop images from older messages
  const imageResult = dropOldImages(current);
  if (imageResult.freed > 0) {
    current = imageResult.messages;
    totalFreed += imageResult.freed;
    strategies.push(`image_drop(-${imageResult.freed})`);
  }

  if (totalFreed >= targetTokensToFree) {
    return { messages: current, freedTokens: totalFreed, strategies };
  }

  // Strategy 3: Merge consecutive same-role messages
  const mergeResult = mergeConsecutive(current);
  if (mergeResult.freed > 0) {
    current = mergeResult.messages;
    totalFreed += mergeResult.freed;
    strategies.push(`merge_consecutive(-${mergeResult.freed})`);
  }

  if (totalFreed >= targetTokensToFree) {
    return { messages: current, freedTokens: totalFreed, strategies };
  }

  // Strategy 4: Remove oldest user-assistant pairs (keep last 5 pairs minimum)
  const removeResult = removeOldestPairs(current, targetTokensToFree - totalFreed);
  if (removeResult.freed > 0) {
    current = removeResult.messages;
    totalFreed += removeResult.freed;
    strategies.push(`old_pair_removal(-${removeResult.freed})`);
  }

  log.info({ totalFreed, strategies, targetTokensToFree }, "Free-tier compaction complete");
  return { messages: current, freedTokens: totalFreed, strategies };
}

/** Truncate tool results exceeding the hard limit. */
function truncateToolResults(messages: Message[]): { messages: Message[]; freed: number } {
  let freed = 0;
  const maxChars = DEFAULT_MAX_TOOL_RESULT_CHARS;

  const result = messages.map((msg) => {
    if (msg.role === "tool" && typeof msg.content === "string" && msg.content.length > maxChars) {
      const before = estimateTokens(msg.content);
      const truncated = truncate(msg.content, maxChars);
      const after = estimateTokens(truncated);
      freed += before - after;
      return { ...msg, content: truncated };
    }
    return msg;
  });

  return { messages: result, freed };
}

/** Drop image content blocks from older messages (keep last 3 with images). */
function dropOldImages(messages: Message[]): { messages: Message[]; freed: number } {
  let freed = 0;
  const imageMessages = messages
    .map((m, i) => ({ msg: m, idx: i }))
    .filter((x) => typeof x.msg.content !== "string" && Array.isArray(x.msg.content));

  if (imageMessages.length <= 3) return { messages, freed: 0 };

  const toDrop = imageMessages.slice(0, -3).map((x) => x.idx);
  const result = messages.map((msg, i) => {
    if (toDrop.includes(i) && Array.isArray(msg.content)) {
      const textOnly = msg.content.filter(
        (b: { type: string }) => b.type === "text",
      );
      const dropped = msg.content.filter(
        (b: { type: string }) => b.type !== "text",
      );
      freed += dropped.length * 200; // rough estimate per image
      return { ...msg, content: textOnly.length > 0 ? textOnly : [{ type: "text" as const, text: "[images removed for compaction]" }] };
    }
    return msg;
  });

  return { messages: result, freed };
}

/** Merge consecutive messages with the same role. */
function mergeConsecutive(messages: Message[]): { messages: Message[]; freed: number } {
  const result: Message[] = [];
  let freed = 0;

  for (const msg of messages) {
    const prev = result[result.length - 1];
    if (
      prev &&
      prev.role === msg.role &&
      typeof prev.content === "string" &&
      typeof msg.content === "string"
    ) {
      prev.content = prev.content + "\n" + msg.content;
      freed += 4; // per-message overhead saved
    } else {
      result.push({ ...msg });
    }
  }

  return { messages: result, freed };
}

/** Remove oldest user-assistant pairs, keeping at least 5 recent pairs. */
function removeOldestPairs(
  messages: Message[],
  tokensToFree: number,
): { messages: Message[]; freed: number } {
  if (messages.length <= 10) return { messages, freed: 0 };

  let freed = 0;
  const keepFromEnd = 10; // Keep last 10 messages (5 pairs)
  const removable = messages.slice(0, -keepFromEnd);
  const kept = messages.slice(-keepFromEnd);

  let removeCount = 0;
  for (const msg of removable) {
    if (freed >= tokensToFree) break;
    freed += typeof msg.content === "string" ? estimateTokens(msg.content) + 4 : 50;
    removeCount++;
  }

  const result = [...removable.slice(removeCount), ...kept];
  return { messages: result, freed };
}
