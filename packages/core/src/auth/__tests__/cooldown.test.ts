import { describe, it, expect } from "vitest";
import { calculateCooldown, isInCooldown } from "../cooldown.js";

describe("calculateCooldown", () => {
  it("should calculate rate limit cooldown (5^(n-1) minutes)", () => {
    const cd1 = calculateCooldown(1, "rate_limit");
    expect(cd1).toBe(60_000); // 1 min

    const cd2 = calculateCooldown(2, "rate_limit");
    expect(cd2).toBe(300_000); // 5 min

    const cd3 = calculateCooldown(3, "rate_limit");
    expect(cd3).toBe(1_500_000); // 25 min
  });

  it("should cap rate limit at 1 hour", () => {
    const cd = calculateCooldown(10, "rate_limit");
    expect(cd).toBeLessThanOrEqual(3_600_000);
  });

  it("should calculate billing cooldown", () => {
    const cd1 = calculateCooldown(1, "billing");
    expect(cd1).toBe(5 * 3_600_000); // 5 hours
  });

  it("should cap billing at 24 hours", () => {
    const cd = calculateCooldown(10, "billing");
    expect(cd).toBeLessThanOrEqual(24 * 3_600_000);
  });
});

describe("isInCooldown", () => {
  it("should return true when cooldown is active", () => {
    expect(isInCooldown({ cooldownUntil: Date.now() + 60_000 } as any)).toBe(true);
  });

  it("should return false when cooldown expired", () => {
    expect(isInCooldown({ cooldownUntil: Date.now() - 1000 } as any)).toBe(false);
  });

  it("should return false when no cooldown set", () => {
    expect(isInCooldown({} as any)).toBe(false);
  });
});
