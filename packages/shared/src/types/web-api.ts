/**
 * REST API types for the web management UI.
 * CCFM unique — no OpenClaw equivalent.
 */

// --- Setup Wizard ---

export interface SetupValidateRequest {
  step: "provider" | "apiKey" | "model" | "channel" | "persona";
  data: Record<string, unknown>;
}

export interface SetupValidateResponse {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface SetupCompleteRequest {
  provider: string;
  apiKey: string;
  model: string;
  channel?: { type: string; token: string };
  persona?: { name: string; systemPrompt?: string };
}

// --- Status ---

export interface SystemStatus {
  version: string;
  uptime: number;
  channels: Array<{ id: string; name: string; connected: boolean }>;
  providers: Array<{ id: string; name: string; available: boolean; modelCount: number }>;
  activeSessions: number;
  tokenUsage: {
    today: { input: number; output: number; cost: number };
    month: { input: number; output: number; cost: number };
  };
}

// --- Token Dashboard ---

export interface TokenUsageSummary {
  period: "today" | "week" | "month" | "all";
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  estimatedCost: number;
  byModel: Array<{
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
  bySession: Array<{
    sessionKey: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
  savings: {
    compactionSaved: number;
    cachingSaved: number;
    routingSaved: number;
    totalSaved: number;
  };
}

export interface BudgetStatus {
  monthlyLimitUsd: number | null;
  currentSpendUsd: number;
  remainingUsd: number | null;
  projectedMonthEndUsd: number;
  alerts: Array<{
    level: "info" | "warning" | "critical";
    message: string;
  }>;
}

// --- Generic API ---

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}
