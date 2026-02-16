/**
 * Ollama local-model provider adapter.
 *
 * Talks to Ollama's HTTP API at localhost:11434 (configurable).
 * Supports streaming via the `/api/chat` endpoint and auto-discovers
 * available models via `/api/tags`.
 */

import type { Message, TokenUsage } from "@ccfm/shared";
import { getLogger } from "../../logging/logger.js";
import { ProviderError } from "../../infra/errors.js";
import { ccfmFetch } from "../../infra/fetch.js";
import type {
  ProviderAdapter,
  ProviderResponse,
  SendMessageOptions,
  StreamChunk,
  StopReason,
  ToolCallResult,
} from "../types.js";

const log = getLogger("providers");

// ---------------------------------------------------------------------------
// Types for Ollama API payloads
// ---------------------------------------------------------------------------

interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream: boolean;
  options?: Record<string, unknown>;
  tools?: unknown[];
}

interface OllamaChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: Array<{
    function: { name: string; arguments: Record<string, unknown> };
  }>;
}

interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
    tool_calls?: Array<{
      function: { name: string; arguments: Record<string, unknown> };
    }>;
  };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  done_reason?: string;
}

interface OllamaTagsResponse {
  models: Array<{
    name: string;
    model: string;
    size: number;
    digest: string;
    modified_at: string;
  }>;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class OllamaAdapter implements ProviderAdapter {
  readonly providerId = "ollama";
  readonly displayName = "Ollama (Local)";

  private readonly baseUrl: string;

  constructor(opts?: { baseUrl?: string }) {
    this.baseUrl = (opts?.baseUrl ?? "http://localhost:11434").replace(/\/+$/, "");
  }

  // -----------------------------------------------------------------------
  // sendMessage
  // -----------------------------------------------------------------------

  async sendMessage(opts: SendMessageOptions): Promise<ProviderResponse> {
    const messages = mapMessages(opts.messages, opts.systemPrompt);
    const body: OllamaChatRequest = {
      model: opts.model,
      messages,
      stream: false,
      ...(opts.tools && opts.tools.length > 0
        ? { tools: mapToolsForOllama(opts.tools) }
        : {}),
      options: buildOptions(opts),
    };

    try {
      const response = await ccfmFetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        timeoutMs: 120_000, // Local models can be slow
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new ProviderError(
          `Ollama returned HTTP ${response.status}: ${text}`,
          "ollama",
          { statusCode: response.status, isRetryable: response.status >= 500 },
        );
      }

      const data = (await response.json()) as OllamaChatResponse;
      return mapResponse(data, opts.model);
    } catch (err) {
      throw wrapError(err);
    }
  }

  // -----------------------------------------------------------------------
  // streamMessage
  // -----------------------------------------------------------------------

  async *streamMessage(opts: SendMessageOptions): AsyncGenerator<StreamChunk> {
    const messages = mapMessages(opts.messages, opts.systemPrompt);
    const body: OllamaChatRequest = {
      model: opts.model,
      messages,
      stream: true,
      ...(opts.tools && opts.tools.length > 0
        ? { tools: mapToolsForOllama(opts.tools) }
        : {}),
      options: buildOptions(opts),
    };

    let response: Response;
    try {
      response = await ccfmFetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        timeoutMs: 300_000,
        maxRetries: 0, // Don't retry streaming requests
      });
    } catch (err) {
      throw wrapError(err);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new ProviderError(
        `Ollama returned HTTP ${response.status}: ${text}`,
        "ollama",
        { statusCode: response.status, isRetryable: false },
      );
    }

    if (!response.body) {
      throw new ProviderError("Ollama returned no response body", "ollama");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let totalPromptTokens = 0;
    let totalEvalTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Ollama streams newline-delimited JSON
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let chunk: OllamaChatResponse;
          try {
            chunk = JSON.parse(trimmed) as OllamaChatResponse;
          } catch {
            log.debug({ line: trimmed }, "Skipping unparseable Ollama chunk");
            continue;
          }

          // Text content
          if (chunk.message?.content) {
            yield { type: "text", text: chunk.message.content };
          }

          // Tool calls (emitted in a single chunk by Ollama)
          if (chunk.message?.tool_calls && chunk.message.tool_calls.length > 0) {
            for (const tc of chunk.message.tool_calls) {
              const id = `ollama-tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              yield {
                type: "tool_use_start",
                toolCall: { id, name: tc.function.name },
              };
              yield {
                type: "tool_use_input",
                toolCall: {
                  id,
                  name: tc.function.name,
                  input: JSON.stringify(tc.function.arguments),
                },
              };
              yield { type: "tool_use_end" };
            }
          }

          // Final chunk with usage stats
          if (chunk.done) {
            totalPromptTokens = chunk.prompt_eval_count ?? 0;
            totalEvalTokens = chunk.eval_count ?? 0;

            yield {
              type: "usage",
              usage: {
                inputTokens: totalPromptTokens,
                outputTokens: totalEvalTokens,
              },
            };
            yield {
              type: "stop",
              stopReason: chunk.done_reason === "stop" ? "end_turn" : "end_turn",
            };
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // -----------------------------------------------------------------------
  // listModels — auto-discover from Ollama
  // -----------------------------------------------------------------------

  async listModels(): Promise<string[]> {
    try {
      const response = await ccfmFetch(`${this.baseUrl}/api/tags`, {
        timeoutMs: 5_000,
        maxRetries: 0,
      });

      if (!response.ok) return [];

      const data = (await response.json()) as OllamaTagsResponse;
      return (data.models ?? []).map((m) => m.name);
    } catch (err) {
      log.debug({ err }, "Failed to list Ollama models (is Ollama running?)");
      return [];
    }
  }

  // -----------------------------------------------------------------------
  // testConnection
  // -----------------------------------------------------------------------

  async testConnection(): Promise<boolean> {
    try {
      const response = await ccfmFetch(`${this.baseUrl}/api/tags`, {
        timeoutMs: 3_000,
        maxRetries: 0,
        logRequest: false,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Message mapping
// ---------------------------------------------------------------------------

function mapMessages(
  messages: Message[],
  systemPrompt?: string,
): OllamaChatMessage[] {
  const result: OllamaChatMessage[] = [];

  if (systemPrompt) {
    result.push({ role: "system", content: systemPrompt });
  }

  for (const msg of messages) {
    if (msg.role === "system") continue;

    if (typeof msg.content === "string") {
      result.push({
        role: msg.role as OllamaChatMessage["role"],
        content: msg.content,
      });
      continue;
    }

    // Flatten content blocks to text for Ollama
    let text = "";
    const toolCalls: OllamaChatMessage["tool_calls"] = [];

    for (const block of msg.content) {
      if (block.type === "text") {
        text += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          function: {
            name: block.name,
            arguments: block.input as Record<string, unknown>,
          },
        });
      } else if (block.type === "tool_result") {
        const content =
          typeof block.content === "string"
            ? block.content
            : JSON.stringify(block.content);
        result.push({ role: "tool", content });
        continue;
      } else if (block.type === "image") {
        text += "[image attached]";
      }
    }

    if (text || toolCalls.length > 0) {
      result.push({
        role: msg.role as OllamaChatMessage["role"],
        content: text,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Tool mapping
// ---------------------------------------------------------------------------

function mapToolsForOllama(tools: unknown[]): unknown[] {
  return tools.map((t) => {
    const tool = t as Record<string, unknown>;
    return {
      type: "function",
      function: {
        name: tool["name"] ?? "",
        description: tool["description"] ?? "",
        parameters: tool["input_schema"] ?? {},
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Response mapping
// ---------------------------------------------------------------------------

function mapResponse(
  data: OllamaChatResponse,
  requestModel: string,
): ProviderResponse {
  const toolCalls: ToolCallResult[] = [];

  if (data.message.tool_calls) {
    for (const tc of data.message.tool_calls) {
      toolCalls.push({
        id: `ollama-tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: tc.function.name,
        input: tc.function.arguments,
      });
    }
  }

  const stopReason: StopReason =
    toolCalls.length > 0 ? "tool_use" : "end_turn";

  return {
    content: data.message.content ?? "",
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: {
      inputTokens: data.prompt_eval_count ?? 0,
      outputTokens: data.eval_count ?? 0,
    },
    stopReason,
    model: data.model ?? requestModel,
  };
}

// ---------------------------------------------------------------------------
// Options builder
// ---------------------------------------------------------------------------

function buildOptions(opts: SendMessageOptions): Record<string, unknown> {
  const options: Record<string, unknown> = {};
  if (opts.temperature !== undefined) options["temperature"] = opts.temperature;
  if (opts.topP !== undefined) options["top_p"] = opts.topP;
  if (opts.maxTokens !== undefined) options["num_predict"] = opts.maxTokens;
  if (opts.stopSequences) options["stop"] = opts.stopSequences;
  return options;
}

// ---------------------------------------------------------------------------
// Error wrapping
// ---------------------------------------------------------------------------

function wrapError(err: unknown): Error {
  if (err instanceof ProviderError) return err;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    const isConn =
      msg.includes("econnrefused") ||
      msg.includes("econnreset") ||
      msg.includes("fetch failed");

    return new ProviderError(
      isConn
        ? "Cannot connect to Ollama. Is it running? (ollama serve)"
        : err.message,
      "ollama",
      { isRetryable: isConn },
    );
  }
  return new ProviderError(String(err), "ollama");
}
