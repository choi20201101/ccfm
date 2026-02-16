/**
 * Default values for all configuration sections.
 */

import type { CcfmConfig } from "@ccfm/shared";
import {
  GATEWAY_DEFAULT_PORT,
  GATEWAY_DEFAULT_HOST,
  DEFAULT_MAX_CONTEXT_TOKENS,
  DEFAULT_MAX_RESPONSE_TOKENS,
  DEFAULT_MAX_TOOL_RESULT_CHARS,
  SESSION_DEFAULT_MAX_HISTORY,
  AUTH_RATE_LIMIT_BASE_MS,
  AUTH_RATE_LIMIT_MAX_MS,
  AUTH_BILLING_BASE_HOURS,
  AUTH_BILLING_MAX_HOURS,
  QUEUE_DEFAULT_DEBOUNCE_MS,
  QUEUE_DEFAULT_CAP,
  TOKEN_BUDGET_RATIOS,
  CCFM_VERSION,
} from "@ccfm/shared";

export const DEFAULT_CONFIG: CcfmConfig = {
  bot: {
    name: "CCFM Bot",
    version: CCFM_VERSION,
  },

  agents: {
    defaults: {
      model: "claude-sonnet-4-20250514",
      contextTokens: DEFAULT_MAX_CONTEXT_TOKENS,
      maxTokens: DEFAULT_MAX_RESPONSE_TOKENS,
      thinkLevel: "off",
    },
    list: [],
    defaultAgentId: "default",
  },

  models: {
    providers: {},
  },

  auth: {
    order: {},
    cooldown: {
      rateLimitBaseMs: AUTH_RATE_LIMIT_BASE_MS,
      rateLimitMaxMs: AUTH_RATE_LIMIT_MAX_MS,
      billingBaseHours: AUTH_BILLING_BASE_HOURS,
      billingMaxHours: AUTH_BILLING_MAX_HOURS,
    },
  },

  channels: {},

  gateway: {
    port: GATEWAY_DEFAULT_PORT,
    host: GATEWAY_DEFAULT_HOST,
    rateLimit: {
      windowMs: 60_000,
      maxRequests: 60,
    },
  },

  hooks: {
    basePath: "/hook",
    maxBodyBytes: 1_048_576, // 1MB
  },

  queue: {
    defaults: {
      mode: "append",
      debounceMs: QUEUE_DEFAULT_DEBOUNCE_MS,
      cap: QUEUE_DEFAULT_CAP,
      dropPolicy: "fifo",
      dedupeMode: "none",
    },
    lanes: {},
  },

  plugins: {
    searchPaths: ["extensions"],
    entries: {},
  },

  tokens: {
    budget: {
      systemPercent: TOKEN_BUDGET_RATIOS.system * 100,
      toolsPercent: TOKEN_BUDGET_RATIOS.tools * 100,
      historyPercent: TOKEN_BUDGET_RATIOS.history * 100,
      responsePercent: TOKEN_BUDGET_RATIOS.response * 100,
      reservePercent: TOKEN_BUDGET_RATIOS.reserve * 100,
    },
    routing: "fixed",
    defaultModel: "claude-sonnet-4-20250514",
    maxToolResultChars: DEFAULT_MAX_TOOL_RESULT_CHARS,
    compactionStrategy: "tiered",
    cacheEnabled: true,
    monthlyBudgetUsd: null,
  },

  sessions: {
    maxHistory: SESSION_DEFAULT_MAX_HISTORY,
    transcriptFormat: "jsonl",
  },

  memory: {
    enabled: false,
    backend: "sqlite-vec",
    embeddingProvider: "openai",
  },

  cron: {
    enabled: false,
    jobs: [],
  },

  daemon: {
    enabled: false,
    platform: "auto",
  },

  security: {
    toolApprovalRequired: true,
    allowedExecCommands: [],
    blockedExecCommands: [],
    fileSystemAudit: false,
  },

  commands: {
    enabled: {},
  },

  logging: {
    level: "info",
    subsystems: {},
    redactSecrets: true,
  },
};
