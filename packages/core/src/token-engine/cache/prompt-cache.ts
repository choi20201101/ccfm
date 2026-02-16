/**
 * Anthropic prompt caching support.
 * Injects cache_control markers on system prompt and tool definitions.
 */

import { getLogger } from "../../logging/logger.js";

const log = getLogger("token-engine:cache");

/** Models that support Anthropic prompt caching. */
const CACHE_SUPPORTED_MODELS = new Set([
  "claude-3-opus",
  "claude-3-sonnet",
  "claude-3-haiku",
  "claude-3.5-sonnet",
  "claude-3.5-haiku",
  "claude-sonnet-4",
  "claude-opus-4",
]);

/** Check if a model supports prompt caching. */
export function supportsCaching(model: string): boolean {
  for (const prefix of CACHE_SUPPORTED_MODELS) {
    if (model.startsWith(prefix)) return true;
  }
  return false;
}

/** Content block with optional cache_control. */
export interface CacheableContentBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

/**
 * Inject cache_control markers on system prompt blocks.
 * Places ephemeral cache on the last system content block.
 */
export function injectSystemCacheControl(
  systemBlocks: CacheableContentBlock[],
): CacheableContentBlock[] {
  if (systemBlocks.length === 0) return systemBlocks;

  const result = systemBlocks.map((block, i) => {
    if (i === systemBlocks.length - 1) {
      return { ...block, cache_control: { type: "ephemeral" as const } };
    }
    return block;
  });

  log.debug({ blockCount: systemBlocks.length }, "Injected system prompt cache control");
  return result;
}

/**
 * Inject cache_control on tool definitions.
 * Caches the entire tools array as one block.
 */
export function injectToolsCacheControl(
  tools: unknown[],
): unknown[] {
  if (tools.length === 0) return tools;

  // Mark the last tool with cache_control
  const result = [...tools];
  const lastTool = result[result.length - 1] as Record<string, unknown>;
  result[result.length - 1] = {
    ...lastTool,
    cache_control: { type: "ephemeral" },
  };

  log.debug({ toolCount: tools.length }, "Injected tools cache control");
  return result;
}
