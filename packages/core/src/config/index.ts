/**
 * Config module barrel export.
 */

export { loadConfig, getConfig, setConfig, writeConfig, resetConfig } from "./config.js";
export type { LoadConfigResult } from "./config.js";

export { resolveConfigDir, resolveDataDir, resolveAgentDir, resolveConfigFilePath,
  resolveAuthProfilesPath, resolveModelsConfigPath, resolveSessionDir,
  resolveMemoryDir, resolveLogDir, ensureDir, ensureConfigDirStructure,
} from "./paths.js";

export { ccfmConfigSchema } from "./schema.js";
export type { CcfmConfigSchema } from "./schema.js";

export { DEFAULT_CONFIG } from "./defaults.js";

export { validateConfig, validatePartialConfig } from "./validation.js";
export type { ValidationResult, ValidationError } from "./validation.js";

export { substituteEnvVars, substituteEnvVarsDeep } from "./env-substitution.js";

export { discoverProvidersFromEnv, getProviderApiKeyFromEnv,
  getKnownProviderEnvVars,
} from "./env-vars.js";
export type { DiscoveredProvider } from "./env-vars.js";

export { mergeConfigs, applyRuntimeOverrides } from "./merge-config.js";

export { extractSessionOverrides, resolveEffectiveModel,
  resolveEffectiveProvider,
} from "./runtime-overrides.js";
export type { RuntimeOverrides } from "./runtime-overrides.js";

export { migrateConfig, needsMigration, CURRENT_CONFIG_VERSION } from "./legacy-migrate.js";

export { readJson5File, writeJson5File, readJsonFile, writeJsonFile } from "./io.js";
