/**
 * Session management types.
 * Matches OpenClaw's per-session overrides and transcript tracking.
 */

export interface SessionEntry {
  sessionKey: string;
  agentId?: string;
  channelId?: string;
  createdAt: number;
  updatedAt: number;
  /** Per-session model override. */
  providerOverride?: string;
  modelOverride?: string;
  /** Auth profile override for this session. */
  authProfileOverride?: string;
  authProfileOverrideSource?: "auto" | "user";
  /** Compaction tracking. */
  compactionCount?: number;
  lastCompactionAt?: number;
  /** Thinking level override. */
  thinkLevelOverride?: string;
  /** Verbose level override. */
  verboseLevelOverride?: string;
}

export interface SessionState {
  entry: SessionEntry;
  /** Number of turns in this session. */
  turnCount: number;
  /** Estimated total tokens used in this session. */
  totalTokensUsed: number;
  /** Estimated total cost. */
  totalCost: number;
  /** Active status. */
  isActive: boolean;
}

export interface TranscriptEntry {
  role: string;
  content: string;
  timestamp: number;
  tokenCount?: number;
  metadata?: Record<string, unknown>;
}
