/**
 * Long-polling loop for receiving Telegram updates.
 */

import type { TelegramBot, TelegramMessage } from "./bot.js";

export type OnMessageCallback = (message: TelegramMessage) => void | Promise<void>;

/** Minimum delay between retries on error (ms). */
const BASE_RETRY_DELAY = 1000;
/** Maximum delay between retries on error (ms). */
const MAX_RETRY_DELAY = 30_000;
/** Long-poll timeout sent to the Telegram API (seconds). */
const POLL_TIMEOUT = 30;

export interface PollingHandle {
  stop: () => void;
}

/**
 * Start the long-polling loop.
 *
 * Returns a handle with a `stop()` method to gracefully shut down.
 */
export function startPolling(
  bot: TelegramBot,
  onMessage: OnMessageCallback,
): PollingHandle {
  let running = true;
  let offset: number | undefined;
  let consecutiveErrors = 0;

  const loop = async (): Promise<void> => {
    while (running) {
      try {
        const updates = await bot.getUpdates(offset, POLL_TIMEOUT);
        consecutiveErrors = 0;

        for (const update of updates) {
          // Advance offset past this update so it is not received again.
          offset = update.update_id + 1;

          if (update.message && update.message.text) {
            try {
              await onMessage(update.message);
            } catch (handlerError: unknown) {
              const errMsg =
                handlerError instanceof Error
                  ? handlerError.message
                  : String(handlerError);
              console.error(
                `[telegram] Error in message handler: ${errMsg}`,
              );
            }
          }
        }
      } catch (pollError: unknown) {
        if (!running) break;

        consecutiveErrors++;
        const errMsg =
          pollError instanceof Error ? pollError.message : String(pollError);
        console.error(
          `[telegram] Polling error (attempt ${consecutiveErrors}): ${errMsg}`,
        );

        // Exponential back-off capped at MAX_RETRY_DELAY.
        const delay = Math.min(
          BASE_RETRY_DELAY * Math.pow(2, consecutiveErrors - 1),
          MAX_RETRY_DELAY,
        );
        await sleep(delay);
      }
    }
  };

  // Fire-and-forget — the loop runs in the background.
  loop().catch((err: unknown) => {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[telegram] Polling loop exited unexpectedly: ${errMsg}`);
  });

  return {
    stop() {
      running = false;
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
