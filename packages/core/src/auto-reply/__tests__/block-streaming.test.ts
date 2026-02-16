import { describe, it, expect } from "vitest";
import { chunkForStreaming } from "../reply/block-streaming.js";

describe("chunkForStreaming", () => {
  it("should return single chunk for short text", () => {
    const chunks = chunkForStreaming("Hello world");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("Hello world");
  });

  it("should break long text into chunks", () => {
    const longText = "A".repeat(5000);
    const chunks = chunkForStreaming(longText, { maxChars: 1000 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toBe(longText);
  });

  it("should break at paragraph boundaries", () => {
    const text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
    const chunks = chunkForStreaming(text, { minChars: 10, maxChars: 40 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });
});
