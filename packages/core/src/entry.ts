/**
 * CCFM-Bot entry point.
 * Starts the gateway server and initializes all subsystems.
 */

import { loadConfig, getConfig, resolveConfigDir } from "./config/index.js";
import { initLogger, getLogger } from "./logging/index.js";
import { loadDotenv } from "./infra/index.js";
import { loadAllPlugins } from "./plugins/index.js";
import { startAllServices } from "./plugins/index.js";
import { discoverImplicitProviders } from "./providers/index.js";
import { createGatewayServer } from "./gateway/index.js";
import { createApiRouter } from "./gateway/index.js";
import { createTokensRouter } from "./gateway/index.js";
import { createSetupRouter } from "./gateway/index.js";
import { serve } from "@hono/node-server";
import { resolve } from "node:path";

async function main(): Promise<void> {
  // 1. Load environment variables
  loadDotenv();

  // 2. Load configuration
  const configResult = loadConfig();
  const config = getConfig();

  // 3. Initialize logger
  initLogger({
    level: config.logging?.level ?? "info",
    subsystems: config.logging?.subsystems,
    redactSecrets: config.logging?.redactSecrets,
  });
  const log = getLogger("main");

  log.info({ configPath: configResult.configPath, isNew: configResult.isNewInstall }, "CCFM-Bot starting");

  // 4. Discover implicit providers from environment variables
  discoverImplicitProviders();

  // 4b. Inject env vars into plugin configs
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  if (telegramToken) {
    // Ensure plugins.entries exists
    if (!config.plugins) (config as any).plugins = {};
    if (!config.plugins!.entries) config.plugins!.entries = {};
    if (!config.plugins!.entries["channel-telegram"]) {
      config.plugins!.entries["channel-telegram"] = { enabled: true, config: {} };
    }
    config.plugins!.entries["channel-telegram"].config = {
      ...config.plugins!.entries["channel-telegram"].config,
      token: telegramToken,
    };
    log.info("Telegram bot token found in environment");
  }

  // 5. Load plugins
  const pluginSearchPaths = config.plugins?.searchPaths ?? [
    resolve(resolveConfigDir(), "extensions"),
    resolve(process.cwd(), "extensions"),
  ];
  await loadAllPlugins(pluginSearchPaths, config.plugins?.entries);

  // 6. Start plugin services
  await startAllServices();

  // 7. Create gateway server
  const gatewayConfig = config.gateway ?? { port: 18790 };
  const app = createGatewayServer(gatewayConfig);

  // Mount API routers
  const apiRouter = createApiRouter();
  const tokensRouter = createTokensRouter();
  const setupRouter = createSetupRouter();

  app.route("/api/v1", apiRouter);
  app.route("/api/v1/tokens", tokensRouter);
  app.route("/api/v1/setup", setupRouter);

  // 8. Start HTTP server
  const port = gatewayConfig.port ?? 18790;
  const host = gatewayConfig.host ?? "127.0.0.1";

  serve({
    fetch: app.fetch,
    port,
    hostname: host,
  });

  log.info({ port, host }, "CCFM-Bot gateway started");
  console.log(`\n  CCFM-Bot running at http://${host}:${port}`);
  console.log(`  Web UI at http://${host}:${port}/ui\n`);
}

main().catch((err) => {
  console.error("Fatal error starting CCFM-Bot:", err);
  process.exit(1);
});
