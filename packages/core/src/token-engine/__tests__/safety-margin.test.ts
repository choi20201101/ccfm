import { describe, it, expect } from "vitest";
import { effectiveContextWindow, safetyMarginTokens, isNearLimit } from "../safety-margin.js";

describe("effectiveContextWindow", () => {
  it("should apply 5% safety margin", () => {
    expect(effectiveContextWindow(200_000)).toBe(190_000);
    expect(effectiveContextWindow(100_000)).toBe(95_000);
  });
});

describe("safetyMarginTokens", () => {
  it("should return 5% of context window", () => {
    expect(safetyMarginTokens(200_000)).toBe(10_000);
  });
});

describe("isNearLimit", () => {
  it("should return true when near the limit", () => {
    expect(isNearLimit(195_000, 200_000)).toBe(true);
  });

  it("should return false when well under limit", () => {
    expect(isNearLimit(100_000, 200_000)).toBe(false);
  });
});
