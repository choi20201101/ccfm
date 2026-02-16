import { describe, it, expect } from "vitest";
import { calculateBudget, historyFitsBudget, tokensToFree } from "../budget.js";

describe("calculateBudget", () => {
  it("should distribute tokens proportionally with 5% safety margin", () => {
    // 200_000 * 0.95 = 190_000 effective tokens
    const budget = calculateBudget(200_000);
    expect(budget.total).toBe(190_000);
    expect(budget.system).toBe(Math.floor(190_000 * 0.05));   // 9500
    expect(budget.tools).toBe(Math.floor(190_000 * 0.10));    // 19000
    expect(budget.history).toBe(Math.floor(190_000 * 0.65));   // 123500
    expect(budget.response).toBe(Math.floor(190_000 * 0.15));  // 28500
    expect(budget.reserve).toBe(Math.floor(190_000 * 0.05));   // 9500
  });

  it("should sum to approximately total (rounding may lose a few tokens)", () => {
    const budget = calculateBudget(100_000);
    const sum = budget.system + budget.tools + budget.history + budget.response + budget.reserve;
    // Due to Math.floor rounding, sum may be slightly less than total
    expect(sum).toBeLessThanOrEqual(budget.total);
    expect(sum).toBeGreaterThan(budget.total - 5);
  });
});

describe("historyFitsBudget", () => {
  it("should return true when within budget", () => {
    const budget = calculateBudget(200_000);
    // budget.history = floor(190000 * 0.65) = 123500
    expect(historyFitsBudget(100_000, budget)).toBe(true);
  });

  it("should return false when over budget", () => {
    const budget = calculateBudget(200_000);
    expect(historyFitsBudget(150_000, budget)).toBe(false);
  });
});

describe("tokensToFree", () => {
  it("should calculate tokens that need to be freed", () => {
    const budget = calculateBudget(200_000);
    // budget.history = 123500, excess = 150000 - 123500 = 26500
    const excess = tokensToFree(150_000, budget);
    expect(excess).toBe(150_000 - budget.history);
  });

  it("should return 0 when within budget", () => {
    const budget = calculateBudget(200_000);
    expect(tokensToFree(100_000, budget)).toBe(0);
  });
});
