import { describe, it, expect } from "vitest";
import { analyzeComplexity } from "../model-router.js";

describe("analyzeComplexity", () => {
  it("should classify short simple text as simple", () => {
    const result = analyzeComplexity("Hello, how are you?", false, 1);
    expect(result).toBe("simple");
  });

  it("should classify long text with code as complex", () => {
    const code = `
      function fibonacci(n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
      }
      // Explain the time complexity of this recursive implementation
      // and suggest an optimized version using dynamic programming
    `;
    const result = analyzeComplexity(code, true, 5);
    expect(["medium", "complex"]).toContain(result);
  });
});
