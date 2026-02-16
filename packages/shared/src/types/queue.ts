/**
 * Message queue types.
 * Matches OpenClaw's lane-based queue with dedup and debounce.
 */

export type QueueMode = "append" | "replace" | "drop";
export type QueueDropPolicy = "fifo" | "lifo";
export type QueueDedupeMode = "none" | "reply" | "command";

export interface QueueSettings {
  mode: QueueMode;
  debounceMs?: number;
  cap?: number;
  dropPolicy?: QueueDropPolicy;
  dedupeMode?: QueueDedupeMode;
}

export type QueueLane = "main" | "cron" | "probe" | "heartbeat";

export interface QueueItem<T = unknown> {
  id: string;
  lane: QueueLane;
  payload: T;
  enqueuedAt: number;
  priority?: number;
}
