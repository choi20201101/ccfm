/**
 * Typed hook registration and execution for the 17 plugin hooks.
 */

import type { PluginHookName, PluginHookHandler, PluginHookEvent } from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";

const log = getLogger("plugin-sdk:hooks");

/** All 17 supported hook names. */
export const ALL_HOOK_NAMES: PluginHookName[] = [
  "beforeAgentStart",
  "llmInput",
  "llmOutput",
  "beforeToolCall",
  "afterToolCall",
  "beforeCompaction",
  "afterCompaction",
  "messageReceived",
  "messageSending",
  "messageSent",
  "messagePersist",
  "sessionStart",
  "sessionEnd",
  "sessionReset",
  "gatewayConnect",
  "gatewayDisconnect",
  "agentError",
];

export interface HookRegistration {
  hookName: PluginHookName;
  pluginId: string;
  handler: PluginHookHandler;
  priority: number;
}

/** Hook store — maps hook names to sorted registrations. */
const hookStore = new Map<PluginHookName, HookRegistration[]>();

/** Register a hook handler with a priority (lower = runs first). */
export function registerHookHandler(
  hookName: PluginHookName,
  pluginId: string,
  handler: PluginHookHandler,
  priority = 100,
): void {
  if (!hookStore.has(hookName)) {
    hookStore.set(hookName, []);
  }

  const registrations = hookStore.get(hookName)!;
  registrations.push({ hookName, pluginId, handler, priority });
  registrations.sort((a, b) => a.priority - b.priority);

  log.debug({ hookName, pluginId, priority }, "Hook registered");
}

/**
 * Run a void hook (parallel execution, error-isolated).
 * Used for notification hooks like messageSent, sessionStart.
 */
export async function runVoidHook(
  hookName: PluginHookName,
  event: PluginHookEvent,
): Promise<void> {
  const registrations = hookStore.get(hookName);
  if (!registrations?.length) return;

  await Promise.allSettled(
    registrations.map(async (reg) => {
      try {
        await reg.handler(event);
      } catch (err) {
        log.error(
          { hookName, pluginId: reg.pluginId, err },
          "Hook handler error (isolated)",
        );
      }
    }),
  );
}

/**
 * Run a modifying hook (sequential, each can transform the event).
 * Used for hooks like llmInput, llmOutput, messageSending.
 */
export async function runModifyingHook(
  hookName: PluginHookName,
  event: PluginHookEvent,
): Promise<PluginHookEvent> {
  const registrations = hookStore.get(hookName);
  if (!registrations?.length) return event;

  let current = event;
  for (const reg of registrations) {
    try {
      const result = await reg.handler(current);
      if (result !== undefined && result !== null && typeof result === "object") {
        current = { ...current, data: { ...current.data, ...result } };
      }
    } catch (err) {
      log.error(
        { hookName, pluginId: reg.pluginId, err },
        "Modifying hook handler error (isolated)",
      );
      // On error, keep the current value and continue
    }
  }

  return current;
}

/** Get all registrations for a specific hook. */
export function getHookRegistrations(hookName: PluginHookName): HookRegistration[] {
  return hookStore.get(hookName) ?? [];
}

/** Clear all hooks (for testing). */
export function clearAllHooks(): void {
  hookStore.clear();
}
