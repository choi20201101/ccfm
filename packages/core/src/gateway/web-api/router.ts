/**
 * REST API router for the web management UI.
 * Mounts at /api/v1/ and provides system status, configuration,
 * channel, provider, token, and session endpoints.
 */

import { Hono } from "hono";
import type { ApiResponse } from "@ccfm/shared";
import { getConfig } from "../../config/index.js";
import { getLogger } from "../../logging/logger.js";
import { createChatRouter } from "./chat.js";

const log = getLogger("gateway:api:router");

/** Create the /api/v1/ Hono router. */
export function createApiRouter(): Hono {
  const router = new Hono();

  log.debug("Initializing API v1 router");

  // --- GET /status ---
  router.get("/status", (c) => {
    const config = getConfig();
    const response: ApiResponse = {
      success: true,
      data: {
        version: config.bot?.version ?? "unknown",
        uptime: process.uptime(),
        timestamp: Date.now(),
      },
    };
    return c.json(response);
  });

  // --- GET /config ---
  router.get("/config", (c) => {
    const config = getConfig();
    const response: ApiResponse = {
      success: true,
      data: config,
    };
    return c.json(response);
  });

  // --- PUT /config ---
  router.put("/config", async (c) => {
    try {
      const body = await c.req.json();
      log.info("Config update requested via API");
      const response: ApiResponse = {
        success: true,
        data: { message: "Configuration update received", patch: body },
      };
      return c.json(response);
    } catch (err) {
      log.error({ err }, "Failed to parse config update body");
      const response: ApiResponse = {
        success: false,
        error: { code: "INVALID_BODY", message: "Invalid JSON body" },
      };
      return c.json(response, 400);
    }
  });

  // --- GET /channels ---
  router.get("/channels", (c) => {
    const config = getConfig();
    const channels = config.channels ?? {};
    const response: ApiResponse = {
      success: true,
      data: channels,
    };
    return c.json(response);
  });

  // --- GET /providers ---
  router.get("/providers", (c) => {
    const config = getConfig();
    const providers = config.models?.providers ?? {};
    const response: ApiResponse = {
      success: true,
      data: providers,
    };
    return c.json(response);
  });

  // --- GET /tokens/usage ---
  router.get("/tokens/usage", (c) => {
    const response: ApiResponse = {
      success: true,
      data: { message: "Use /api/v1/tokens/usage from tokens sub-router" },
    };
    return c.json(response);
  });

  // --- GET /tokens/budget ---
  router.get("/tokens/budget", (c) => {
    const response: ApiResponse = {
      success: true,
      data: { message: "Use /api/v1/tokens/budget from tokens sub-router" },
    };
    return c.json(response);
  });

  // --- GET /sessions ---
  router.get("/sessions", (c) => {
    const response: ApiResponse = {
      success: true,
      data: [],
    };
    return c.json(response);
  });

  // --- Mount chat sub-router ---
  const chatRouter = createChatRouter();
  router.route("/chat", chatRouter);

  log.debug("API v1 router initialized");
  return router;
}
