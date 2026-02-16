/**
 * Auto-reply pipeline types.
 */

import type { MsgContext, GetReplyOptions, ReplyPayload } from "@ccfm/shared";

export interface DispatchResult {
  handled: boolean;
  reply?: ReplyPayload;
  error?: Error;
}

export interface CommandMatch {
  command: string;
  args: string[];
  raw: string;
}

export type CommandHandler = (
  ctx: MsgContext,
  args: string[],
) => Promise<ReplyPayload | null>;

export interface BlockStreamOptions {
  minChars: number;
  maxChars: number;
  flushOnParagraph: boolean;
  flushOnSentence: boolean;
}

export type ThinkLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

export interface DirectiveResult {
  thinkLevel?: ThinkLevel;
  verbose?: boolean;
  notice?: string;
  elevated?: boolean;
  reasoning?: "off" | "on" | "stream";
  exec?: string;
}
