/**
 * Chat API endpoint.
 * Bridges the web UI chat interface to the LLM provider.
 * Uses the runtime setup from the setup wizard.
 */

import { Hono } from "hono";
import type { ApiResponse, Message } from "@ccfm/shared";
import { getLogger } from "../../logging/logger.js";
import { getRuntimeSetup } from "./setup.js";
import { AnthropicAdapter } from "../../providers/anthropic/adapter.js";
import { OpenAIAdapter } from "../../providers/openai/adapter.js";
import type { ProviderAdapter } from "../../providers/types.js";

const log = getLogger("gateway:api:chat");

/** Per-session conversation history (in-memory). */
const sessions = new Map<string, Message[]>();

/** Cached provider adapter instance. */
let cachedAdapter: ProviderAdapter | null = null;
let cachedAdapterKey = "";

/** Get or create a provider adapter based on the current runtime setup. */
function getAdapter(): ProviderAdapter | null {
  const setup = getRuntimeSetup();
  if (!setup) return null;

  const key = `${setup.provider}:${setup.apiKey}`;
  if (cachedAdapter && cachedAdapterKey === key) {
    return cachedAdapter;
  }

  switch (setup.provider) {
    case "anthropic":
      cachedAdapter = new AnthropicAdapter({ apiKey: setup.apiKey });
      break;
    case "openai":
      cachedAdapter = new OpenAIAdapter({ apiKey: setup.apiKey });
      break;
    default:
      log.warn({ provider: setup.provider }, "Unsupported provider for web chat");
      return null;
  }

  cachedAdapterKey = key;
  return cachedAdapter;
}

/** Create the chat Hono router. */
export function createChatRouter(): Hono {
  const router = new Hono();

  log.debug("Initializing chat router");

  // --- POST /chat/send ---
  router.post("/chat/send", async (c) => {
    try {
      const body = await c.req.json();
      const message = body.message as string | undefined;
      const sessionId = (body.sessionId as string) ?? "default";

      if (!message || typeof message !== "string" || message.trim().length === 0) {
        const response: ApiResponse = {
          success: false,
          error: { code: "EMPTY_MESSAGE", message: "Message text is required" },
        };
        return c.json(response, 400);
      }

      const setup = getRuntimeSetup();
      if (!setup) {
        const response: ApiResponse = {
          success: false,
          error: { code: "NOT_CONFIGURED", message: "Please complete setup first" },
        };
        return c.json(response, 400);
      }

      const adapter = getAdapter();
      if (!adapter) {
        const response: ApiResponse = {
          success: false,
          error: { code: "NO_ADAPTER", message: `Provider "${setup.provider}" is not supported for web chat` },
        };
        return c.json(response, 400);
      }

      // Get or create session history
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, []);
      }
      const history = sessions.get(sessionId)!;

      // Add user message to history
      const userMsg: Message = { role: "user", content: message.trim() };
      history.push(userMsg);

      // Keep history manageable (last 50 messages)
      if (history.length > 50) {
        history.splice(0, history.length - 50);
      }

      log.info(
        { sessionId, provider: setup.provider, model: setup.model, historyLen: history.length },
        "Chat request",
      );

      // Call the LLM
      const providerResponse = await adapter.sendMessage({
        model: setup.model,
        messages: history,
        systemPrompt: setup.systemPrompt,
        maxTokens: 4096,
        temperature: 0.7,
        cacheControl: setup.provider === "anthropic",
      });

      // Add assistant response to history
      const assistantMsg: Message = { role: "assistant", content: providerResponse.content };
      history.push(assistantMsg);

      log.info(
        {
          sessionId,
          inputTokens: providerResponse.usage.inputTokens,
          outputTokens: providerResponse.usage.outputTokens,
          cached: providerResponse.cached,
        },
        "Chat response generated",
      );

      const response: ApiResponse = {
        success: true,
        data: {
          text: providerResponse.content,
          model: providerResponse.model,
          usage: providerResponse.usage,
          cached: providerResponse.cached,
          sessionId,
        },
      };
      return c.json(response);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      log.error({ err: error }, "Chat request failed");

      const response: ApiResponse = {
        success: false,
        error: {
          code: "CHAT_ERROR",
          message: error.message || "Failed to generate response",
        },
      };
      return c.json(response, 500);
    }
  });

  // --- GET /chat/history ---
  router.get("/chat/history", (c) => {
    const sessionId = c.req.query("sessionId") ?? "default";
    const history = sessions.get(sessionId) ?? [];

    const response: ApiResponse = {
      success: true,
      data: {
        sessionId,
        messages: history.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        })),
      },
    };
    return c.json(response);
  });

  // --- POST /chat/reset ---
  router.post("/chat/reset", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const sessionId = (body as Record<string, unknown>).sessionId as string ?? "default";
    sessions.delete(sessionId);

    const response: ApiResponse = {
      success: true,
      data: { message: "Session reset", sessionId },
    };
    return c.json(response);
  });

  log.debug("Chat router initialized");
  return router;
}
