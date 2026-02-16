import { describe, it, expect } from "vitest";
import { detectCommand, isCommand } from "../command-detection.js";

describe("detectCommand", () => {
  it("should detect /help command", () => {
    const result = detectCommand("/help");
    expect(result).not.toBeNull();
    expect(result!.command).toBe("help");
    expect(result!.args).toEqual([]);
  });

  it("should detect command with args", () => {
    const result = detectCommand("/model gpt-4o");
    expect(result).not.toBeNull();
    expect(result!.command).toBe("model");
    expect(result!.args).toEqual(["gpt-4o"]);
  });

  it("should resolve aliases", () => {
    const result = detectCommand("/h");
    expect(result).not.toBeNull();
    expect(result!.command).toBe("help");
  });

  it("should return null for non-commands", () => {
    expect(detectCommand("hello world")).toBeNull();
  });
});

describe("isCommand", () => {
  it("should return true for commands", () => {
    expect(isCommand("/help")).toBe(true);
    expect(isCommand("/model gpt-4o")).toBe(true);
  });

  it("should return false for non-commands", () => {
    expect(isCommand("hello")).toBe(false);
    expect(isCommand("")).toBe(false);
  });
});
