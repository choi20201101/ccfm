/**
 * Configuration version migration.
 * Handles upgrades from older config formats to current.
 */

/** Current config version. */
export const CURRENT_CONFIG_VERSION = 1;

/** Migrate a config from an older version to current. */
export function migrateConfig(raw: Record<string, unknown>): Record<string, unknown> {
  let version = (raw._version as number) ?? 0;
  let config = { ...raw };

  // Version 0 → 1: initial schema
  if (version < 1) {
    config = migrateV0ToV1(config);
    version = 1;
  }

  // Remove internal version field before validation
  delete config._version;

  return config;
}

/** Check if a config needs migration. */
export function needsMigration(raw: Record<string, unknown>): boolean {
  const version = (raw._version as number) ?? 0;
  return version < CURRENT_CONFIG_VERSION;
}

// --- Migration functions ---

function migrateV0ToV1(config: Record<string, unknown>): Record<string, unknown> {
  const result = { ...config };

  // Rename old field names if they exist
  if ("ai" in result && !("agents" in result)) {
    result.agents = result.ai;
    delete result.ai;
  }

  if ("server" in result && !("gateway" in result)) {
    result.gateway = result.server;
    delete result.server;
  }

  // Ensure tokens section has the new budget structure
  if (result.tokens && typeof result.tokens === "object") {
    const tokens = result.tokens as Record<string, unknown>;
    if (!tokens.budget) {
      tokens.budget = {};
    }
  }

  result._version = 1;
  return result;
}
