/**
 * Agent configuration types.
 * Matches OpenClaw's multi-agent, identity, and subagent system.
 */

export interface AgentIdentity {
  name: string;
  description?: string;
  avatar?: string;
  /** System prompt template. Supports ${var} substitution. */
  systemPrompt?: string;
  /** IDENTITY.md file path for extended persona definition. */
  identityFile?: string;
}

export interface AgentDefaults {
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  contextTokens?: number;
  thinkLevel?: ThinkLevel;
  reasoningLevel?: ReasoningLevel;
  /** Heartbeat configuration for proactive replies. */
  heartbeat?: {
    enabled: boolean;
    intervalMs: number;
    target?: string; // channel to send heartbeat to
  };
}

export interface AgentConfig {
  id: string;
  identity: AgentIdentity;
  defaults: AgentDefaults;
  /** Skills this agent can use. */
  skills?: string[];
  /** Subagent configurations. */
  subagents?: SubagentConfig[];
  /** Group chat behavior. */
  groupChat?: {
    activateOnMention: boolean;
    activateOnReply: boolean;
    activateOnKeyword?: string[];
  };
  /** Per-agent tool policies. */
  toolPolicy?: {
    allowedTools?: string[];
    blockedTools?: string[];
    requireApproval?: string[];
  };
}

export interface SubagentConfig {
  id: string;
  model?: string;
  systemPrompt?: string;
  maxDepth?: number;
}

export type ThinkLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
export type VerboseLevel = "off" | "on" | "full";
export type NoticeLevel = "off" | "on" | "full";
export type ElevatedLevel = "off" | "on" | "ask" | "full";
export type ReasoningLevel = "off" | "on" | "stream";
export type UsageDisplayLevel = "off" | "tokens" | "full";
