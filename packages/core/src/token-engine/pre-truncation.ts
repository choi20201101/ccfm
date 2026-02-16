/**
 * Tool result pre-truncation.
 * Hard limit: 50K chars. Soft limit: 10% of context window.
 */

import { DEFAULT_MAX_TOOL_RESULT_CHARS, truncate } from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";

const log = getLogger("token-engine:pre-truncation");

/** Truncate a tool result to fit within limits. */
export function preTruncateToolResult(
  result: string,
  maxChars = DEFAULT_MAX_TOOL_RESULT_CHARS,
): string {
  if (result.length <= maxChars) return result;

  log.debug(
    { originalLength: result.length, maxChars },
    "Pre-truncating tool result",
  );

  return truncate(result, maxChars, "\n\n…[result truncated to fit context window]");
}

/** Calculate context-relative tool result limit. */
export function contextRelativeLimit(
  totalContextTokens: number,
  contextPercentage = 0.10,
): number {
  // Tokens → rough char estimate (4 chars per token)
  const charLimit = Math.floor(totalContextTokens * 4 * contextPercentage);
  return Math.min(charLimit, DEFAULT_MAX_TOOL_RESULT_CHARS);
}
