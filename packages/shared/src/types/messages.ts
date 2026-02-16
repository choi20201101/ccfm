/**
 * Core message types for CCFM-Bot.
 * Matches OpenClaw's chat content model with extensions.
 */

export type Role = "system" | "user" | "assistant" | "tool";

export type TextBlock = {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
};

export type ImageBlock = {
  type: "image";
  source:
    | { type: "base64"; media_type: string; data: string }
    | { type: "url"; url: string };
};

export type ToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
};

export type ToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string | ContentBlock[];
  is_error?: boolean;
};

export type ContentBlock = TextBlock | ImageBlock | ToolUseBlock | ToolResultBlock;

export type MessageContent = string | ContentBlock[];

export interface Message {
  role: Role;
  content: MessageContent;
  name?: string;
}

/** A message wrapped with metadata for history tracking. */
export interface ConversationTurn {
  message: Message;
  timestamp: number;
  tokenCount?: number;
  compacted?: boolean;
  runId?: string;
}

/** Reply payload sent from agent to channel. */
export interface ReplyPayload {
  text?: string;
  media?: MediaPayload[];
  toolUse?: {
    id: string;
    name: string;
    input: unknown;
  };
  toolResult?: {
    toolUseId: string;
    content: string;
    isError?: boolean;
  };
  replyToMessageId?: string;
  silent?: boolean;
  noReply?: boolean;
}

export interface MediaPayload {
  type: "image" | "audio" | "video" | "document";
  url?: string;
  buffer?: Buffer;
  mimeType?: string;
  filename?: string;
  caption?: string;
}

/** Options for getting a reply from an agent. */
export interface GetReplyOptions {
  onToolResult?: (payload: ReplyPayload) => Promise<void>;
  onBlockReply?: (payload: ReplyPayload) => Promise<void>;
  onAgentRunStart?: (runId: string) => void;
  blockReplyTimeoutMs?: number;
  runId?: string;
  isHeartbeat?: boolean;
}

/** Inbound message context. */
export interface MsgContext {
  channelId: string;
  sessionKey: string;
  senderId: string;
  senderName?: string;
  chatType: "direct" | "group";
  text: string;
  media?: MediaPayload[];
  replyToMessageId?: string;
  timestamp: number;
  raw?: unknown;
}
