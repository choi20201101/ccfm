/**
 * Hard limits for context window validation.
 * Guards against misconfiguration that would cause provider errors.
 */

import {
  COMPACTION_HARD_MIN_CONTEXT,
  COMPACTION_WARN_MIN_CONTEXT,
} from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";

const log = getLogger("agents");

export const HARD_MIN_CONTEXT = COMPACTION_HARD_MIN_CONTEXT; // 16_384
export const WARN_MIN_CONTEXT = COMPACTION_WARN_MIN_CONTEXT; // 32_768

export interface ContextWindowValidation {
  valid: boolean;
  warning?: string;
}

/** Validate a proposed context window size against hard/soft limits. */
export function validateContextWindow(
  maxTokens: number,
): ContextWindowValidation {
  if (maxTokens < HARD_MIN_CONTEXT) {
    const msg = `Context window ${maxTokens} is below hard minimum ${HARD_MIN_CONTEXT}`;
    log.error({ maxTokens }, msg);
    return { valid: false, warning: msg };
  }

  if (maxTokens < WARN_MIN_CONTEXT) {
    const msg = `Context window ${maxTokens} is below recommended minimum ${WARN_MIN_CONTEXT}`;
    log.warn({ maxTokens }, msg);
    return { valid: true, warning: msg };
  }

  return { valid: true };
}
