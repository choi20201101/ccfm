/**
 * Inline directive parsing for /think, /verbose, /notice, etc.
 */

import type { DirectiveResult, ThinkLevel } from "../types.js";
import { getLogger } from "../../logging/logger.js";

const log = getLogger("auto-reply:directives");

const THINK_LEVELS: ThinkLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh"];

const DIRECTIVE_PATTERNS: Array<{
  pattern: RegExp;
  handler: (match: RegExpMatchArray, result: DirectiveResult) => void;
}> = [
  {
    pattern: /\/think\s+(off|minimal|low|medium|high|xhigh)/i,
    handler: (m, r) => { r.thinkLevel = m[1]!.toLowerCase() as ThinkLevel; },
  },
  {
    pattern: /\/verbose/i,
    handler: (_m, r) => { r.verbose = true; },
  },
  {
    pattern: /\/notice\s+"([^"]+)"/,
    handler: (m, r) => { r.notice = m[1]; },
  },
  {
    pattern: /\/elevated/i,
    handler: (_m, r) => { r.elevated = true; },
  },
  {
    pattern: /\/reasoning\s+(off|on|stream)/i,
    handler: (m, r) => { r.reasoning = m[1]!.toLowerCase() as "off" | "on" | "stream"; },
  },
  {
    pattern: /\/exec\s+(.+)/i,
    handler: (m, r) => { r.exec = m[1]; },
  },
];

/** Extract directives from a message text, returning cleaned text and directives. */
export function extractDirectives(text: string): { cleanText: string; directives: DirectiveResult } {
  const directives: DirectiveResult = {};
  let cleanText = text;

  for (const { pattern, handler } of DIRECTIVE_PATTERNS) {
    const match = cleanText.match(pattern);
    if (match) {
      handler(match, directives);
      cleanText = cleanText.replace(pattern, "").trim();
    }
  }

  if (Object.keys(directives).length > 0) {
    log.debug({ directives }, "Directives extracted");
  }

  return { cleanText, directives };
}

/** Normalize a think level string to a valid ThinkLevel. */
export function normalizeThinkLevel(level: string): ThinkLevel {
  const lower = level.toLowerCase();
  if (THINK_LEVELS.includes(lower as ThinkLevel)) return lower as ThinkLevel;
  return "medium";
}
