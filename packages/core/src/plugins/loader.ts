/**
 * Plugin discovery and loading.
 * Finds plugins in search paths, validates manifests, initializes.
 */

import { join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { PLUGIN_MANIFEST_FILE } from "@ccfm/shared";
import type { PluginManifest, PluginHookName } from "@ccfm/shared";
import type { CcfmPluginApi, CcfmPlugin } from "../plugin-sdk/types.js";
import { registerHookHandler } from "../plugin-sdk/hooks.js";
import { getPluginRegistry } from "./registry.js";
import { readJsonFile } from "../config/io.js";
import { getLogger } from "../logging/logger.js";

const log = getLogger("plugins:loader");

/** Discover plugin directories from search paths. */
export function discoverPlugins(searchPaths: string[]): string[] {
  const pluginDirs: string[] = [];

  for (const searchPath of searchPaths) {
    if (!existsSync(searchPath)) continue;

    const entries = readdirSync(searchPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifestPath = join(searchPath, entry.name, PLUGIN_MANIFEST_FILE);
      if (existsSync(manifestPath)) {
        pluginDirs.push(join(searchPath, entry.name));
      }
    }
  }

  log.info({ count: pluginDirs.length, searchPaths }, "Discovered plugins");
  return pluginDirs;
}

/** Load a single plugin from its directory. */
export async function loadPlugin(
  pluginDir: string,
  pluginConfig?: Record<string, unknown>,
): Promise<void> {
  const manifestPath = join(pluginDir, PLUGIN_MANIFEST_FILE);
  const manifest = readJsonFile<PluginManifest>(manifestPath);

  if (!manifest) {
    log.warn({ pluginDir }, "Plugin manifest not found or invalid");
    return;
  }

  const pluginId = manifest.id;
  const entryPath = join(pluginDir, manifest.main ?? "src/index.js");

  if (!existsSync(entryPath)) {
    log.warn({ pluginId, entryPath }, "Plugin entry point not found");
    return;
  }

  try {
    const pluginModule = await import(entryPath) as { default?: CcfmPlugin } & CcfmPlugin;
    const plugin = pluginModule.default ?? pluginModule;

    if (!plugin.init || typeof plugin.init !== "function") {
      log.warn({ pluginId }, "Plugin missing init function");
      return;
    }

    const registry = getPluginRegistry();
    const api = createPluginApi(pluginId, pluginConfig ?? {});

    registry.registerPlugin(pluginId, plugin);
    await plugin.init(api);

    log.info({ pluginId, name: plugin.name }, "Plugin loaded and initialized");
  } catch (err) {
    log.error({ pluginId, err }, "Failed to load plugin");
  }
}

/** Create the CcfmPluginApi for a specific plugin. */
function createPluginApi(
  pluginId: string,
  config: Record<string, unknown>,
): CcfmPluginApi {
  const registry = getPluginRegistry();

  return {
    registerTool(tool) {
      registry.registerTool(pluginId, tool);
    },
    registerHook(hookName, handler, priority = 100) {
      const reg = { hookName, pluginId, handler, priority };
      registry.registerHook(pluginId, hookName, reg);
      registerHookHandler(hookName, pluginId, handler, priority);
    },
    registerHttpHandler(handler) {
      registry.registerHttpHandler(pluginId, handler);
    },
    registerHttpRoute(handler) {
      registry.registerHttpRoute(pluginId, handler);
    },
    registerChannel(channel) {
      registry.registerChannel(pluginId, channel);
    },
    registerGatewayMethod(method) {
      registry.registerGatewayMethod(pluginId, method);
    },
    registerCli(cli) {
      registry.registerCli(pluginId, cli);
    },
    registerService(service) {
      registry.registerService(pluginId, service);
    },
    registerProvider(provider) {
      registry.registerProvider(pluginId, provider);
    },
    registerCommand(command) {
      registry.registerCommand(pluginId, command);
    },
    on(hookName: PluginHookName, handler) {
      registerHookHandler(hookName, pluginId, handler);
    },
    getConfig() {
      return { ...config };
    },
  };
}

/** Load all plugins from configured search paths. */
export async function loadAllPlugins(
  searchPaths: string[],
  pluginConfigs?: Record<string, { enabled?: boolean; config?: Record<string, unknown> }>,
): Promise<void> {
  const pluginDirs = discoverPlugins(searchPaths);

  for (const dir of pluginDirs) {
    const manifestPath = join(dir, PLUGIN_MANIFEST_FILE);
    const manifest = readJsonFile<PluginManifest>(manifestPath);
    if (!manifest) continue;

    const pluginEntry = pluginConfigs?.[manifest.id];
    if (pluginEntry?.enabled === false) {
      log.info({ pluginId: manifest.id }, "Plugin disabled by config");
      continue;
    }

    await loadPlugin(dir, pluginEntry?.config);
  }
}
