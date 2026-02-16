/**
 * Token counting using tiktoken for accurate per-model counts.
 */

import { getLogger } from "../logging/logger.js";

const log = getLogger("token-engine:counter");

/** Lazy-loaded tiktoken encoder cache. */
let encoderCache: Map<string, unknown> | null = null;

/** Model → tiktoken encoding name mapping. */
const MODEL_ENCODING_MAP: Record<string, string> = {
  // Anthropic models use cl100k_base approximation
  "claude-3-opus": "cl100k_base",
  "claude-3-sonnet": "cl100k_base",
  "claude-3-haiku": "cl100k_base",
  "claude-3.5-sonnet": "cl100k_base",
  "claude-sonnet-4": "cl100k_base",
  "claude-opus-4": "cl100k_base",
  // OpenAI models
  "gpt-4o": "o200k_base",
  "gpt-4o-mini": "o200k_base",
  "gpt-4-turbo": "cl100k_base",
  "gpt-4": "cl100k_base",
  "gpt-3.5-turbo": "cl100k_base",
};

/** Resolve encoding name for a model. */
function resolveEncoding(model: string): string {
  // Check exact match
  if (MODEL_ENCODING_MAP[model]) return MODEL_ENCODING_MAP[model];

  // Fuzzy match by prefix
  for (const [prefix, encoding] of Object.entries(MODEL_ENCODING_MAP)) {
    if (model.startsWith(prefix)) return encoding;
  }

  // Default to cl100k_base
  return "cl100k_base";
}

/**
 * Count tokens in text using tiktoken.
 * Falls back to character-based estimation if tiktoken fails.
 */
export async function countTokens(text: string, model = "claude-sonnet-4"): Promise<number> {
  try {
    const tiktoken = await import("tiktoken");

    if (!encoderCache) {
      encoderCache = new Map();
    }

    const encodingName = resolveEncoding(model);
    let encoder = encoderCache.get(encodingName);

    if (!encoder) {
      encoder = tiktoken.get_encoding(encodingName as Parameters<typeof tiktoken.get_encoding>[0]);
      encoderCache.set(encodingName, encoder);
    }

    const encoded = (encoder as ReturnType<typeof tiktoken.get_encoding>).encode(text);
    return encoded.length;
  } catch (err) {
    log.warn({ model, err }, "tiktoken failed, using estimation");
    return estimateTokens(text);
  }
}

/** Fast estimation: ~4 characters per token for English, ~2 for CJK. */
export function estimateTokens(text: string): number {
  // Count CJK characters
  const cjkCount = (text.match(/[\u3000-\u9fff\uac00-\ud7af]/g) ?? []).length;
  const otherCount = text.length - cjkCount;

  return Math.ceil(otherCount / 4 + cjkCount / 2);
}

/**
 * Count tokens for a list of messages.
 * Includes per-message overhead (role markers, etc.).
 */
export async function countMessagesTokens(
  messages: Array<{ role: string; content: string }>,
  model?: string,
): Promise<number> {
  let total = 0;
  const perMessageOverhead = 4; // <|role|>, newlines, etc.

  for (const msg of messages) {
    total += await countTokens(msg.content, model) + perMessageOverhead;
  }

  return total + 2; // Start/end tokens
}
