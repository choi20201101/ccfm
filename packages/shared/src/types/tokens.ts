/**
 * Token optimization types — CCFM unique feature.
 */

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
}

export interface TokenBudget {
  /** Total context window size. */
  total: number;
  /** System prompt allocation (default 5%). */
  system: number;
  /** Tool definitions allocation (default 10%). */
  tools: number;
  /** Conversation history allocation (default 65%). */
  history: number;
  /** Response reservation (default 15%). */
  response: number;
  /** Safety margin (default 5%). */
  reserve: number;
}

export type CompactionTier = "free" | "cheap" | "full";

export interface CompactionResult {
  tier: CompactionTier;
  originalTokens: number;
  compactedTokens: number;
  savedTokens: number;
  strategy: string;
}

export interface TokenReport {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  estimatedCost: number;
  model: string;
  provider: string;
  timestamp: number;
  sessionKey?: string;
  compaction?: CompactionResult;
}

export type ModelComplexity = "simple" | "medium" | "complex";

export interface ModelRoutingDecision {
  selectedModel: string;
  selectedProvider: string;
  complexity: ModelComplexity;
  reason: string;
}

export interface TokenBudgetConfig {
  systemPercent: number;   // default 5
  toolsPercent: number;    // default 10
  historyPercent: number;  // default 65
  responsePercent: number; // default 15
  reservePercent: number;  // default 5
}
