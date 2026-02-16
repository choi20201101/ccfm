/**
 * Lane-based message queue with dedup and drop policies.
 * Supports main, cron, probe, and heartbeat lanes.
 */

import type {
  QueueItem,
  QueueLane,
  QueueSettings,
  QueueDedupeMode,
  QueueDropPolicy,
} from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";

const log = getLogger("queue:command");

/** Per-lane queue storage and configuration. */
interface LaneState<T = unknown> {
  items: QueueItem<T>[];
  settings: QueueSettings;
}

const DEFAULT_SETTINGS: QueueSettings = {
  mode: "append",
  debounceMs: 0,
  cap: 100,
  dropPolicy: "fifo",
  dedupeMode: "none",
};

export class CommandQueue<T = unknown> {
  private readonly lanes: Map<QueueLane, LaneState<T>>;

  constructor(settings?: Partial<Record<QueueLane, Partial<QueueSettings>>>) {
    this.lanes = new Map();

    const laneNames: QueueLane[] = ["main", "cron", "probe", "heartbeat"];
    for (const lane of laneNames) {
      this.lanes.set(lane, {
        items: [],
        settings: { ...DEFAULT_SETTINGS, ...settings?.[lane] },
      });
    }

    log.debug("CommandQueue initialized with lanes: %s", laneNames.join(", "));
  }

  /** Get the lane state, throwing if it does not exist. */
  private getLane(lane: QueueLane): LaneState<T> {
    const state = this.lanes.get(lane);
    if (!state) {
      throw new Error(`Unknown queue lane: ${lane}`);
    }
    return state;
  }

  /** Check if an item is a duplicate based on the dedup mode. */
  private isDuplicate(
    existing: QueueItem<T>[],
    item: QueueItem<T>,
    mode: QueueDedupeMode,
  ): boolean {
    if (mode === "none") return false;

    if (mode === "reply") {
      return existing.some((e) => e.id === item.id);
    }

    if (mode === "command") {
      // Deduplicate by matching payload (shallow equality of JSON)
      const itemJson = JSON.stringify(item.payload);
      return existing.some((e) => JSON.stringify(e.payload) === itemJson);
    }

    return false;
  }

  /** Apply drop policy when queue is at capacity. */
  private applyDropPolicy(
    state: LaneState<T>,
    policy: QueueDropPolicy,
  ): void {
    const cap = state.settings.cap ?? 100;
    while (state.items.length >= cap) {
      if (policy === "fifo") {
        const dropped = state.items.shift();
        log.debug({ id: dropped?.id }, "Dropped item (FIFO)");
      } else {
        const dropped = state.items.pop();
        log.debug({ id: dropped?.id }, "Dropped item (LIFO)");
      }
    }
  }

  /** Enqueue an item into a specific lane. */
  enqueue(lane: QueueLane, item: QueueItem<T>): boolean {
    const state = this.getLane(lane);
    const { dedupeMode, dropPolicy } = state.settings;

    // Check for duplicates
    if (this.isDuplicate(state.items, item, dedupeMode ?? "none")) {
      log.debug({ lane, id: item.id }, "Duplicate item skipped");
      return false;
    }

    // Apply drop policy if at capacity
    this.applyDropPolicy(state, dropPolicy ?? "fifo");

    state.items.push(item);
    log.debug({ lane, id: item.id, size: state.items.length }, "Item enqueued");
    return true;
  }

  /** Dequeue the next item from a lane. Returns undefined if the lane is empty. */
  dequeue(lane: QueueLane): QueueItem<T> | undefined {
    const state = this.getLane(lane);
    const item = state.items.shift();
    if (item) {
      log.debug({ lane, id: item.id, remaining: state.items.length }, "Item dequeued");
    }
    return item;
  }

  /** Peek at the next item in a lane without removing it. */
  peek(lane: QueueLane): QueueItem<T> | undefined {
    const state = this.getLane(lane);
    return state.items[0];
  }

  /** Get the number of items in a specific lane. */
  size(lane: QueueLane): number {
    return this.getLane(lane).items.length;
  }

  /** Get total items across all lanes. */
  totalSize(): number {
    let total = 0;
    for (const state of this.lanes.values()) {
      total += state.items.length;
    }
    return total;
  }

  /** Clear all items from a specific lane. */
  clear(lane: QueueLane): void {
    const state = this.getLane(lane);
    state.items = [];
    log.debug({ lane }, "Lane cleared");
  }

  /** Clear all lanes. */
  clearAll(): void {
    for (const [lane, state] of this.lanes) {
      state.items = [];
      log.debug({ lane }, "Lane cleared");
    }
  }
}
