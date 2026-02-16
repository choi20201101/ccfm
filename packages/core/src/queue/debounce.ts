/**
 * Inbound message debouncing.
 * Delays execution of a function, resetting the timer on each new call.
 */

import { getLogger } from "../logging/logger.js";

const log = getLogger("queue:debounce");

interface DebouncedEntry {
  timer: ReturnType<typeof setTimeout>;
  fn: () => void;
}

export class InboundDebouncer {
  private readonly pending: Map<string, DebouncedEntry> = new Map();

  /**
   * Debounce a function call by key.
   * If called again with the same key before the delay expires,
   * the previous timer is cancelled and a new one starts.
   */
  debounce(key: string, fn: () => void, ms: number): void {
    const existing = this.pending.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      log.debug({ key, ms }, "Debounce timer reset");
    }

    const timer = setTimeout(() => {
      this.pending.delete(key);
      log.debug({ key }, "Debounce fired");
      try {
        fn();
      } catch (err) {
        log.error({ key, err }, "Debounced function threw an error");
      }
    }, ms);

    this.pending.set(key, { timer, fn });
    log.debug({ key, ms }, "Debounce scheduled");
  }

  /** Cancel a pending debounce by key. */
  cancel(key: string): boolean {
    const existing = this.pending.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      this.pending.delete(key);
      log.debug({ key }, "Debounce cancelled");
      return true;
    }
    return false;
  }

  /** Cancel all pending debounces. */
  cancelAll(): void {
    for (const [key, entry] of this.pending) {
      clearTimeout(entry.timer);
      log.debug({ key }, "Debounce cancelled (cancelAll)");
    }
    this.pending.clear();
  }

  /** Get the number of pending debounced calls. */
  get pendingCount(): number {
    return this.pending.size;
  }
}
