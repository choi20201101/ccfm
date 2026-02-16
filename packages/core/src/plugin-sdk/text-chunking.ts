/**
 * Text chunking utilities for outbound messages.
 * Respects channel-specific message length limits.
 */

/** Chunk text for outbound delivery, respecting max length. */
export function chunkTextForOutbound(
  text: string,
  maxChars: number,
): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }

    // Try to split at paragraph boundary
    let splitAt = remaining.lastIndexOf("\n\n", maxChars);
    if (splitAt < maxChars * 0.3) {
      // No good paragraph break — try newline
      splitAt = remaining.lastIndexOf("\n", maxChars);
    }
    if (splitAt < maxChars * 0.3) {
      // No good newline break — try space
      splitAt = remaining.lastIndexOf(" ", maxChars);
    }
    if (splitAt < maxChars * 0.3) {
      // Hard split at max
      splitAt = maxChars;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}

/** Split text by sentence boundaries. */
export function splitBySentence(text: string): string[] {
  // Match sentence-ending punctuation followed by space or end
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 0);
}
