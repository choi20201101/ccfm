/**
 * Shared constants used across core and web packages.
 */

// --- Version ---
export const CCFM_VERSION = "0.1.0";

// --- Token Defaults ---
export const DEFAULT_MAX_CONTEXT_TOKENS = 200_000;
export const DEFAULT_MAX_RESPONSE_TOKENS = 8_192;
export const DEFAULT_SAFETY_MARGIN_PERCENT = 0.05;
export const DEFAULT_MAX_TOOL_RESULT_CHARS = 50_000;

/** Token budget allocation ratios (must sum to 1.0). */
export const TOKEN_BUDGET_RATIOS = {
  system: 0.05,
  tools: 0.10,
  history: 0.65,
  response: 0.15,
  reserve: 0.05,
} as const;

// --- Compaction ---
export const COMPACTION_ADAPTIVE_CHUNK_RATIO = 1.2;
export const COMPACTION_HARD_MIN_CONTEXT = 16_384;
export const COMPACTION_WARN_MIN_CONTEXT = 32_768;

// --- Auth Cooldown ---
/** Rate-limit cooldown: 5^(n-1) minutes, max 1 hour. */
export const AUTH_RATE_LIMIT_BASE_MS = 60_000;
export const AUTH_RATE_LIMIT_MAX_MS = 3_600_000;
/** Billing cooldown: 2^(n-1) * 5 hours, max 24 hours. */
export const AUTH_BILLING_BASE_HOURS = 5;
export const AUTH_BILLING_MAX_HOURS = 24;

// --- Queue ---
export const QUEUE_DEFAULT_DEBOUNCE_MS = 300;
export const QUEUE_DEFAULT_CAP = 100;

// --- Gateway ---
export const GATEWAY_DEFAULT_PORT = 18790;
export const GATEWAY_DEFAULT_HOST = "127.0.0.1";
export const GATEWAY_WS_PATH = "/ws";
export const GATEWAY_API_PREFIX = "/api/v1";
export const GATEWAY_HOOK_PREFIX = "/hook";

// --- Session ---
export const SESSION_DEFAULT_MAX_HISTORY = 500;
export const SESSION_TRANSCRIPT_FORMAT = "jsonl" as const;

// --- Reply ---
export const SILENT_REPLY_TOKEN = "__SILENT__";
export const NO_REPLY_TOKEN = "__NO_REPLY__";

// --- Block Streaming ---
export const BLOCK_STREAM_MIN_CHARS = 20;
export const BLOCK_STREAM_MAX_CHARS = 500;
export const BLOCK_STREAM_FLUSH_PARAGRAPH = true;

// --- Human-like Delay (ms) ---
export const REPLY_DELAY_MIN_MS = 800;
export const REPLY_DELAY_MAX_MS = 2_500;

// --- Logging ---
export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

// --- Config ---
export const CONFIG_FILE_NAME = "ccfm.config.json5";
export const CONFIG_DIR_ENV = "CCFM_CONFIG_DIR";

// --- Plugin ---
export const PLUGIN_MANIFEST_FILE = "ccfm.plugin.json";
export const PLUGIN_SEARCH_DIRS = ["extensions", "node_modules"] as const;

// --- Model Complexity Thresholds ---
export const MODEL_COMPLEXITY_THRESHOLDS = {
  /** Messages with fewer tokens are "simple". */
  simpleMaxTokens: 500,
  /** Messages with fewer tokens are "medium". */
  mediumMaxTokens: 2_000,
} as const;

// --- Provider IDs ---
export const PROVIDER_IDS = {
  ANTHROPIC: "anthropic",
  OPENAI: "openai",
  GOOGLE: "google",
  BEDROCK: "bedrock",
  OLLAMA: "ollama",
  COPILOT: "copilot",
  TOGETHER: "together",
  HUGGINGFACE: "huggingface",
  VLLM: "vllm",
  VENICE: "venice",
  MINIMAX: "minimax",
  QWEN: "qwen",
} as const;
