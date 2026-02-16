/**
 * Channel types and capabilities.
 * Matches OpenClaw's 36+ channel plugin architecture.
 */

export type ChannelId = string;

export interface ChannelMeta {
  id: ChannelId;
  name: string;
  displayName: string;
  icon?: string;
  color?: string;
  enabled: boolean;
  connected: boolean;
  lastActivity?: number;
}

export interface ChannelCapabilities {
  supportsThreading: boolean;
  supportsReactions: boolean;
  supportsEditing: boolean;
  supportsDeleting: boolean;
  supportsMedia: boolean;
  supportsVoice: boolean;
  supportsTypingIndicator: boolean;
  supportsMarkdown: boolean;
  maxMessageLength: number;
  maxMediaSize?: number;
  supportedMediaTypes?: string[];
}

export interface ChannelConfig {
  enabled: boolean;
  token?: string;
  webhookUrl?: string;
  allowlist?: string[];
  mentionGating?: boolean;
  commandGating?: boolean;
  typingIndicator?: boolean;
  /** Channel-specific extra config. */
  extra?: Record<string, unknown>;
}

export interface InboundChannelMessage {
  channelId: ChannelId;
  senderId: string;
  senderName?: string;
  chatId: string;
  chatType: "direct" | "group";
  messageId: string;
  text: string;
  media?: Array<{
    type: string;
    url?: string;
    buffer?: Buffer;
    mimeType?: string;
    filename?: string;
  }>;
  replyToMessageId?: string;
  timestamp: number;
  raw?: unknown;
}
