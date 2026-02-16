import { describe, it, expect } from "vitest";
import { estimateTokens } from "../counter.js";

describe("estimateTokens", () => {
  it("should estimate English text at ~4 chars/token", () => {
    const text = "Hello, how are you doing today?";
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(text.length); // fewer tokens than chars
  });

  it("should estimate CJK text at ~2 chars/token", () => {
    const text = "안녕하세요 오늘 기분이 어떠세요";
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(text.length / 4); // more than pure English estimate
  });

  it("should handle empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("should handle mixed content", () => {
    const text = "Hello 안녕 World 세계";
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
  });
});
