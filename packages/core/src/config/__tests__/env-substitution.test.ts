import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { substituteEnvVars, substituteEnvVarsDeep } from "../env-substitution.js";

describe("substituteEnvVars", () => {
  beforeEach(() => {
    vi.stubEnv("TEST_VAR", "hello");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should substitute ${VAR}", () => {
    expect(substituteEnvVars("say ${TEST_VAR}")).toBe("say hello");
  });

  it("should use default with ${VAR:-default}", () => {
    expect(substituteEnvVars("${MISSING:-world}")).toBe("world");
  });

  it("should leave literal text unchanged", () => {
    expect(substituteEnvVars("no vars here")).toBe("no vars here");
  });
});

describe("substituteEnvVarsDeep", () => {
  beforeEach(() => {
    vi.stubEnv("API_KEY", "sk-test123");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should substitute in nested objects", () => {
    const obj = { key: "${API_KEY}", nested: { val: "${API_KEY}" } };
    const result = substituteEnvVarsDeep(obj);
    expect(result).toEqual({ key: "sk-test123", nested: { val: "sk-test123" } });
  });
});
