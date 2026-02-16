/**
 * HTTP server with WebSocket upgrade support.
 * Uses the Hono framework to serve the web UI and handle API routes.
 */

import { Hono } from "hono";
import { existsSync, readFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import type { GatewayConfig } from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";

const log = getLogger("gateway:http");

/** MIME types for static file serving. */
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

/**
 * Resolve the web UI dist directory.
 * Tries: (1) packages/web/dist relative to CWD, (2) relative to this file.
 */
function resolveWebDistDir(): string | null {
  // From project root (pnpm --filter @ccfm/core dev runs from packages/core)
  const candidates = [
    resolve(process.cwd(), "packages/web/dist"),
    resolve(process.cwd(), "../web/dist"),
    resolve(process.cwd(), "../../packages/web/dist"),
  ];
  for (const dir of candidates) {
    if (existsSync(resolve(dir, "index.html"))) {
      return dir;
    }
  }
  return null;
}

/**
 * Create and configure the Hono application for the gateway server.
 * Serves health endpoint, web UI static files, and handles WebSocket upgrades.
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

    log.debug("WebSocket upgrade request received");
    return c.text("WebSocket upgrade handled by server", 200);
  });

  // --- Static Web UI serving ---
  const webDistDir = resolveWebDistDir();
  if (webDistDir) {
    log.info({ webDistDir }, "Serving web UI from dist directory");

    // Redirect /ui to /ui/
    app.get("/ui", (c) => c.redirect("/ui/"));

    // Serve static files under /ui/*
    app.get("/ui/*", (c) => {
      let filePath = c.req.path.replace(/^\/ui\/?/, "") || "index.html";

      // Security: prevent directory traversal
      filePath = filePath.replace(/\.\./g, "");

      const fullPath = resolve(webDistDir, filePath);
      if (existsSync(fullPath)) {
        const ext = extname(fullPath);
        const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
        const content = readFileSync(fullPath);
        return c.body(content, 200, { "Content-Type": contentType });
      }

      // SPA fallback: serve index.html for any unknown path
      const indexPath = resolve(webDistDir, "index.html");
      if (existsSync(indexPath)) {
        const content = readFileSync(indexPath);
        return c.body(content, 200, { "Content-Type": "text/html; charset=utf-8" });
      }

      return c.text("Not Found", 404);
    });
  } else {
    log.warn("Web UI dist not found. Run: pnpm --filter @ccfm/web build");
    app.get("/ui", (c) => {
      return c.html(`
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>CCFM-Bot Web UI Not Built</h2>
          <p>Run this command to build the web UI:</p>
          <code style="background:#f0f0f0;padding:8px 16px;border-radius:4px">
            pnpm --filter @ccfm/web build
          </code>
          <p style="margin-top:20px">Then restart the server.</p>
        </body></html>
      `);
    });
    app.get("/ui/*", (c) => c.redirect("/ui"));
  }

  log.debug("Gateway server routes configured");
  return app;
}
