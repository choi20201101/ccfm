/**
 * Model configuration management.
 *
 * Merges implicit (env-discovered) and explicit (config file) provider
 * definitions, exposes a unified model catalog, and provides fuzzy model
 * selection so users can write "sonnet" instead of full model IDs.
 */

import type {
  ModelDefinitionConfig,
  ModelInfo,
  ModelsConfig,
  ProviderConfig,
} from "@ccfm/shared";

import { getLogger } from "../logging/logger.js";
import { discoverProvidersFromEnv } from "../config/env-vars.js";

const log = getLogger("providers");

// ---------------------------------------------------------------------------
// Built-in model catalogs (well-known models per provider)
// ---------------------------------------------------------------------------

const BUILTIN_ANTHROPIC_MODELS: ModelDefinitionConfig[] = [
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 200_000,
    maxTokens: 32_000,
    cost: { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 200_000,
    maxTokens: 16_000,
    cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    input: ["text", "image"],
    contextWindow: 200_000,
    maxTokens: 8_192,
    cost: { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
  },
];

const BUILTIN_OPENAI_MODELS: ModelDefinitionConfig[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    input: ["text", "image"],
    contextWindow: 128_000,
    maxTokens: 16_384,
    cost: { input: 2.5, output: 10 },
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    input: ["text", "image"],
    contextWindow: 128_000,
    maxTokens: 16_384,
    cost: { input: 0.15, output: 0.6 },
  },
  {
    id: "o3-mini",
    name: "o3-mini",
    reasoning: true,
    input: ["text"],
    contextWindow: 200_000,
    maxTokens: 100_000,
    cost: { input: 1.1, output: 4.4 },
  },
];

const BUILTIN_CATALOGS: Record<string, ModelDefinitionConfig[]> = {
  anthropic: BUILTIN_ANTHROPIC_MODELS,
  openai: BUILTIN_OPENAI_MODELS,
};

// ---------------------------------------------------------------------------
// Provider defaults (base URLs, API type)
// ---------------------------------------------------------------------------

const PROVIDER_DEFAULTS: Record<string, Omit<ProviderConfig, "models">> = {
  anthropic: {
    baseUrl: "https://api.anthropic.com",
    api: "anthropic-messages",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    api: "openai-completions",
  },
  ollama: {
    baseUrl: "http://localhost:11434",
    api: "ollama",
  },
  google: {
    baseUrl: "https://generativelanguage.googleapis.com",
    api: "google-generative",
  },
};

// ---------------------------------------------------------------------------
// Merge logic
// ---------------------------------------------------------------------------

/**
 * Produce the merged models configuration by combining implicit providers
 * (discovered from env vars) with the explicit config file section.
 */
export function mergeModelsConfig(
  explicit: ModelsConfig | undefined,
): ModelsConfig {
  const mode = explicit?.mode ?? "merge";
  const explicitProviders = explicit?.providers ?? {};

  if (mode === "replace") {
    log.debug("Models config mode=replace; skipping implicit discovery");
    return { providers: explicitProviders, mode };
  }

  // Discover implicit providers
  const discovered = discoverProvidersFromEnv();
  const merged: Record<string, ProviderConfig> = {};

  for (const disc of discovered) {
    const defaults = PROVIDER_DEFAULTS[disc.providerId];
    const catalog = BUILTIN_CATALOGS[disc.providerId] ?? [];

    merged[disc.providerId] = {
      baseUrl: defaults?.baseUrl ?? "",
      api: defaults?.api ?? "openai-completions",
      apiKey: disc.apiKey,
      models: catalog,
      implicit: true,
    };
  }

  // Ollama is always included as an implicit provider (connectivity checked later)
  if (!merged["ollama"]) {
    merged["ollama"] = {
      baseUrl: "http://localhost:11434",
      api: "ollama",
      models: [],
      implicit: true,
    };
  }

  // Overlay explicit providers on top
  for (const [id, providerCfg] of Object.entries(explicitProviders)) {
    if (merged[id]) {
      // Merge: explicit overrides implicit but keeps implicit models as fallback
      merged[id] = {
        ...merged[id],
        ...providerCfg,
        models:
          providerCfg.models.length > 0
            ? providerCfg.models
            : merged[id].models,
        implicit: false,
      };
    } else {
      merged[id] = { ...providerCfg, implicit: false };
    }
  }

  log.debug(
    { providers: Object.keys(merged) },
    "Merged model configuration",
  );

  return { providers: merged, mode };
}

// ---------------------------------------------------------------------------
// Model catalog
// ---------------------------------------------------------------------------

/** Build a flat list of {@link ModelInfo} from a merged config. */
export function buildModelCatalog(config: ModelsConfig): ModelInfo[] {
  const catalog: ModelInfo[] = [];

  for (const [providerId, provider] of Object.entries(config.providers)) {
    for (const model of provider.models) {
      catalog.push({
        id: model.id,
        provider: providerId,
        displayName: model.name,
        contextWindow: model.contextWindow ?? 128_000,
        maxOutputTokens: model.maxTokens ?? 4_096,
        inputCostPerMillionTokens: model.cost?.input ?? 0,
        outputCostPerMillionTokens: model.cost?.output ?? 0,
        supportsCaching: (model.cost?.cacheRead ?? 0) > 0,
        supportsTools: true,
        supportsVision: model.input?.includes("image") ?? false,
        supportsReasoning: model.reasoning ?? false,
      });
    }
  }

  return catalog;
}

// ---------------------------------------------------------------------------
// Model selection / fuzzy matching
// ---------------------------------------------------------------------------

/** Well-known aliases that map to canonical model IDs. */
const MODEL_ALIASES: Record<string, string> = {
  opus: "claude-opus-4-20250514",
  sonnet: "claude-sonnet-4-20250514",
  haiku: "claude-3-5-haiku-20241022",
  "gpt4o": "gpt-4o",
  "gpt4o-mini": "gpt-4o-mini",
  "4o": "gpt-4o",
  "4o-mini": "gpt-4o-mini",
  "o3-mini": "o3-mini",
};

/**
 * Resolve a user-supplied model string to a concrete model ID.
 *
 * Tries, in order:
 * 1. Exact match against model IDs in the catalog
 * 2. Known alias lookup
 * 3. Substring match (model ID contains the query)
 *
 * Returns `undefined` if nothing matches.
 */
export function resolveModelId(
  query: string,
  catalog: ModelInfo[],
): ModelInfo | undefined {
  const q = query.toLowerCase().trim();

  // 1. Exact match
  const exact = catalog.find((m) => m.id.toLowerCase() === q);
  if (exact) return exact;

  // 2. Alias
  const aliased = MODEL_ALIASES[q];
  if (aliased) {
    const found = catalog.find((m) => m.id === aliased);
    if (found) return found;
  }

  // 3. Substring / fuzzy
  const substringMatches = catalog.filter((m) =>
    m.id.toLowerCase().includes(q),
  );
  if (substringMatches.length === 1) return substringMatches[0];

  // If multiple substring matches, prefer shorter IDs (more specific)
  if (substringMatches.length > 1) {
    substringMatches.sort((a, b) => a.id.length - b.id.length);
    log.debug(
      { query: q, matches: substringMatches.map((m) => m.id) },
      "Ambiguous model query, selecting shortest match",
    );
    return substringMatches[0];
  }

  return undefined;
}

/**
 * Convenience: resolve and also return the provider ID so the caller knows
 * which adapter to dispatch to.
 */
export function selectModel(
  query: string,
  catalog: ModelInfo[],
): { model: ModelInfo; providerId: string } | undefined {
  const model = resolveModelId(query, catalog);
  if (!model) return undefined;
  return { model, providerId: model.provider };
}
