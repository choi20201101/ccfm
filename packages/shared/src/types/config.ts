/**
 * Main CCFM configuration type.
 * Matches OpenClaw's full config shape with extensions.
 */

import type { AgentConfig, AgentDefaults } from "./agents.js";
import type { ChannelConfig } from "./channels.js";
import type { GatewayConfig, HookConfig } from "./gateway.js";
import type { ModelsConfig } from "./models.js";
import type { QueueSettings } from "./queue.js";
import type { TokenBudgetConfig } from "./tokens.js";

export interface CcfmConfig {
  /** Bot metadata. */
  bot?: {
    name?: string;
    version?: string;
  };

  /** Agent configurations. */
  agents?: {
    defaults?: AgentDefaults;
    list?: AgentConfig[];
    defaultAgentId?: string;
  };

  /** Model and provider configuration. */
  models?: ModelsConfig;

  /** Auth profile ordering and policies. */
  auth?: {
    order?: Record<string, string[]>;
    cooldown?: {
      rateLimitBaseMs?: number;  // default 60_000
      rateLimitMaxMs?: number;   // default 3_600_000
      billingBaseHours?: number; // default 5
      billingMaxHours?: number;  // default 24
    };
  };

  /** Channel configurations. */
  channels?: Record<string, ChannelConfig>;

  /** Gateway server configuration. */
  gateway?: GatewayConfig;

  /** Hook configuration. */
  hooks?: Partial<HookConfig>;

  /** Queue settings per lane. */
  queue?: {
    defaults?: QueueSettings;
    lanes?: Record<string, QueueSettings>;
  };

  /** Plugin configurations. */
  plugins?: {
    /** Base directory for plugin discovery. */
    searchPaths?: string[];
    /** Per-plugin config. */
    entries?: Record<string, {
      enabled?: boolean;
      config?: Record<string, unknown>;
    }>;
  };

  /** Token optimization (CCFM unique). */
  tokens?: {
    budget?: Partial<TokenBudgetConfig>;
    routing?: "auto" | "fixed";
    defaultModel?: string;
    maxToolResultChars?: number; // default 50_000
    compactionStrategy?: "tiered" | "always-llm";
    cacheEnabled?: boolean;
    /** Monthly budget limit in USD. null = unlimited. */
    monthlyBudgetUsd?: number | null;
  };

  /** Session storage configuration. */
  sessions?: {
    storagePath?: string;
    maxHistory?: number;
    transcriptFormat?: "jsonl" | "json";
  };

  /** Memory/vector DB configuration. */
  memory?: {
    enabled?: boolean;
    backend?: "sqlite-vec" | "lancedb";
    embeddingProvider?: "openai" | "voyage" | "gemini";
    embeddingModel?: string;
    storagePath?: string;
  };

  /** Cron/scheduled jobs. */
  cron?: {
    enabled?: boolean;
    jobs?: Array<{
      name: string;
      schedule: string;
      agentId?: string;
      command: string;
      channel?: string;
    }>;
  };

  /** Daemon/service configuration. */
  daemon?: {
    enabled?: boolean;
    platform?: "auto" | "schtasks" | "systemd" | "launchd";
  };

  /** Security policies. */
  security?: {
    toolApprovalRequired?: boolean;
    allowedExecCommands?: string[];
    blockedExecCommands?: string[];
    fileSystemAudit?: boolean;
  };

  /** Commands. */
  commands?: {
    enabled?: Record<string, boolean>;
  };

  /** Logging. */
  logging?: {
    level?: "debug" | "info" | "warn" | "error";
    subsystems?: Record<string, "debug" | "info" | "warn" | "error">;
    redactSecrets?: boolean;
  };
}
