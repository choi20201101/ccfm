/**
 * Block streaming — chunk outbound text at natural break points.
 */

import type { BlockStreamOptions } from "../types.js";
import { getLogger } from "../../logging/logger.js";

const log = getLogger("auto-reply:streaming");

const DEFAULT_OPTIONS: BlockStreamOptions = {
  minChars: 100,
  maxChars: 2000,
  flushOnParagraph: true,
  flushOnSentence: true,
};

/** Break a long text into streamable chunks. */
export function chunkForStreaming(
  text: string,
  opts: Partial<BlockStreamOptions> = {},
): string[] {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const chunks: string[] = [];

  if (text.length <= options.minChars) {
    return [text];
  }

  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= options.maxChars) {
      chunks.push(remaining);
      break;
    }

    let breakPoint = -1;

    // Try paragraph break
    if (options.flushOnParagraph) {
      const paraIdx = remaining.lastIndexOf("\n\n", options.maxChars);
      if (paraIdx >= options.minChars) {
        breakPoint = paraIdx + 2;
      }
    }

    // Try sentence break
    if (breakPoint === -1 && options.flushOnSentence) {
      const sentencePattern = /[.!?]\s+/g;
      let lastSentenceEnd = -1;
      let m: RegExpExecArray | null;
      while ((m = sentencePattern.exec(remaining)) !== null) {
        if (m.index + m[0].length <= options.maxChars && m.index >= options.minChars) {
          lastSentenceEnd = m.index + m[0].length;
        }
      }
      if (lastSentenceEnd > 0) breakPoint = lastSentenceEnd;
    }

    // Fall back to maxChars hard cut
    if (breakPoint === -1) {
      breakPoint = options.maxChars;
    }

    chunks.push(remaining.slice(0, breakPoint));
    remaining = remaining.slice(breakPoint);
  }

  log.debug({ chunkCount: chunks.length }, "Text chunked for streaming");
  return chunks;
}
