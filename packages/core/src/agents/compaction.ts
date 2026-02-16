/**
 * Compaction trigger logic.
 * Decides when to compact and delegates to the token-engine compaction system.
 */

import type { Message, TokenBudget, CompactionResult } from "@ccfm/shared";
import {
  compactMessages,
  tokensToFree,
  type CompactionSendFn,
} from "../token-engine/index.js";
import { getLogger } from "../logging/logger.js";

const log = getLogger("agents");

/** Threshold ratio: trigger compaction when history exceeds 90% of budget. */
const COMPACTION_THRESHOLD = 0.9;

/** Check whether history tokens warrant compaction. */
export function shouldCompact(
  historyTokens: number,
  budget: TokenBudget,
): boolean {
  const threshold = Math.floor(budget.history * COMPACTION_THRESHOLD);
  const needed = historyTokens > threshold;

  if (needed) {
    log.info(
      { historyTokens, threshold, budgetHistory: budget.history },
      "Compaction needed",
    );
  }
  return needed;
}

/** Run compaction on messages to fit within the token budget. */
export async function triggerCompaction(
  messages: Message[],
  budget: TokenBudget,
  sendFn: CompactionSendFn,
): Promise<CompactionResult & { messages: Message[] }> {
  const excess = tokensToFree(messages.length, budget);

  log.info({ excess }, "Triggering compaction");

  const result = await compactMessages(messages, excess, {
    strategy: "tiered",
    sendFn,
  });

  log.info(
    { tier: result.tier, saved: result.savedTokens },
    "Compaction complete",
  );

  return result;
}
