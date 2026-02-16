/**
 * Provider adapter interface.
 * Every LLM backend (Anthropic, OpenAI, Ollama, etc.) must implement
 * {@link ProviderAdapter} so the agent layer stays provider-agnostic.
 */

import type { Message, TokenUsage } from "@ccfm/shared";

// ---------------------------------------------------------------------------
// Adapter contract
// ---------------------------------------------------------------------------

export interface ProviderAdapter {
  readonly providerId: string;
  readonly displayName: string;

  /** Send a single request and return the full response. */
  sendMessage(opts: SendMessageOptions): Promise<ProviderResponse>;

  /** Stream a response token-by-token. */
  streamMessage(opts: SendMessageOptions): AsyncGenerator<StreamChunk>;

  /** Return the model IDs this provider currently exposes. */
  listModels(): Promise<string[]>;

  /** Quick connectivity / auth check. */
  testConnection(): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Request options
// ---------------------------------------------------------------------------

export interface SendMessageOptions {
  model: string;
  messages: Message[];
  systemPrompt?: string;
  tools?: unknown[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  /** Anthropic prompt caching — inject cache_control markers. */
  cacheControl?: boolean;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface ProviderResponse {
  content: string;
  toolCalls?: ToolCallResult[];
  usage: TokenUsage;
  stopReason: StopReason;
  model: string;
  cached?: boolean;
}

export type StopReason =
  | "end_turn"
  | "tool_use"
  | "max_tokens"
  | "stop_sequence";

export interface ToolCallResult {
  id: string;
  name: string;
  input: unknown;
}

// ---------------------------------------------------------------------------
// Streaming chunks
// ---------------------------------------------------------------------------

export interface StreamChunk {
  type: StreamChunkType;
  text?: string;
  toolCall?: { id: string; name: string; input?: string };
  usage?: TokenUsage;
  stopReason?: string;
}

export type StreamChunkType =
  | "text"
  | "tool_use_start"
  | "tool_use_input"
  | "tool_use_end"
  | "usage"
  | "stop";
