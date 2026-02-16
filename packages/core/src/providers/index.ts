/**
 * Providers module — LLM provider adapters.
 *
 * Re-exports the public surface: types, registry, model config, adapters,
 * caching helpers, and fallback logic.
 */

// --- Types ---
export type {
  ProviderAdapter,
  SendMessageOptions,
  ProviderResponse,
  StreamChunk,
  StreamChunkType,
  StopReason,
  ToolCallResult,
} from "./types.js";

// --- Registry ---
export {
  registerProvider,
  unregisterProvider,
  getProvider,
  getAllProviders,
  hasProvider,
  discoverImplicitProviders,
  clearProviders,
} from "./registry.js";

// --- Model configuration ---
export {
  mergeModelsConfig,
  buildModelCatalog,
  resolveModelId,
  selectModel,
} from "./models-config.js";

// --- Anthropic adapter & caching ---
export { AnthropicAdapter } from "./anthropic/adapter.js";
export {
  injectCacheControl,
  injectSystemPromptCache,
  injectToolsCacheControl,
  modelSupportsCaching,
} from "./anthropic/cache-control.js";
export type { CacheableTextBlock, CacheControlResult } from "./anthropic/cache-control.js";

// --- OpenAI adapter ---
export { OpenAIAdapter } from "./openai/adapter.js";

// --- Ollama adapter ---
export { OllamaAdapter } from "./ollama/adapter.js";

// --- Fallback ---
export {
  sendWithFallback,
  streamWithFallback,
  getFallbackChain,
  buildFallbackConfig,
} from "./model-fallback.js";
export type {
  FallbackChainEntry,
  FallbackConfig,
  FallbackResult,
  FallbackStreamResult,
} from "./model-fallback.js";
