/**
 * Model and provider configuration types.
 * Matches OpenClaw's model discovery and configuration merging system.
 */

export type ModelApi =
  | "anthropic-messages"
  | "openai-completions"
  | "ollama"
  | "bedrock-converse-stream"
  | "google-generative";

export interface ModelDefinitionConfig {
  id: string;
  name: string;
  reasoning?: boolean;
  input?: ("text" | "image")[];
  cost?: {
    input: number;   // per 1M tokens
    output: number;  // per 1M tokens
    cacheRead?: number;
    cacheWrite?: number;
  };
  contextWindow?: number;
  maxTokens?: number;
}

export interface ProviderConfig {
  baseUrl: string;
  api: ModelApi;
  apiKey?: string;
  auth?: "aws-sdk" | "oauth";
  models: ModelDefinitionConfig[];
  /** Provider was discovered from env vars or auth profiles (not explicit config). */
  implicit?: boolean;
}

export interface ModelInfo {
  id: string;
  provider: string;
  displayName: string;
  contextWindow: number;
  maxOutputTokens: number;
  inputCostPerMillionTokens: number;
  outputCostPerMillionTokens: number;
  supportsCaching?: boolean;
  supportsTools?: boolean;
  supportsVision?: boolean;
  supportsReasoning?: boolean;
}

export interface ModelsConfig {
  providers: Record<string, ProviderConfig>;
  /** Merge mode: "replace" replaces, "merge" merges implicit+explicit. */
  mode?: "replace" | "merge";
}
