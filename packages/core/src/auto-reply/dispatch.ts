/**
 * Main auto-reply dispatch pipeline.
 * Inbound message → command detection → authorization → agent → save.
 */

import type { MsgContext, GetReplyOptions, ReplyPayload } from "@ccfm/shared";
import type { DispatchResult, CommandHandler } from "./types.js";
import { detectCommand, isCommand } from "./command-detection.js";
import { getReply } from "./reply/get-reply.js";
import { getLogger } from "../logging/logger.js";

const log = getLogger("auto-reply:dispatch");

/** Built-in command handlers. */
const builtinCommands: Map<string, CommandHandler> = new Map();

/** Register a built-in command handler. */
export function registerCommand(name: string, handler: CommandHandler): void {
  builtinCommands.set(name.toLowerCase(), handler);
  log.debug({ command: name }, "Command registered");
}

/** Dispatch an inbound message through the auto-reply pipeline. */
export async function dispatch(
  ctx: MsgContext,
  options: GetReplyOptions = {},
): Promise<DispatchResult> {
  log.info(
    { channelId: ctx.channelId, sessionKey: ctx.sessionKey, sender: ctx.senderId },
    "Dispatching inbound message",
  );

  try {
    // 1. Check for /command
    if (isCommand(ctx.text)) {
      const cmd = detectCommand(ctx.text);
      if (cmd) {
        const handler = builtinCommands.get(cmd.command);
        if (handler) {
          log.info({ command: cmd.command }, "Executing command");
          const reply = await handler(ctx, cmd.args);
          return { handled: true, reply: reply ?? undefined };
        }
        log.warn({ command: cmd.command }, "Unknown command");
        return {
          handled: true,
          reply: { text: `Unknown command: /${cmd.command}. Type /help for available commands.` },
        };
      }
    }

    // 2. Generate reply via agent
    const reply = await getReply(ctx, options);
    return { handled: true, reply };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    log.error({ err: error, sessionKey: ctx.sessionKey }, "Dispatch failed");
    return { handled: false, error };
  }
}

// --- Register default built-in commands ---

registerCommand("help", async () => ({
  text: [
    "**Available Commands:**",
    "/help — Show this help message",
    "/status — Show bot status",
    "/reset — Reset conversation",
    "/model [name] — Switch model",
    "/config — Show current config",
    "/think [level] — Set thinking level",
  ].join("\n"),
}));

registerCommand("status", async () => ({
  text: `CCFM-Bot is running. Uptime: ${Math.floor(process.uptime())}s`,
}));

registerCommand("reset", async (ctx) => ({
  text: `Session "${ctx.sessionKey}" has been reset.`,
}));
