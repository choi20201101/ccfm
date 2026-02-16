/**
 * OpenAI provider adapter.
 *
 * Uses the `openai` SDK for chat completions with streaming and
 * tool/function calling support.
 */

import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionChunk,
} from "openai/resources/chat/completions";

import type { Message, TokenUsage } from "@ccfm/shared";
import { getLogger } from "../../logging/logger.js";
import { ProviderError, RateLimitError } from "../../infra/errors.js";
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
// Adapter
// ---------------------------------------------------------------------------

export class OpenAIAdapter implements ProviderAdapter {
  readonly providerId = "openai";
  readonly displayName = "OpenAI";

  private readonly client: OpenAI;

  constructor(opts: { apiKey: string; baseUrl?: string }) {
    this.client = new OpenAI({
      apiKey: opts.apiKey,
      baseURL: opts.baseUrl,
    });
  }

  // -----------------------------------------------------------------------
  // sendMessage
  // -----------------------------------------------------------------------

  async sendMessage(opts: SendMessageOptions): Promise<ProviderResponse> {
    const messages = mapMessages(opts.messages, opts.systemPrompt);
    const tools = mapTools(opts.tools);

    try {
      const response = await this.client.chat.completions.create({
        model: opts.model,
        messages,
        max_tokens: opts.maxTokens,
        ...(tools.length > 0 ? { tools } : {}),
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        ...(opts.topP !== undefined ? { top_p: opts.topP } : {}),
        ...(opts.stopSequences ? { stop: opts.stopSequences } : {}),
      });

      const choice = response.choices[0];
      if (!choice) {
        throw new ProviderError("Empty response from OpenAI", "openai");
      }

      const toolCalls = mapToolCallsFromResponse(choice.message.tool_calls);

      return {
        content: choice.message.content ?? "",
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: mapUsage(response.usage),
        stopReason: mapFinishReason(choice.finish_reason),
        model: response.model ?? opts.model,
      };
    } catch (err) {
      throw wrapError(err);
    }
  }

  // -----------------------------------------------------------------------
  // streamMessage
  // -----------------------------------------------------------------------

  async *streamMessage(opts: SendMessageOptions): AsyncGenerator<StreamChunk> {
    const messages = mapMessages(opts.messages, opts.systemPrompt);
    const tools = mapTools(opts.tools);

    let stream: AsyncIterable<ChatCompletionChunk>;
    try {
      stream = await this.client.chat.completions.create({
        model: opts.model,
        messages,
        max_tokens: opts.maxTokens,
        stream: true,
        stream_options: { include_usage: true },
        ...(tools.length > 0 ? { tools } : {}),
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        ...(opts.topP !== undefined ? { top_p: opts.topP } : {}),
        ...(opts.stopSequences ? { stop: opts.stopSequences } : {}),
      });
    } catch (err) {
      throw wrapError(err);
    }

    // Track in-progress tool calls to assemble deltas
    const pendingToolCalls = new Map<number, { id: string; name: string; args: string }>();

    try {
      for await (const chunk of stream) {
        const choice = chunk.choices?.[0];

        if (choice) {
          const delta = choice.delta;

          // Text content
          if (delta?.content) {
            yield { type: "text", text: delta.content };
          }

          // Tool call deltas
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              if (tc.id) {
                // Start of a new tool call
                pendingToolCalls.set(idx, {
                  id: tc.id,
                  name: tc.function?.name ?? "",
                  args: tc.function?.arguments ?? "",
                });
                yield {
                  type: "tool_use_start",
                  toolCall: { id: tc.id, name: tc.function?.name ?? "" },
                };
              } else {
                // Continuation
                const pending = pendingToolCalls.get(idx);
                if (pending && tc.function?.arguments) {
                  pending.args += tc.function.arguments;
                  yield {
                    type: "tool_use_input",
                    toolCall: { id: pending.id, name: pending.name, input: tc.function.arguments },
                  };
                }
              }
            }
          }

          // Finish reason
          if (choice.finish_reason) {
            // Emit tool_use_end for any pending tool calls
            for (const [, _pending] of pendingToolCalls) {
              yield { type: "tool_use_end" };
            }
            pendingToolCalls.clear();

            yield {
              type: "stop",
              stopReason: mapFinishReason(choice.finish_reason),
            };
          }
        }

        // Usage on the final chunk (stream_options.include_usage)
        if (chunk.usage) {
          yield { type: "usage", usage: mapUsage(chunk.usage) };
        }
      }
    } catch (err) {
      throw wrapError(err);
    }
  }

  // -----------------------------------------------------------------------
  // listModels
  // -----------------------------------------------------------------------

  async listModels(): Promise<string[]> {
    try {
      const list = await this.client.models.list();
      const ids: string[] = [];
      for await (const model of list) {
        ids.push(model.id);
      }
      return ids.sort();
    } catch (err) {
      log.warn({ err }, "Failed to list OpenAI models");
      return [];
    }
  }

  // -----------------------------------------------------------------------
  // testConnection
  // -----------------------------------------------------------------------

  async testConnection(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (err) {
      log.warn({ err }, "OpenAI connection test failed");
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
): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    result.push({ role: "system", content: systemPrompt });
  }

  for (const msg of messages) {
    if (msg.role === "system") {
      // System messages already handled above
      continue;
    }

    if (typeof msg.content === "string") {
      if (msg.role === "tool") {
        result.push({
          role: "tool",
          content: msg.content,
          tool_call_id: msg.name ?? "",
        });
      } else {
        result.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
      continue;
    }

    // Complex content blocks
    if (msg.role === "assistant") {
      // Extract text and tool calls from blocks
      let text = "";
      const toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = [];

      for (const block of msg.content) {
        if (block.type === "text") text += block.text;
        if (block.type === "tool_use") {
          toolCalls.push({
            id: block.id,
            type: "function",
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input),
            },
          });
        }
      }

      result.push({
        role: "assistant",
        content: text || null,
        ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
      });
      continue;
    }

    if (msg.role === "tool") {
      // tool_result blocks
      for (const block of msg.content) {
        if (block.type === "tool_result") {
          result.push({
            role: "tool",
            content:
              typeof block.content === "string"
                ? block.content
                : JSON.stringify(block.content),
            tool_call_id: block.tool_use_id,
          });
        }
      }
      continue;
    }

    // User messages with content blocks
    const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    for (const block of msg.content) {
      if (block.type === "text") {
        parts.push({ type: "text", text: block.text });
      } else if (block.type === "image") {
        if (block.source.type === "url") {
          parts.push({
            type: "image_url",
            image_url: { url: block.source.url },
          });
        } else {
          parts.push({
            type: "image_url",
            image_url: {
              url: `data:${block.source.media_type};base64,${block.source.data}`,
            },
          });
        }
      }
    }
    result.push({ role: "user", content: parts });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Tool mapping
// ---------------------------------------------------------------------------

function mapTools(tools: unknown[] | undefined): ChatCompletionTool[] {
  if (!tools || tools.length === 0) return [];

  return tools.map((t) => {
    const tool = t as Record<string, unknown>;
    return {
      type: "function" as const,
      function: {
        name: (tool["name"] as string) ?? "",
        description: (tool["description"] as string) ?? "",
        parameters: (tool["input_schema"] as Record<string, unknown>) ?? {},
      },
    };
  });
}

function mapToolCallsFromResponse(
  toolCalls:
    | OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]
    | undefined
    | null,
): ToolCallResult[] {
  if (!toolCalls) return [];
  return toolCalls.map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    input: safeParseJson(tc.function.arguments),
  }));
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function mapUsage(
  usage: OpenAI.Completions.CompletionUsage | undefined | null,
): TokenUsage {
  return {
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
  };
}

function mapFinishReason(reason: string | null | undefined): StopReason {
  switch (reason) {
    case "stop":
      return "end_turn";
    case "tool_calls":
      return "tool_use";
    case "length":
      return "max_tokens";
    case "content_filter":
      return "stop_sequence";
    default:
      return "end_turn";
  }
}

// ---------------------------------------------------------------------------
// Error wrapping
// ---------------------------------------------------------------------------

function wrapError(err: unknown): Error {
  if (err instanceof OpenAI.APIError) {
    if (err.status === 429) {
      const retryAfter = parseRetryAfterMs(err.headers);
      return new RateLimitError("openai", retryAfter);
    }
    return new ProviderError(err.message, "openai", {
      statusCode: err.status,
      isRetryable: (err.status ?? 0) >= 500,
      details: { type: err.type, code: err.code },
    });
  }
  if (err instanceof Error) return err;
  return new ProviderError(String(err), "openai");
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

function safeParseJson(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
