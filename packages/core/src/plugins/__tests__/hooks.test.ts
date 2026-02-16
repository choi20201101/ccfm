import { describe, it, expect } from "vitest";
import { executeHook, createHookEvent } from "../hooks.js";

describe("createHookEvent", () => {
  it("should create a valid hook event", () => {
    const event = createHookEvent("llmInput", { model: "gpt-4" });
    expect(event.hookName).toBe("llmInput");
    expect(event.timestamp).toBeGreaterThan(0);
    expect(event.data.model).toBe("gpt-4");
  });
});

describe("executeHook", () => {
  it("should execute void hook and return event unchanged", async () => {
    const event = createHookEvent("sessionStart", { sessionKey: "test" });
    const result = await executeHook("sessionStart", event);
    expect(result).toBe(event);
  });
});
