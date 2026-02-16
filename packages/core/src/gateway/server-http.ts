/**
 * HTTP server with WebSocket upgrade support.
 * Uses the Hono framework to serve the web UI and handle API routes.
 */

import { Hono } from "hono";
import type { GatewayConfig } from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";

const log = getLogger("gateway:http");

/**
 * Create and configure the Hono application for the gateway server.
 * Serves health endpoint and handles WebSocket upgrades.
 */
export function createGatewayServer(config: GatewayConfig): Hono {
  const app = new Hono();

  log.info(
    { port: config.port, host: config.host },
    "Creating gateway server",
  );

  // --- Health check ---
  app.get("/health", (c) => {
    return c.json({ status: "ok", timestamp: Date.now() });
  });

  // --- WebSocket upgrade handling ---
  app.get("/ws", (c) => {
    const upgradeHeader = c.req.header("Upgrade");
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
      log.warn("WebSocket upgrade request missing Upgrade header");
      return c.text("Expected WebSocket upgrade", 426);
    }

    // The actual WebSocket upgrade is handled by the underlying Node.js server.
    // This route validates the request presence; the upgrade happens at the
    // HTTP server level before Hono routing.
    log.debug("WebSocket upgrade request received");
    return c.text("WebSocket upgrade handled by server", 200);
  });

  // --- Fallback: serve index.html for SPA routing ---
  app.get("/ui", (c) => {
    return c.redirect("/ui/index.html");
  });

  log.debug("Gateway server routes configured");
  return app;
}
