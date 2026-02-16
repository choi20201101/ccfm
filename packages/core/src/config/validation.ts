/**
 * Config validation using Zod schema.
 */

import type { CcfmConfig } from "@ccfm/shared";
import { ccfmConfigSchema } from "./schema.js";

export interface ValidationResult {
  valid: boolean;
  config?: CcfmConfig;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

/** Validate a config object against the schema. */
export function validateConfig(raw: unknown): ValidationResult {
  const result = ccfmConfigSchema.safeParse(raw);
  const warnings: string[] = [];

  if (!result.success) {
    const errors: ValidationError[] = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));
    return { valid: false, errors, warnings };
  }

  const config = result.data as CcfmConfig;

  // Semantic warnings (valid but potentially problematic)
  if (config.tokens?.budget) {
    const b = config.tokens.budget;
    const totalPercent =
      (b.systemPercent ?? 0) +
      (b.toolsPercent ?? 0) +
      (b.historyPercent ?? 0) +
      (b.responsePercent ?? 0) +
      (b.reservePercent ?? 0);
    if (totalPercent > 0 && Math.abs(totalPercent - 100) > 1) {
      warnings.push(
        `Token budget percentages sum to ${totalPercent.toFixed(1)}%, expected 100%`,
      );
    }
  }

  if (config.gateway?.port && config.gateway.port < 1024) {
    warnings.push(
      `Gateway port ${config.gateway.port} is below 1024 and may require elevated privileges`,
    );
  }

  if (config.security?.toolApprovalRequired === false) {
    warnings.push(
      "Tool approval is disabled — all tool calls will execute without confirmation",
    );
  }

  return { valid: true, config, errors: [], warnings };
}

/** Validate a partial config update. More lenient than full validation. */
export function validatePartialConfig(raw: unknown): ValidationResult {
  const result = ccfmConfigSchema.partial().safeParse(raw);
  const warnings: string[] = [];

  if (!result.success) {
    const errors: ValidationError[] = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));
    return { valid: false, errors, warnings };
  }

  return { valid: true, config: result.data as CcfmConfig, errors: [], warnings };
}
