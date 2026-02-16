/**
 * Outbound message handling for Telegram.
 *
 * - Sends a typing indicator before each message.
 * - Splits long messages to stay within the 4 096 character limit.
 * - Uses Markdown parse mode by default.
 */

import type { TelegramBot } from "./bot.js";

/** Telegram's maximum message length in characters. */
const MAX_MESSAGE_LENGTH = 4096;

/**
 * Send a reply, automatically splitting if the text exceeds 4 096 characters.
 *
 * @param bot              - TelegramBot instance.
 * @param chatId           - Numeric or string chat identifier.
 * @param text             - The full reply text.
 * @param replyToMessageId - Optional message ID to reply to.
 */
export async function sendReply(
  bot: TelegramBot,
  chatId: number | string,
  text: string,
  replyToMessageId?: number,
): Promise<void> {
  // Show a typing indicator so the user knows a response is coming.
  await bot.sendChatAction(chatId, "typing").catch(() => {
    // Non-critical — swallow errors from the typing indicator.
  });

  const chunks = splitMessage(text);

  for (let i = 0; i < chunks.length; i++) {
    await bot.sendMessage(chatId, chunks[i], {
      parse_mode: "Markdown",
      // Only the first chunk is a direct reply; subsequent chunks are standalone.
      reply_to_message_id: i === 0 ? replyToMessageId : undefined,
      disable_web_page_preview: true,
    });
  }
}

/**
 * Split a message into chunks of at most MAX_MESSAGE_LENGTH characters.
 *
 * The function tries to split on newline boundaries so that formatting is
 * preserved as much as possible. If a single line exceeds the limit it falls
 * back to a hard character split.
 */
function splitMessage(text: string): string[] {
  if (text.length <= MAX_MESSAGE_LENGTH) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_MESSAGE_LENGTH) {
      chunks.push(remaining);
      break;
    }

    // Try to find the last newline within the allowed window.
    let splitIndex = remaining.lastIndexOf("\n", MAX_MESSAGE_LENGTH);

    if (splitIndex <= 0) {
      // No suitable newline found — try a space boundary instead.
      splitIndex = remaining.lastIndexOf(" ", MAX_MESSAGE_LENGTH);
    }

    if (splitIndex <= 0) {
      // No word boundary at all — hard split.
      splitIndex = MAX_MESSAGE_LENGTH;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).replace(/^\n/, "");
  }

  return chunks;
}
