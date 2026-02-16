/**
 * Proportional token budget allocation.
 * System 5%, Tools 10%, History 65%, Response 15%, Reserve 5%.
 */

import type { TokenBudget, TokenBudgetConfig } from "@ccfm/shared";
import { TOKEN_BUDGET_RATIOS, DEFAULT_SAFETY_MARGIN_PERCENT } from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";

const log = getLogger("token-engine:budget");

/** Calculate token budget from total context window. */
export function calculateBudget(
  totalContextTokens: number,
  config?: Partial<TokenBudgetConfig>,
): TokenBudget {
  const safetyMargin = DEFAULT_SAFETY_MARGIN_PERCENT;
  const effective = Math.floor(totalContextTokens * (1 - safetyMargin));

  const systemRatio = (config?.systemPercent ?? TOKEN_BUDGET_RATIOS.system * 100) / 100;
  const toolsRatio = (config?.toolsPercent ?? TOKEN_BUDGET_RATIOS.tools * 100) / 100;
  const historyRatio = (config?.historyPercent ?? TOKEN_BUDGET_RATIOS.history * 100) / 100;
  const responseRatio = (config?.responsePercent ?? TOKEN_BUDGET_RATIOS.response * 100) / 100;
  const reserveRatio = (config?.reservePercent ?? TOKEN_BUDGET_RATIOS.reserve * 100) / 100;

  const budget: TokenBudget = {
    total: effective,
    system: Math.floor(effective * systemRatio),
    tools: Math.floor(effective * toolsRatio),
    history: Math.floor(effective * historyRatio),
    response: Math.floor(effective * responseRatio),
    reserve: Math.floor(effective * reserveRatio),
  };

  log.debug(
    { totalContextTokens, effective, budget },
    "Token budget calculated",
  );

  return budget;
}

/** Check if a message history fits within the budget. */
export function historyFitsBudget(
  historyTokens: number,
  budget: TokenBudget,
): boolean {
  return historyTokens <= budget.history;
}

/** Calculate how many tokens need to be freed by compaction. */
export function tokensToFree(
  currentHistoryTokens: number,
  budget: TokenBudget,
): number {
  const excess = currentHistoryTokens - budget.history;
  return excess > 0 ? excess : 0;
}

/** Get remaining tokens available for history. */
export function remainingHistoryTokens(
  currentHistoryTokens: number,
  budget: TokenBudget,
): number {
  return Math.max(0, budget.history - currentHistoryTokens);
}
