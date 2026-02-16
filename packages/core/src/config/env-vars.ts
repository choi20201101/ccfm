/**
 * Environment variable detection for implicit provider discovery.
 * Checks known API key env vars to auto-discover available providers.
 */

/** Known environment variable mappings for provider API keys. */
const PROVIDER_ENV_VARS: Record<string, string[]> = {
  anthropic: ["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  google: ["GOOGLE_AI_API_KEY", "GEMINI_API_KEY"],
  bedrock: ["AWS_ACCESS_KEY_ID"],
  copilot: ["GITHUB_COPILOT_TOKEN", "GITHUB_TOKEN"],
  together: ["TOGETHER_API_KEY"],
  huggingface: ["HUGGINGFACE_API_KEY", "HF_TOKEN"],
  ollama: [], // Local, no API key needed
  vllm: ["VLLM_API_KEY"],
  venice: ["VENICE_API_KEY"],
  minimax: ["MINIMAX_API_KEY"],
  qwen: ["DASHSCOPE_API_KEY"],
};

export interface DiscoveredProvider {
  providerId: string;
  envVar: string;
  apiKey: string;
}

/** Discover providers available via environment variables. */
export function discoverProvidersFromEnv(): DiscoveredProvider[] {
  const discovered: DiscoveredProvider[] = [];

  for (const [providerId, envVars] of Object.entries(PROVIDER_ENV_VARS)) {
    for (const envVar of envVars) {
      const value = process.env[envVar];
      if (value && value.trim().length > 0) {
        discovered.push({ providerId, envVar, apiKey: value.trim() });
        break; // One match per provider is enough
      }
    }
  }

  // Ollama is always available if running locally
  // (actual check happens at provider init time)

  return discovered;
}

/** Get the API key for a specific provider from environment. */
export function getProviderApiKeyFromEnv(providerId: string): string | undefined {
  const envVars = PROVIDER_ENV_VARS[providerId];
  if (!envVars) return undefined;

  for (const envVar of envVars) {
    const value = process.env[envVar];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

/** Get all known provider env var names. */
export function getKnownProviderEnvVars(): Record<string, string[]> {
  return { ...PROVIDER_ENV_VARS };
}
