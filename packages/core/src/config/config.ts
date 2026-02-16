/**
 * Main config loader — the primary entry point for configuration.
 * Loads JSON5 config, applies env substitution, merges with defaults, validates.
 */

import type { CcfmConfig } from "@ccfm/shared";
import { resolveConfigFilePath, ensureConfigDirStructure } from "./paths.js";
import { readJson5File, writeJson5File } from "./io.js";
import { substituteEnvVarsDeep } from "./env-substitution.js";
import { mergeConfigs } from "./merge-config.js";
import { DEFAULT_CONFIG } from "./defaults.js";
import { validateConfig } from "./validation.js";
import { migrateConfig, needsMigration } from "./legacy-migrate.js";

export interface LoadConfigResult {
  config: CcfmConfig;
  configPath: string;
  isNewInstall: boolean;
  warnings: string[];
}

/** Singleton config instance. */
let currentConfig: CcfmConfig | null = null;

/**
 * Load the CCFM configuration.
 * 1. Ensure directory structure
 * 2. Read JSON5 file (or use empty if not found)
 * 3. Migrate if needed
 * 4. Substitute env vars
 * 5. Merge with defaults
 * 6. Validate
 */
export function loadConfig(configPath?: string): LoadConfigResult {
  ensureConfigDirStructure();

  const filePath = configPath ?? resolveConfigFilePath();
  const warnings: string[] = [];
  let isNewInstall = false;

  // Read config file
  let raw = readJson5File<Record<string, unknown>>(filePath);
  if (!raw) {
    isNewInstall = true;
    raw = {};
  }

  // Migrate old config versions
  if (needsMigration(raw)) {
    raw = migrateConfig(raw);
    warnings.push("Config was migrated to the latest version");
  }

  // Substitute environment variables
  const substituted = substituteEnvVarsDeep(raw) as Partial<CcfmConfig>;

  // Merge with defaults
  const merged = mergeConfigs(DEFAULT_CONFIG, substituted);

  // Validate
  const validation = validateConfig(merged);
  if (!validation.valid) {
    const errMessages = validation.errors.map(
      (e) => `${e.path}: ${e.message}`,
    );
    throw new Error(
      `Invalid configuration:\n${errMessages.join("\n")}`,
    );
  }

  warnings.push(...validation.warnings);

  currentConfig = validation.config ?? merged;
  return {
    config: currentConfig,
    configPath: filePath,
    isNewInstall,
    warnings,
  };
}

/** Get the currently loaded config. Throws if not yet loaded. */
export function getConfig(): CcfmConfig {
  if (!currentConfig) {
    throw new Error("Config not loaded. Call loadConfig() first.");
  }
  return currentConfig;
}

/** Update the current config in memory (does not write to disk). */
export function setConfig(config: CcfmConfig): void {
  currentConfig = config;
}

/** Write the current config to disk as JSON5. */
export function writeConfig(config?: CcfmConfig, configPath?: string): void {
  const cfg = config ?? currentConfig;
  if (!cfg) throw new Error("No config to write");

  const filePath = configPath ?? resolveConfigFilePath();
  writeJson5File(filePath, cfg);
}

/** Reset config singleton (for testing). */
export function resetConfig(): void {
  currentConfig = null;
}
