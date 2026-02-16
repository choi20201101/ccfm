import { describe, it, expect } from "vitest";
import { extractDirectives, normalizeThinkLevel } from "../reply/directives.js";

describe("extractDirectives", () => {
  it("should extract /think directive", () => {
    const { cleanText, directives } = extractDirectives("/think high What is AI?");
    expect(directives.thinkLevel).toBe("high");
    expect(cleanText).toBe("What is AI?");
  });

  it("should extract /verbose directive", () => {
    const { directives } = extractDirectives("/verbose Tell me about dogs");
    expect(directives.verbose).toBe(true);
  });

  it("should return empty directives for plain text", () => {
    const { cleanText, directives } = extractDirectives("Just a normal message");
    expect(cleanText).toBe("Just a normal message");
    expect(Object.keys(directives)).toHaveLength(0);
  });
});

describe("normalizeThinkLevel", () => {
  it("should normalize valid levels", () => {
    expect(normalizeThinkLevel("high")).toBe("high");
    expect(normalizeThinkLevel("off")).toBe("off");
  });

  it("should default invalid levels to medium", () => {
    expect(normalizeThinkLevel("invalid")).toBe("medium");
  });
});
