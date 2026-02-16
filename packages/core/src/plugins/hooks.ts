/**
 * Plugin hook execution pipeline.
 * Delegates to the plugin-sdk hook system with registry integration.
 */

import type { PluginHookName, PluginHookEvent } from "@ccfm/shared";
import { runVoidHook, runModifyingHook } from "../plugin-sdk/hooks.js";
import { getLogger } from "../logging/logger.js";

const log = getLogger("plugins:hooks");

/** Hook types that modify their event (sequential execution). */
const MODIFYING_HOOKS: Set<PluginHookName> = new Set([
  "llmInput",
  "llmOutput",
  "messageSending",
  "beforeCompaction",
]);

/** Execute a hook by name, choosing void or modifying based on type. */
export async function executeHook(
  hookName: PluginHookName,
  event: PluginHookEvent,
): Promise<PluginHookEvent> {
  log.debug({ hookName }, "Executing hook");

  if (MODIFYING_HOOKS.has(hookName)) {
    return runModifyingHook(hookName, event);
  }

  await runVoidHook(hookName, event);
  return event;
}

/** Create a PluginHookEvent from raw data. */
export function createHookEvent(
  hookName: PluginHookName,
  data: Record<string, unknown>,
): PluginHookEvent {
  return {
    hookName,
    timestamp: Date.now(),
    data,
  };
}
