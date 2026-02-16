/**
 * Plugin service lifecycle management.
 * Services are long-running background tasks registered by plugins.
 */

import type { PluginServiceDefinition } from "@ccfm/shared";
import { getPluginRegistry } from "./registry.js";
import { getLogger } from "../logging/logger.js";

const log = getLogger("plugins:services");

const runningServices = new Map<string, { stop: () => Promise<void> }>();

/** Start all registered plugin services. */
export async function startAllServices(): Promise<void> {
  const registry = getPluginRegistry();
  const services = registry.getAllServices();

  for (const service of services) {
    try {
      log.info({ service: service.name, pluginId: service.pluginId }, "Starting service");

      await service.start();
      runningServices.set(service.name, { stop: service.stop });
    } catch (err) {
      log.error({ service: service.name, err }, "Failed to start service");
    }
  }
}

/** Stop all running services. */
export async function stopAllServices(): Promise<void> {
  for (const [name, handle] of runningServices) {
    try {
      log.info({ service: name }, "Stopping service");
      await handle.stop();
    } catch (err) {
      log.error({ service: name, err }, "Error stopping service");
    }
  }
  runningServices.clear();
}

/** Check if a service is running. */
export function isServiceRunning(name: string): boolean {
  return runningServices.has(name);
}
