/**
 * Anthropic Claude provider adapter.
 *
 * Uses the `@anthropic-ai/sdk` package for both synchronous and streaming
 * message calls.  Supports prompt caching via cache_control injection.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

import type { Message, TokenUsage } from "@ccfm/shared";
import { getLogger } from "../../logging/logger.js";
import { ProviderError, RateLimitError } from "../../infra/errors.js";
import type {
  ProviderAdapter,
  ProviderResponse,
  SendMessageOptions,
  StreamChunk,
  StopReason,
} from "../types.js";
import { injectCacheControl, type CacheableTextBlock } from "./cache-control.js";

const log = getLogger("providers");

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class AnthropicAdapter implements ProviderAdapter {
  readonly providerId = "anthropic";
  readonly displayName = "Anthropic Claude";

  private readonly client: Anthropic;

  constructor(opts: { apiKey: string; baseUrl?: string }) {
    this.client = new Anthropic({
      apiKey: opts.apiKey,
      baseURL: opts.baseUrl,
    });
  }

  // -----------------------------------------------------------------------
  // sendMessage
  // -----------------------------------------------------------------------

  async sendMessage(opts: SendMessageOptions): Promise<ProviderResponse> {
    const { system, tools } = this.prepareRequest(opts);
    const messages = mapMessages(opts.messages);

    try {
      const response = await this.client.messages.create({
        model: opts.model,
        max_tokens: opts.maxTokens ?? 4_096,
        messages,
        ...(system.length > 0 ? { system } : {}),
        ...(tools.length > 0 ? { tools: tools as Anthropic.Tool[] } : {}),
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        ...(opts.topP !== undefined ? { top_p: opts.topP } : {}),
        ...(opts.stopSequences ? { stop_sequences: opts.stopSequences } : {}),
      });

      return mapResponse(response, opts.model);
    } catch (err) {
      throw wrapError(err);
    }
  }

  // -----------------------------------------------------------------------
  // streamMessage
  // -----------------------------------------------------------------------

  async *streamMessage(opts: SendMessageOptions): AsyncGenerator<StreamChunk> {
    const { system, tools } = this.prepareRequest(opts);
    const messages = mapMessages(opts.messages);

    let stream: ReturnType<typeof this.client.messages.stream>;
    try {
      stream = this.client.messages.stream({
        model: opts.model,
        max_tokens: opts.maxTokens ?? 4_096,
        messages,
        ...(system.length > 0 ? { system } : {}),
        ...(tools.length > 0 ? { tools: tools as Anthropic.Tool[] } : {}),
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        ...(opts.topP !== undefined ? { top_p: opts.topP } : {}),
        ...(opts.stopSequences ? { stop_sequences: opts.stopSequences } : {}),
      });
    } catch (err) {
      throw wrapError(err);
    }

    try {
      for await (const event of stream) {
        const chunks = mapStreamEvent(event);
        for (const chunk of chunks) {
          yield chunk;
        }
      }

      // Final usage from the accumulated message
      const finalMessage = await stream.finalMessage();
      yield {
        type: "usage",
        usage: mapUsage(finalMessage.usage),
      };
      yield {
        type: "stop",
        stopReason: mapStopReason(finalMessage.stop_reason),
      };
    } catch (err) {
      throw wrapError(err);
    }
  }

  // -----------------------------------------------------------------------
  // listModels
  // -----------------------------------------------------------------------

  async listModels(): Promise<string[]> {
    // The Anthropic SDK does not expose a list-models endpoint yet.
    // Return the well-known model IDs.
    return [
      "claude-opus-4-20250514",
      "claude-sonnet-4-20250514",
      "claude-3-5-haiku-20241022",
    ];
  }

  // -----------------------------------------------------------------------
  // testConnection
  // -----------------------------------------------------------------------

  async testConnection(): Promise<boolean> {
    try {
      // Minimal request to verify the API key is valid.
      await this.client.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      });
      return true;
    } catch (err) {
      log.warn({ err }, "Anthropic connection test failed");
      return false;
    }
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private prepareRequest(opts: SendMessageOptions): {
    system: CacheableTextBlock[];
    tools: unknown[];
  } {
    if (opts.cacheControl) {
      return injectCacheControl(opts.model, opts.systemPrompt, opts.tools);
    }
    return {
      system: opts.systemPrompt
        ? [{ type: "text" as const, text: opts.systemPrompt }]
        : [],
      tools: opts.tools ?? [],
    };
  }
}

// ---------------------------------------------------------------------------
// Message mapping
// ---------------------------------------------------------------------------

function mapMessages(messages: Message[]): MessageParam[] {
  return messages
    .filter((m) => m.role !== "system")
    .map((m): MessageParam => {
      if (typeof m.content === "string") {
        return { role: m.role as "user" | "assistant", content: m.content };
      }

      // Map content blocks
      const blocks = m.content.map((block) => {
        switch (block.type) {
          case "text":
            return {
              type: "text" as const,
              text: block.text,
              ...(block.cache_control ? { cache_control: block.cache_control } : {}),
            };
          case "image":
            if (block.source.type === "base64") {
              return {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: block.source.media_type as
                    | "image/jpeg"
                    | "image/png"
                    | "image/gif"
                    | "image/webp",
                  data: block.source.data,
                },
              };
            }
            // URL source — Anthropic expects base64; the caller should convert.
            return { type: "text" as const, text: `[image: ${block.source.url}]` };
          case "tool_use":
            return {
              type: "tool_use" as const,
              id: block.id,
              name: block.name,
              input: block.input as Record<string, unknown>,
            };
          case "tool_result":
            return {
              type: "tool_result" as const,
              tool_use_id: block.tool_use_id,
              content:
                typeof block.content === "string"
                  ? block.content
                  : JSON.stringify(block.content),
              ...(block.is_error ? { is_error: true } : {}),
            };
          default:
            return { type: "text" as const, text: JSON.stringify(block) };
        }
      });

      return { role: m.role as "user" | "assistant", content: blocks };
    });
}

// ---------------------------------------------------------------------------
// Response mapping
// ---------------------------------------------------------------------------

function mapResponse(
  response: Anthropic.Message,
  requestModel: string,
): ProviderResponse {
  let textContent = "";
  const toolCalls: ProviderResponse["toolCalls"] = [];

  for (const block of response.content) {
    if (block.type === "text") {
      textContent += block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        name: block.name,
        input: block.input,
      });
    }
  }

  return {
    content: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: mapUsage(response.usage),
    stopReason: mapStopReason(response.stop_reason),
    model: response.model ?? requestModel,
    cached:
      (response.usage as unknown as Record<string, unknown>)["cache_read_input_tokens"] != null &&
      ((response.usage as unknown as Record<string, unknown>)["cache_read_input_tokens"] as number) > 0,
  };
}

function mapUsage(
  usage: Anthropic.Usage | Record<string, unknown>,
): TokenUsage {
  const u = usage as Record<string, unknown>;
  return {
    inputTokens: (u["input_tokens"] as number) ?? 0,
    outputTokens: (u["output_tokens"] as number) ?? 0,
    cacheCreationTokens: (u["cache_creation_input_tokens"] as number) ?? undefined,
    cacheReadTokens: (u["cache_read_input_tokens"] as number) ?? undefined,
  };
}

function mapStopReason(reason: string | null | undefined): StopReason {
  switch (reason) {
    case "end_turn":
      return "end_turn";
    case "tool_use":
      return "tool_use";
    case "max_tokens":
      return "max_tokens";
    case "stop_sequence":
      return "stop_sequence";
    default:
      return "end_turn";
  }
}

// ---------------------------------------------------------------------------
// Stream event mapping
// ---------------------------------------------------------------------------

function mapStreamEvent(event: unknown): StreamChunk[] {
  const e = event as Record<string, unknown>;
  const type = e["type"] as string | undefined;

  switch (type) {
    case "content_block_delta": {
      const delta = e["delta"] as Record<string, unknown> | undefined;
      if (!delta) return [];

      if (delta["type"] === "text_delta") {
        return [{ type: "text", text: delta["text"] as string }];
      }
      if (delta["type"] === "input_json_delta") {
        return [
          {
            type: "tool_use_input",
            toolCall: {
              id: "",
              name: "",
              input: delta["partial_json"] as string,
            },
          },
        ];
      }
      return [];
    }

    case "content_block_start": {
      const block = e["content_block"] as Record<string, unknown> | undefined;
      if (block?.["type"] === "tool_use") {
        return [
          {
            type: "tool_use_start",
            toolCall: {
              id: block["id"] as string,
              name: block["name"] as string,
            },
          },
        ];
      }
      return [];
    }

    case "content_block_stop":
      return [{ type: "tool_use_end" }];

    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Error wrapping
// ---------------------------------------------------------------------------

function wrapError(err: unknown): Error {
  if (err instanceof Anthropic.APIError) {
    if (err.status === 429) {
      const retryAfter = parseRetryAfterMs(err.headers);
      return new RateLimitError("anthropic", retryAfter);
    }
    return new ProviderError(err.message, "anthropic", {
      statusCode: err.status,
      isRetryable: err.status >= 500,
      details: { type: err.error },
    });
  }
  if (err instanceof Error) return err;
  return new ProviderError(String(err), "anthropic");
}

function parseRetryAfterMs(
  headers: Record<string, string | string[] | undefined> | undefined,
): number | undefined {
  if (!headers) return undefined;
  const raw = headers["retry-after"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? seconds * 1_000 : undefined;
}
