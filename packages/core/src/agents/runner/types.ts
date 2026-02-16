/**
 * Runner types for the agent execution loop.
 */

import type { Message, TokenUsage, ConversationTurn } from "@ccfm/shared";
import type { ProviderAdapter, ToolCallResult } from "../../providers/types.js";

/** Context passed into a single agent turn. */
export interface AgentRunContext {
  provider: ProviderAdapter;
  model: string;
  systemPrompt: string;
  messages: Message[];
  tools?: unknown[];
  maxTokens?: number;
  temperature?: number;
  /** Callback when a tool call needs execution. */
  onToolCall?: (tool: ToolCallResult) => Promise<Message>;
  runId?: string;
}

/** Result of a single agent turn. */
export interface AgentTurnResult {
  response: string;
  toolCalls: ToolCallResult[];
  usage: TokenUsage;
  turnMessages: ConversationTurn[];
  stopReason: string;
}
