/**
 * Typing indicator controller.
 * Manages start/stop of typing indicators per channel.
 */

import { getLogger } from "../../logging/logger.js";

const log = getLogger("auto-reply:typing");

export interface TypingController {
  start(): void;
  stop(): void;
}

/** Create a typing indicator controller with an interval-based keep-alive. */
export function createTypingController(
  sendTyping: () => void,
  intervalMs = 5000,
): TypingController {
  let timer: ReturnType<typeof setInterval> | null = null;

  return {
    start() {
      if (timer) return;
      sendTyping();
      timer = setInterval(sendTyping, intervalMs);
      log.debug("Typing indicator started");
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
        log.debug("Typing indicator stopped");
      }
    },
  };
}
