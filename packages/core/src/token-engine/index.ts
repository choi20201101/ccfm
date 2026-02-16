/**
 * Token Engine — CCFM's unique token optimization system.
 */

export { countTokens, estimateTokens, countMessagesTokens } from "./counter.js";
export { calculateBudget, historyFitsBudget, tokensToFree, remainingHistoryTokens } from "./budget.js";
export { effectiveContextWindow, safetyMarginTokens, isNearLimit } from "./safety-margin.js";
export { analyzeComplexity, routeToModel } from "./model-router.js";
export { compactMessages } from "./compaction/strategy.js";
export type { CompactionSendFn, CompactionOptions } from "./compaction/strategy.js";
export { runFreeTierCompaction } from "./compaction/free-tier.js";
export { runCheapTierCompaction } from "./compaction/cheap-tier.js";
export { supportsCaching, injectSystemCacheControl, injectToolsCacheControl } from "./cache/prompt-cache.js";
export type { CacheableContentBlock } from "./cache/prompt-cache.js";
export { getCachedResult, setCachedResult, clearResultCache, getResultCacheStats } from "./cache/result-cache.js";
export { preTruncateToolResult, contextRelativeLimit } from "./pre-truncation.js";
export { recordUsage, getUsageSummary, getTodayUsage, getMonthUsage, clearUsageData } from "./monitor.js";
export { calculateCost, createTokenReport } from "./reporter.js";
