/**
 * Core reply generation — orchestrates agent execution and response handling.
 */

import type { MsgContext, GetReplyOptions, ReplyPayload, Message } from "@ccfm/shared";
import { getLogger } from "../../logging/logger.js";
import { extractDirectives } from "./directives.js";
import { chunkForStreaming } from "./block-streaming.js";
import { createTypingController } from "./typing.js";

const log = getLogger("auto-reply:get-reply");

/**
 * Generate a reply for an inbound message context.
 * This is the main entry point for reply generation after command detection.
 */
export async function getReply(
  ctx: MsgContext,
  options: GetReplyOptions = {},
): Promise<ReplyPayload> {
  const { cleanText, directives } = extractDirectives(ctx.text);

  log.info(
    { sessionKey: ctx.sessionKey, channelId: ctx.channelId, directives },
    "Generating reply",
  );

  // Build the user message
  const userMessage: Message = {
    role: "user",
    content: cleanText,
    name: ctx.senderName,
  };

  // Notify run start
  const runId = options.runId ?? `run-${Date.now()}`;
  options.onAgentRunStart?.(runId);

  try {
    // The actual agent execution will be wired here when agents/runner is integrated.
    // For now, return a placeholder that shows the pipeline is working.
    const responseText = `[CCFM] Received: "${cleanText.slice(0, 100)}"`;

    // Chunk for streaming if callback is provided
    if (options.onBlockReply) {
      const chunks = chunkForStreaming(responseText);
      for (const chunk of chunks) {
        await options.onBlockReply({ text: chunk });
      }
    }

    return { text: responseText };
  } catch (err) {
    log.error({ err, sessionKey: ctx.sessionKey }, "Reply generation failed");
    return { text: "An error occurred while generating a reply." };
  }
}
