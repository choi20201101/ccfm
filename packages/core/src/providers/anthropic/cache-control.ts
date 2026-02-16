/**
 * Anthropic prompt-caching helpers.
 *
 * Adds `cache_control` markers to system prompts and tool definitions so the
 * Anthropic API can cache large, stable prefixes and reduce latency / cost.
 *
 * Only models that support prompt caching (claude-3 and newer) are eligible.
 */

import { getLogger } from "../../logging/logger.js";

const log = getLogger("providers");

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

/** Models whose API versions support prompt caching. */
const CACHE_ELIGIBLE_PREFIX = "claude-3";

export function modelSupportsCaching(modelId: string): boolean {
  return modelId.startsWith(CACHE_ELIGIBLE_PREFIX);
}

// ---------------------------------------------------------------------------
// System prompt injection
// ---------------------------------------------------------------------------

export interface CacheableTextBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

/**
 * Wrap a plain-text system prompt into an array of content blocks with a
 * `cache_control` marker on the last block.
 *
 * If the prompt is already an array of blocks, the marker is appended to the
 * last block that does not already have one.
 */
export function injectSystemPromptCache(
  systemPrompt: string | CacheableTextBlock[],
): CacheableTextBlock[] {
  const blocks: CacheableTextBlock[] =
    typeof systemPrompt === "string"
      ? [{ type: "text", text: systemPrompt }]
      : systemPrompt.map((b) => ({ ...b }));

  if (blocks.length === 0) return blocks;

  const last = blocks[blocks.length - 1]!;
  if (!last.cache_control) {
    last.cache_control = { type: "ephemeral" };
    log.debug("Injected cache_control on system prompt");
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Tool definitions injection
// ---------------------------------------------------------------------------

/**
 * Clone the tool definitions array and add a `cache_control` marker on the
 * last tool so the entire tool-definition prefix is cacheable.
 */
export function injectToolsCacheControl(
  tools: unknown[],
): unknown[] {
  if (tools.length === 0) return tools;

  const cloned = tools.map((t) => {
    if (t && typeof t === "object") return { ...t };
    return t;
  });

  const last = cloned[cloned.length - 1];
  if (last && typeof last === "object") {
    (last as Record<string, unknown>)["cache_control"] = { type: "ephemeral" };
    log.debug("Injected cache_control on tool definitions");
  }

  return cloned;
}

// ---------------------------------------------------------------------------
// Combined helper
// ---------------------------------------------------------------------------

export interface CacheControlResult {
  system: CacheableTextBlock[];
  tools: unknown[];
}

/**
 * Convenience wrapper: injects cache_control on both the system prompt and
 * tool definitions when the model supports caching.
 */
export function injectCacheControl(
  modelId: string,
  systemPrompt: string | undefined,
  tools: unknown[] | undefined,
): CacheControlResult {
  if (!modelSupportsCaching(modelId)) {
    return {
      system: systemPrompt ? [{ type: "text", text: systemPrompt }] : [],
      tools: tools ?? [],
    };
  }

  return {
    system: systemPrompt ? injectSystemPromptCache(systemPrompt) : [],
    tools: tools ? injectToolsCacheControl(tools) : [],
  };
}
